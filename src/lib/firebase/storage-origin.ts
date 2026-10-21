// Where image download URLs point. The local Storage emulator serves them over
// plain HTTP on 127.0.0.1:9199 (see firebase.json and `npm run dev:emulators`).
const EMULATOR_HOST = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || "";

export const STORAGE_ORIGIN = EMULATOR_HOST
    ? `http://${EMULATOR_HOST}:9199`
    : "https://firebasestorage.googleapis.com";

export function isStorageUrl(value: string): boolean {
    return value.startsWith(`${STORAGE_ORIGIN}/`);
}

export function storageDownloadUrl(bucket: string, path: string, token: string): string {
    return `${STORAGE_ORIGIN}/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

// True for a download URL of a file in this site's own bucket.
export function isBucketFileUrl(value: string, bucket: string): boolean {
    if (!bucket) return false;
    try {
        const url = new URL(value);
        return url.origin === STORAGE_ORIGIN && url.pathname.startsWith(`/v0/b/${bucket}/o/`);
    } catch {
        return false;
    }
}
