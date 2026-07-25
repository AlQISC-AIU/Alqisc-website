import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getCount,
    getDoc,
    getDocs,
    limit as firestoreLimit,
    orderBy,
    query,
    setDoc,
    updateDoc,
    where,
    writeBatch,
    type DocumentData,
    type QueryConstraint,
} from "firebase/firestore/lite";
import {
    GoogleAuthProvider,
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    type User,
} from "firebase/auth";
import { getFirebaseAuth, getFirestoreDb } from "./app";

type Row = Record<string, unknown>;
type Filter = { field: string; operator: "==" | "!="; value: unknown };
type Sort = { field: string; ascending: boolean };
type SelectOptions = { count?: "exact"; head?: boolean };
type UpsertOptions = { onConflict?: string };

export type FirebaseResult = {
    // Compatibility boundary for the existing fluent query consumers. Entity
    // modules cast this value to their concrete interfaces after checking errors.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
    error: Error | null;
    count?: number;
};

const now = () => new Date().toISOString();

export function withDefaults(collectionName: string, input: Row): Row {
    const timestamp = now();

    switch (collectionName) {
        case "departments":
            return {
                description: "",
                image_url: "",
                objectives: [],
                responsibilities: [],
                is_active: true,
                display_order: 0,
                created_at: timestamp,
                updated_at: timestamp,
                ...input,
            };
        case "teams":
            return { display_order: 0, ...input };
        case "members":
            return { role: "", image_url: "", socials: {}, display_order: 0, ...input };
        case "events":
            return {
                description: "",
                time: "",
                location: "",
                category: "special",
                status: "upcoming",
                image_url: "",
                is_featured: false,
                registration_url: "",
                created_at: timestamp,
                ...input,
            };
        case "classes":
            return {
                description: "",
                schedule: "",
                time: "",
                venue: "",
                fee: "Free",
                students_enrolled: 0,
                image_url: "",
                objectives: [],
                registration_url: "",
                is_active: true,
                created_at: timestamp,
                ...input,
            };
        case "blog_posts":
            return {
                excerpt: "",
                content: "",
                category: "General",
                author: "Admin",
                status: "draft",
                featured_image_url: "",
                published_at: null,
                created_at: timestamp,
                updated_at: timestamp,
                ...input,
            };
        case "site_settings":
            return { value: "", updated_at: timestamp, ...input };
        default:
            return input;
    }
}

export function withUpdateTimestamp(collectionName: string, input: Row): Row {
    if (["departments", "blog_posts", "site_settings"].includes(collectionName)) {
        return { ...input, updated_at: now() };
    }
    return input;
}

function normalizeWrite(collectionName: string, input: Row): Row {
    const normalized = Object.fromEntries(
        Object.entries(input).filter(([, value]) => value !== undefined)
    );
    const urlFields: Record<string, string[]> = {
        departments: ["image_url"],
        members: ["image_url"],
        events: ["image_url", "registration_url"],
        classes: ["image_url", "registration_url"],
        blog_posts: ["featured_image_url"],
    };

    for (const field of urlFields[collectionName] || []) {
        if (normalized[field] === null || normalized[field] === undefined) {
            normalized[field] = "";
        }
    }
    if (collectionName === "site_settings" && normalized.value == null) {
        normalized.value = "";
    }
    return normalized;
}

function toRow(documentSnapshot: { id: string; data(): DocumentData }): Row {
    return { id: documentSnapshot.id, ...documentSnapshot.data() };
}

async function waitForCurrentUser(): Promise<User | null> {
    const auth = getFirebaseAuth();
    if (auth.currentUser) return auth.currentUser;

    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user);
        });
    });
}

async function createServerSession(user: User): Promise<void> {
    const idToken = await user.getIdToken();
    const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Unable to create the admin session.");
    }
}

class FirestoreQuery implements PromiseLike<FirebaseResult> {
    private action: "select" | "insert" | "upsert" | "update" | "delete" = "select";
    private payload: Row | Row[] | null = null;
    private filters: Filter[] = [];
    private sorts: Sort[] = [];
    private maximum: number | null = null;
    private selectedColumns = "*";
    private selectOptions: SelectOptions = {};
    private upsertOptions: UpsertOptions = {};
    private returnSingle = false;
    private returnWrittenRows = false;

    constructor(private readonly collectionName: string) {}

    select(columns = "*", options: SelectOptions = {}): this {
        this.selectedColumns = columns;
        this.selectOptions = options;
        if (this.action !== "select") this.returnWrittenRows = true;
        return this;
    }

    insert(payload: Row | Row[]): this {
        this.action = "insert";
        this.payload = payload;
        return this;
    }

    upsert(payload: Row | Row[], options: UpsertOptions = {}): this {
        this.action = "upsert";
        this.payload = payload;
        this.upsertOptions = options;
        return this;
    }

    update(payload: Row): this {
        this.action = "update";
        this.payload = payload;
        return this;
    }

    delete(): this {
        this.action = "delete";
        return this;
    }

    eq(field: string, value: unknown): this {
        this.filters.push({ field, operator: "==", value });
        return this;
    }

