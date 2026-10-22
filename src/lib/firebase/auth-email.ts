import "server-only";

export async function sendPasswordSetupEmail(email: string): Promise<void> {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY is not set.");

    const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requestType: "PASSWORD_RESET", email }),
            cache: "no-store",
        }
    );

    if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
            | { error?: { message?: string } }
            | null;
        const code = body?.error?.message || "EMAIL_SEND_FAILED";
        if (code.includes("OPERATION_NOT_ALLOWED")) {
            throw new Error("Enable the Email/Password provider in Firebase Authentication, then resend the invitation.");
        }
        throw new Error(`Firebase could not send the setup email (${code}).`);
    }
}
