import type { DocumentData, Query } from "firebase-admin/firestore";
import { getFirebaseAdminDb, requireAdminSession } from "./admin";
import { withDefaults, withUpdateTimestamp, type FirebaseResult } from "./client";

type Row = Record<string, unknown>;
type Filter = { field: string; operator: "==" | "!="; value: unknown };
type Sort = { field: string; ascending: boolean };
type SelectOptions = { count?: "exact"; head?: boolean };
type UpsertOptions = { onConflict?: string };

class AdminFirestoreQuery implements PromiseLike<FirebaseResult> {
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

    private buildQuery(): Query<DocumentData> {
        let reference: Query<DocumentData> = getFirebaseAdminDb().collection(this.collectionName);
        for (const filter of this.filters) {
            if (filter.field !== "id") {
                reference = reference.where(filter.field, filter.operator, filter.value);
            }
        }
        for (const sort of this.sorts) {
            reference = reference.orderBy(sort.field, sort.ascending ? "asc" : "desc");
        }
        if (this.maximum !== null) reference = reference.limit(this.maximum);
        return reference;
    }

    private matchesId(row: Row): boolean {
        return this.filters.every((filter) => {
            if (filter.field !== "id") return true;
            return filter.operator === "==" ? row.id === filter.value : row.id !== filter.value;
        });
    }

    private async fetchRows(): Promise<Row[]> {
        const idEquality = this.filters.find(
            (filter) => filter.field === "id" && filter.operator === "=="
        );
        let rows: Row[];

        if (idEquality && typeof idEquality.value === "string") {
            const snapshot = await getFirebaseAdminDb()
                .collection(this.collectionName)
                .doc(idEquality.value)
                .get();
            rows = snapshot.exists ? [{ id: snapshot.id, ...snapshot.data() }] : [];
        } else {
            const snapshot = await this.buildQuery().get();
            rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        }

        rows = rows.filter((row) => this.matchesId(row));
        return this.enrichRelationships(rows);
    }

    private async enrichRelationships(rows: Row[]): Promise<Row[]> {
        if (this.collectionName === "departments" && this.selectedColumns.includes("teams")) {
            return Promise.all(
                rows.map(async (department) => {
                    const result = await new AdminFirestoreQuery("teams")
                        .select("*, members(*)")
                        .eq("department_id", department.id)
                        .order("display_order");
                    return { ...department, teams: result.data || [] };
                })
            );
        }
        if (this.collectionName === "teams" && this.selectedColumns.includes("members")) {
            return Promise.all(
                rows.map(async (team) => {
                    const result = await new AdminFirestoreQuery("members")
                        .select("*")
                        .eq("team_id", team.id)
                        .order("display_order");
                    return { ...team, members: result.data || [] };
                })
            );
        }
        return rows;
    }

    private async insertRows(): Promise<Row[]> {
        const inputs = Array.isArray(this.payload) ? this.payload : [this.payload || {}];
        const written: Row[] = [];
        for (const input of inputs) {
            const normalized = withDefaults(this.collectionName, input);
            const reference = await getFirebaseAdminDb().collection(this.collectionName).add(normalized);
            written.push({ id: reference.id, ...normalized });
        }
        return written;
    }