    neq(field: string, value: unknown): this {
        this.filters.push({ field, operator: "!=", value });
        return this;
    }

    order(field: string, options: { ascending?: boolean } = {}): this {
        this.sorts.push({ field, ascending: options.ascending !== false });
        return this;
    }

    limit(value: number): this {
        this.maximum = value;
        return this;
    }

    single(): this {
        this.returnSingle = true;
        return this;
    }

    then<TResult1 = FirebaseResult, TResult2 = never>(
        onfulfilled?: ((value: FirebaseResult) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ): PromiseLike<TResult1 | TResult2> {
        return this.execute().then(onfulfilled, onrejected);
    }

    private async fetchRows(): Promise<Row[]> {
        const db = getFirestoreDb();
        const idEquality = this.filters.find(
            (filter) => filter.field === "id" && filter.operator === "=="
        );

        if (idEquality && typeof idEquality.value === "string") {
            const snapshot = await getDoc(doc(db, this.collectionName, idEquality.value));
            if (!snapshot.exists()) return [];
            const row = toRow(snapshot);
            return this.matchesManualFilters(row) ? [row] : [];
        }

        const constraints: QueryConstraint[] = [];
        for (const filter of this.filters) {
            if (filter.field !== "id") {
                constraints.push(where(filter.field, filter.operator, filter.value));
            }
        }
        for (const sort of this.sorts) {
            constraints.push(orderBy(sort.field, sort.ascending ? "asc" : "desc"));
        }
        if (this.maximum !== null) constraints.push(firestoreLimit(this.maximum));

        const reference = collection(db, this.collectionName);
        const snapshot = await getDocs(query(reference, ...constraints));
        const rows = snapshot.docs.map(toRow).filter((row) => this.matchesManualFilters(row));
        return this.enrichRelationships(rows);
    }

    private matchesManualFilters(row: Row): boolean {
        return this.filters.every((filter) => {
            if (filter.field !== "id") return true;
            return filter.operator === "=="
                ? row.id === filter.value
                : row.id !== filter.value;
        });
    }

    private async enrichRelationships(rows: Row[]): Promise<Row[]> {
        if (this.collectionName === "departments" && this.selectedColumns.includes("teams")) {
            return Promise.all(
                rows.map(async (department) => {
                    const teamsQuery = new FirestoreQuery("teams")
                        .select("*, members(*)")
                        .eq("department_id", department.id)
                        .order("display_order", { ascending: true });
                    const result = await teamsQuery.execute();
                    return { ...department, teams: result.data || [] };
                })
            );
        }

        if (this.collectionName === "teams" && this.selectedColumns.includes("members")) {
            return Promise.all(
                rows.map(async (team) => {
                    const membersQuery = new FirestoreQuery("members")
                        .select("*")
                        .eq("team_id", team.id)
                        .order("display_order", { ascending: true });
                    const result = await membersQuery.execute();
                    return { ...team, members: result.data || [] };
                })
            );
        }

        return rows;
    }

    private async countRows(): Promise<number> {
        const db = getFirestoreDb();
        const constraints: QueryConstraint[] = this.filters
            .filter((filter) => filter.field !== "id")
            .map((filter) => where(filter.field, filter.operator, filter.value));
        const snapshot = await getCount(
            query(collection(db, this.collectionName), ...constraints)
        );
        return snapshot.data().count;
    }

    private async insertRows(): Promise<Row[]> {
        const db = getFirestoreDb();
        const inputs = Array.isArray(this.payload) ? this.payload : [this.payload || {}];
        const written: Row[] = [];

        for (const input of inputs) {
            const normalized = normalizeWrite(
                this.collectionName,
                withDefaults(this.collectionName, input)
            );
            const reference = await addDoc(collection(db, this.collectionName), normalized);
            written.push({ id: reference.id, ...normalized });
        }
        return written;
    }

    private async upsertRows(): Promise<Row[]> {
        const db = getFirestoreDb();
        const inputs = Array.isArray(this.payload) ? this.payload : [this.payload || {}];
        const conflictField =
            this.upsertOptions.onConflict ||
            (this.collectionName === "site_settings" ? "key" : "id");
        const written: Row[] = [];

        for (const input of inputs) {
            const conflictValue = input[conflictField];
            let documentId = typeof input.id === "string" ? input.id : null;
            let existing: Row | null = null;

            if (!documentId && conflictValue !== undefined) {
                if (this.collectionName === "site_settings" && conflictField === "key") {
                    documentId = String(conflictValue);
                    const snapshot = await getDoc(doc(db, this.collectionName, documentId));
                    if (snapshot.exists()) existing = toRow(snapshot);
                } else {
                    const snapshot = await getDocs(
                        query(
                            collection(db, this.collectionName),
                            where(conflictField, "==", conflictValue),
                            firestoreLimit(1)
                        )
                    );
                    if (!snapshot.empty) {
                        documentId = snapshot.docs[0].id;
                        existing = toRow(snapshot.docs[0]);
                    }
                }
            }

            const normalized = normalizeWrite(this.collectionName, existing
                ? withUpdateTimestamp(this.collectionName, { ...existing, ...input })
                : withDefaults(this.collectionName, input));
            delete normalized.id;

            if (documentId) {
                await setDoc(doc(db, this.collectionName, documentId), normalized, { merge: true });
                written.push({ id: documentId, ...normalized });
            } else {
                const reference = await addDoc(collection(db, this.collectionName), normalized);
                written.push({ id: reference.id, ...normalized });
            }
        }
        return written;
    }

    private async updateRows(): Promise<Row[]> {
        const rows = await this.fetchRows();
        const payload = normalizeWrite(
            this.collectionName,
            withUpdateTimestamp(this.collectionName, this.payload as Row)
        );
        const db = getFirestoreDb();

        await Promise.all(
            rows.map((row) => updateDoc(doc(db, this.collectionName, String(row.id)), payload))
        );
        return rows.map((row) => ({ ...row, ...payload }));
    }

    private async cascadeDelete(row: Row): Promise<void> {
        const db = getFirestoreDb();

        if (this.collectionName === "departments") {
            const teams = await getDocs(
                query(collection(db, "teams"), where("department_id", "==", row.id))
            );
            for (const team of teams.docs) {
                const members = await getDocs(
                    query(collection(db, "members"), where("team_id", "==", team.id))
                );
                const batch = writeBatch(db);
                members.docs.forEach((member) => batch.delete(member.ref));
                batch.delete(team.ref);
                await batch.commit();
            }
        }

        if (this.collectionName === "teams") {
            const members = await getDocs(
                query(collection(db, "members"), where("team_id", "==", row.id))
            );
            const batch = writeBatch(db);
            members.docs.forEach((member) => batch.delete(member.ref));
            await batch.commit();
        }
    }

    private async deleteRows(): Promise<Row[]> {
        const db = getFirestoreDb();
        const rows = await this.fetchRows();
        for (const row of rows) {
            await this.cascadeDelete(row);
            await deleteDoc(doc(db, this.collectionName, String(row.id)));
        }
        return rows;
    }

    private async mutateThroughServer(): Promise<Row[]> {
        const response = await fetch("/api/admin/content", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                collection: this.collectionName,
                action: this.action,
                payload: this.payload,
                filters: this.filters,
                upsertOptions: this.upsertOptions,
            }),
        });
        const body = (await response.json().catch(() => null)) as
            | { data?: Row[]; error?: string }
            | null;
        if (!response.ok) throw new Error(body?.error || "The content could not be saved.");
        return body?.data || [];
    }

    private async execute(): Promise<FirebaseResult> {
        try {
            if (this.action === "select" && this.selectOptions.count === "exact") {
                const count = await this.countRows();
                return { data: this.selectOptions.head ? null : await this.fetchRows(), error: null, count };
            }

            if (this.action !== "select") {
                const rows = await this.mutateThroughServer();
                const data = this.returnSingle ? rows[0] || null : rows;
                return { data: this.returnWrittenRows ? data : null, error: null };
            }
            const rows = await this.fetchRows();

            const data = this.returnSingle ? rows[0] || null : rows;
            return {
                data: this.action === "select" || this.returnWrittenRows ? data : null,
                error: null,
            };
        } catch (error) {
            return {
                data: null,
                error: error instanceof Error ? error : new Error(String(error)),
            };
        }
    }
}

