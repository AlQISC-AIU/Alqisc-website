import { NextResponse } from "next/server";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const attempts = new Map<string, number[]>();

function clientAddress(request: Request): string {
    return (request.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
}

function isRateLimited(address: string): boolean {
    const cutoff = Date.now() - 10 * 60 * 1000;
    const recent = (attempts.get(address) || []).filter((time) => time > cutoff);
    recent.push(Date.now());
    attempts.set(address, recent);
    return recent.length > 5;
}

function text(value: unknown, min: number, max: number): value is string {
    return typeof value === "string" && value.trim().length >= min && value.trim().length <= max;
}

export async function POST(request: Request) {
    if (isRateLimited(clientAddress(request))) {
        return NextResponse.json({ error: "Too many messages. Please wait a few minutes and try again." }, { status: 429 });
    }

    const body = await request.json().catch(() => null) as {
        name?: unknown;
        email?: unknown;
        subject?: unknown;
        message?: unknown;
        website?: unknown;
    } | null;
    if (!body || body.website) {
        return NextResponse.json({ error: "Invalid contact submission." }, { status: 400 });
    }
    if (!text(body.name, 2, 100) || !text(body.email, 3, 254) || !EMAIL.test(body.email.trim()) ||
        !text(body.subject, 2, 200) || !text(body.message, 10, 5_000)) {
        return NextResponse.json(
            { error: "Enter a valid email, at least 2 characters for your name and subject, and at least 10 characters for your message." },
            { status: 400 }
        );
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: "Online message delivery is not configured yet. Please use the email address shown on this page." },
            { status: 503 }
        );
    }

    const configuredRecipient = process.env.CONTACT_TO_EMAIL?.trim();
    const setting = configuredRecipient ? null : await getFirebaseAdminDb()
        .collection("site_settings")
        .doc("contact_email")
        .get();
    const recipient = configuredRecipient || String(setting?.data()?.value || "").trim();
    if (!EMAIL.test(recipient)) {
        return NextResponse.json(
            { error: "The contact recipient is not configured. Please use the email address shown on this page." },
            { status: 503 }
        );
    }

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: process.env.CONTACT_FROM_EMAIL || "Al-QISC Website <onboarding@resend.dev>",
            to: [recipient],
            reply_to: body.email.trim(),
            subject: `[Website] ${body.subject.trim()}`,
            text: `Name: ${body.name.trim()}\nEmail: ${body.email.trim()}\n\n${body.message.trim()}`,
        }),
        cache: "no-store",
    });

    if (!response.ok) {
        const providerError = await response.json().catch(() => null) as {
            message?: string;
            name?: string;
        } | null;
        const providerCode = providerError?.name || "unknown_error";

        console.error("Contact email provider rejected the request", {
            status: response.status,
            code: providerCode,
            message: providerError?.message || "No provider message returned",
        });

        if (response.status === 403) {
            let developmentMessage = "Resend rejected the email configuration. Check the API key and verified sender domain.";

            if (providerCode === "invalid_api_key") {
                developmentMessage = "Resend rejected RESEND_API_KEY. Create a valid API key in the same Resend account used for the sending domain.";
            } else if (!process.env.CONTACT_FROM_EMAIL) {
                developmentMessage = "Resend is in testing mode. Set CONTACT_TO_EMAIL to your Resend account email, or verify a domain and set CONTACT_FROM_EMAIL to an address on that domain.";
            } else {
                developmentMessage = "Resend rejected CONTACT_FROM_EMAIL. Confirm that its domain is verified in the same Resend account as RESEND_API_KEY.";
            }

            return NextResponse.json(
                {
                    error: process.env.NODE_ENV === "development"
                        ? developmentMessage
                        : "Message delivery is temporarily unavailable. Please email us directly.",
                },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: "Your message could not be delivered. Please try again or email us directly." },
            { status: response.status === 429 ? 503 : 502 }
        );
    }
    return NextResponse.json({ success: true }, { status: 202 });
}