    private async upsertRows(): Promise<Row[]> {
        const inputs = Array.isArray(this.payload) ? this.payload : [this.payload || {}];
        const conflictField =
            this.upsertOptions.onConflict ||
            (this.collectionName === "site_settings" ? "key" : "id");
        const written: Row[] = [];

        if (this.collectionName === "site_settings" && conflictField === "key") {
            const db = getFirebaseAdminDb();
            const batch = db.batch();
            for (const input of inputs) {
                const key = String(input.key || "");
                const normalized = withUpdateTimestamp(
                    this.collectionName,
                    withDefaults(this.collectionName, input)
                );
                delete normalized.id;
                const reference = db.collection(this.collectionName).doc(key);
                batch.set(reference, normalized, { merge: true });
                written.push({ id: key, ...normalized });
            }
            await batch.commit();
            return written;
        }

        for (const input of inputs) {
            const conflictValue = input[conflictField];
            let documentId = typeof input.id === "string" ? input.id : null;
            let existing: Row | null = null;

            if (!documentId && conflictValue !== undefined) {
                if (this.collectionName === "site_settings" && conflictField === "key") {
                    documentId = String(conflictValue);
                    const snapshot = await getFirebaseAdminDb()
                        .collection(this.collectionName)
                        .doc(documentId)
                        .get();
                    if (snapshot.exists) existing = { id: snapshot.id, ...snapshot.data() };
                } else {
                    const snapshot = await getFirebaseAdminDb()
                        .collection(this.collectionName)
                        .where(conflictField, "==", conflictValue)
                        .limit(1)
                        .get();
                    if (!snapshot.empty) {
                        documentId = snapshot.docs[0].id;
                        existing = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
                    }
                }
            }

            const normalized = existing
                ? withUpdateTimestamp(this.collectionName, { ...existing, ...input })
                : withDefaults(this.collectionName, input);
            delete normalized.id;
            const reference = documentId
                ? getFirebaseAdminDb().collection(this.collectionName).doc(documentId)
                : getFirebaseAdminDb().collection(this.collectionName).doc();
            await reference.set(normalized, { merge: true });
            written.push({ id: reference.id, ...normalized });
        }
        return written;
    }

    private async updateRows(): Promise<Row[]> {
        const rows = await this.fetchRows();
        const payload = withUpdateTimestamp(this.collectionName, this.payload as Row);
        await Promise.all(
            rows.map((row) =>
                getFirebaseAdminDb()
                    .collection(this.collectionName)
                    .doc(String(row.id))
                    .update(payload)
            )
        );
        return rows.map((row) => ({ ...row, ...payload }));
    }

    private async cascadeDelete(row: Row): Promise<void> {
        if (this.collectionName === "departments") {
            const teams = await getFirebaseAdminDb()
                .collection("teams")
                .where("department_id", "==", row.id)
                .get();
            for (const team of teams.docs) {
                const members = await getFirebaseAdminDb()
                    .collection("members")
                    .where("team_id", "==", team.id)
                    .get();
                const batch = getFirebaseAdminDb().batch();
                members.docs.forEach((member) => batch.delete(member.ref));
                batch.delete(team.ref);
                await batch.commit();
            }
        }
        if (this.collectionName === "teams") {
            const members = await getFirebaseAdminDb()
                .collection("members")
                .where("team_id", "==", row.id)
                .get();
            const batch = getFirebaseAdminDb().batch();
            members.docs.forEach((member) => batch.delete(member.ref));
            await batch.commit();
        }
    }

    private async deleteRows(): Promise<Row[]> {
        const rows = await this.fetchRows();
        for (const row of rows) {
            await this.cascadeDelete(row);
            await getFirebaseAdminDb()
                .collection(this.collectionName)
                .doc(String(row.id))
                .delete();
        }
        return rows;
    }

    private async execute(): Promise<FirebaseResult> {
        try {
            if (this.action === "select" && this.selectOptions.count === "exact") {
                const countSnapshot = await this.buildQuery().count().get();
                return {
                    data: this.selectOptions.head ? null : await this.fetchRows(),
                    error: null,
                    count: countSnapshot.data().count,
                };
            }

            let rows: Row[];
            switch (this.action) {
                case "insert": rows = await this.insertRows(); break;
                case "upsert": rows = await this.upsertRows(); break;
                case "update": rows = await this.updateRows(); break;
                case "delete": rows = await this.deleteRows(); break;
                default: rows = await this.fetchRows();
            }

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

export async function createClient() {
    await requireAdminSession();
    return {
        from(collectionName: string) {
            return new AdminFirestoreQuery(collectionName);
        },
    };
}