export function createClient() {
    return {
        from(collectionName: string) {
            return new FirestoreQuery(collectionName);
        },
        auth: {
            async signInWithPassword(credentials: { email: string; password: string }) {
                try {
                    const result = await signInWithEmailAndPassword(
                        getFirebaseAuth(),
                        credentials.email,
                        credentials.password
                    );
                    try {
                        await createServerSession(result.user);
                    } catch (error) {
                        await signOut(getFirebaseAuth());
                        throw error;
                    }
                    return { data: { user: result.user }, error: null };
                } catch (error) {
                    return {
                        data: { user: null },
                        error: error instanceof Error ? error : new Error(String(error)),
                    };
                }
            },
            async signInWithGoogle() {
                try {
                    const result = await signInWithPopup(
                        getFirebaseAuth(),
                        new GoogleAuthProvider()
                    );
                    try {
                        await createServerSession(result.user);
                    } catch (error) {
                        await signOut(getFirebaseAuth());
                        throw error;
                    }
                    return { data: { user: result.user }, error: null };
                } catch (error) {
                    return {
                        data: { user: null },
                        error: error instanceof Error ? error : new Error(String(error)),
                    };
                }
            },
            async sendPasswordSetup(email: string) {
                try {
                    await sendPasswordResetEmail(getFirebaseAuth(), email);
                    return { error: null };
                } catch (error) {
                    return { error: error instanceof Error ? error : new Error(String(error)) };
                }
            },
            async signOut() {
                try {
                    await signOut(getFirebaseAuth());
                    await fetch("/api/auth/session", { method: "DELETE" });
                    return { error: null };
                } catch (error) {
                    return { error: error instanceof Error ? error : new Error(String(error)) };
                }
            },
            async getUser() {
                const user = await waitForCurrentUser();
                return { data: { user }, error: null };
            },
        },
    };
}
