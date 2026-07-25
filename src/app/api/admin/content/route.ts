import { NextResponse } from "next/server";
import { getFirebaseAdminDb, verifyAdminSession } from "@/lib/firebase/admin";
import { createClient } from "@/lib/firebase/server";
import { withDefaults, withUpdateTimestamp } from "@/lib/firebase/client";
import {
    isContentCollection,
    validateContentDocument,
    type ContentCollection,
} from "@/lib/firebase/content-validation";
import { sanitizeRichText } from "@/lib/sanitize-rich-text";

export const runtime = "nodejs";

const ALLOWED_ACTIONS = new Set(["insert", "upsert", "update", "delete"]);

type Filter = { field: string; operator: "==" | "!="; value: unknown };
type MutationBody = {
    collection?: string;
    action?: "insert" | "upsert" | "update" | "delete";
    payload?: Record<string, unknown> | Record<string, unknown>[] | null;
    filters?: Filter[];
    upsertOptions?: { onConflict?: string };
};

export async function POST(request: Request) {
    if (!(await verifyAdminSession())) {
        return NextResponse.json({ error: "Your admin session expired. Please sign in again." }, { status: 401 });
    }
    const rawBody = await request.text();
    if (rawBody.length > 900_000) {
        return NextResponse.json({ error: "The content update is too large." }, { status: 413 });
    }
    let body: MutationBody | null;
    try {
        body = JSON.parse(rawBody || "null") as MutationBody | null;
    } catch {
        return NextResponse.json({ error: "The request body is not valid JSON." }, { status: 400 });
    }
    const collection = body?.collection || "";
    const action = body?.action || "";
    if (!isContentCollection(collection) || !ALLOWED_ACTIONS.has(action)) {
        return NextResponse.json({ error: "Invalid admin content operation." }, { status: 400 });
    }
    const filters = body?.filters || [];
    const exactIdFilter = filters.length === 1 &&
        filters[0]?.field === "id" &&
        filters[0]?.operator === "==" &&
        typeof filters[0]?.value === "string" &&
        filters[0].value.length >= 1 && filters[0].value.length <= 128;

    if (["update", "delete"].includes(action) && !exactIdFilter) {
        return NextResponse.json(
            { error: "Updates and deletes must target exactly one document ID." },
            { status: 400 }
        );
    }
    if (["insert", "upsert"].includes(action) && filters.length !== 0) {
        return NextResponse.json({ error: "Insert and upsert operations cannot include filters." }, { status: 400 });
    }
    if (action === "upsert" && (
        collection !== "site_settings" || body?.upsertOptions?.onConflict !== "key"
    )) {
        return NextResponse.json({ error: "Only key-based setting upserts are allowed." }, { status: 400 });
    }
    if (action === "delete" && body?.payload != null) {
        return NextResponse.json({ error: "Delete operations cannot include a payload." }, { status: 400 });
    }

    const inputRows = Array.isArray(body?.payload)
        ? body.payload
        : body?.payload && typeof body.payload === "object"
            ? [body.payload]
            : [];
    if (action !== "delete" && (inputRows.length === 0 || inputRows.length > 50)) {
        return NextResponse.json({ error: "Provide between 1 and 50 content records." }, { status: 400 });
    }
    if (action === "update" && inputRows.length !== 1) {
        return NextResponse.json({ error: "An update must contain one object payload." }, { status: 400 });
    }
    if (action !== "delete" && inputRows.some((row) =>
        !row || typeof row !== "object" || Array.isArray(row) || "id" in row ||
        "created_at" in row || "updated_at" in row
    )) {
        return NextResponse.json(
            { error: "IDs and server-managed timestamps cannot be supplied by the client." },
            { status: 400 }
        );
    }

    const documentId = exactIdFilter ? String(filters[0].value) : undefined;
    const preparedRows = await prepareAndValidateRows(collection, action, inputRows, documentId);
    if ("error" in preparedRows) {
        return NextResponse.json({ error: preparedRows.error }, { status: preparedRows.status });
    }

    const server = await createClient();
    let query = server.from(collection);
    const preparedPayload = Array.isArray(body?.payload) ? preparedRows.rows : preparedRows.rows[0];
    if (action === "insert") query = query.insert(preparedPayload || {});
    if (action === "upsert") query = query.upsert(preparedPayload || {}, body?.upsertOptions);
    if (action === "update") query = query.update(preparedRows.rows[0] || {});
    if (action === "delete") query = query.delete();
    for (const filter of filters) {
        query = filter.operator === "=="
            ? query.eq(filter.field, filter.value)
            : query.neq(filter.field, filter.value);
    }
    const result = await query.select("*");
    if (result.error) {
        return NextResponse.json({ error: result.error.message }, { status: 400 });
    }
    return NextResponse.json({ data: result.data });
}

async function prepareAndValidateRows(
    collection: ContentCollection,
    action: string,
    rows: Record<string, unknown>[],
    documentId?: string,
): Promise<{ rows: Record<string, unknown>[] } | { error: string; status: number }> {
    const db = getFirebaseAdminDb();
    let existing: Record<string, unknown> | null = null;
    if (["update", "delete"].includes(action) && documentId) {
        const snapshot = await db.collection(collection).doc(documentId).get();
        if (!snapshot.exists) return { error: "Content document not found.", status: 404 };
        existing = snapshot.data() || {};
    }
    if (action === "delete") return { rows: [] };

    const prepared: Record<string, unknown>[] = [];
    for (const input of rows) {
        let candidate: Record<string, unknown>;
        if (action === "update" && existing) {
            candidate = withUpdateTimestamp(collection, { ...existing, ...input });
        } else if (action === "upsert") {
            const key = typeof input.key === "string" ? input.key : "";
            const snapshot = key ? await db.collection(collection).doc(key).get() : null;
            candidate = snapshot?.exists
                ? withUpdateTimestamp(collection, { ...snapshot.data(), ...input })
                : withDefaults(collection, input);
        } else {
            candidate = withDefaults(collection, input);
        }
        delete candidate.id;
        if (collection === "blog_posts" && typeof candidate.content === "string") {
            candidate.content = sanitizeRichText(candidate.content);
        }

        const candidateId = collection === "site_settings" && typeof candidate.key === "string"
            ? candidate.key
            : documentId;
        const validationError = validateContentDocument(collection, candidate, candidateId);
        if (validationError) return { error: validationError, status: 400 };

        if (["departments", "classes", "blog_posts"].includes(collection)) {
            const duplicate = await db.collection(collection)
                .where("slug", "==", candidate.slug)
                .limit(2)
                .get();
            if (duplicate.docs.some((item) => item.id !== documentId)) {
                return { error: "That URL slug is already in use.", status: 409 };
            }
        }
        if (collection === "teams") {
            const parent = await db.collection("departments").doc(String(candidate.department_id)).get();
            if (!parent.exists) return { error: "The selected department does not exist.", status: 400 };
        }
        if (collection === "members") {
            const parent = await db.collection("teams").doc(String(candidate.team_id)).get();
            if (!parent.exists) return { error: "The selected team does not exist.", status: 400 };
        }
        prepared.push(candidate);
    }
    return { rows: prepared };
}
