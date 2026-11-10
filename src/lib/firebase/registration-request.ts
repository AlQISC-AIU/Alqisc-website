import "server-only";

import { NextResponse } from "next/server";
import { applicationId, getRegistrationConfig } from "./committee-registration";
import { createRateLimiter } from "@/lib/rate-limit";
import {
    isAcceptingApplications,
    isPositionOpen,
    positionLabel,
    REJECTED_POSITION_FIELDS,
    validateApplicationInput,
    type ApplicationInput,
    type RegistrationConfig,
} from "@/lib/committee-registration";

// Checks shared by the two public registration endpoints: the one that allows a
// photo upload and the one that stores the application.

const WINDOW_MS = 10 * 60 * 1000;
// Students on campus Wi-Fi can share one public address, so the per-address
// limit is set for a whole hall applying at once: an application takes two or
// three requests, which leaves room for roughly 40 applicants in ten minutes.
const byAddress = createRateLimiter({ limit: 120, windowMs: WINDOW_MS });
// The tighter limit follows the applicant instead of the network: nobody needs
// more than a few attempts for one student email.
const byEmail = createRateLimiter({ limit: 10, windowMs: WINDOW_MS });

// Only these may be sent, each at most once. Anything else that names a
// position, including a second copy of a field, is treated as tampering.
const SINGLE_VALUE_FIELDS = ["applied_position", "department_position", "student_email"];

export function registrationError(error: string, status = 400, extra: Record<string, unknown> = {}) {
    return NextResponse.json({ error, ...extra }, { status });
}

function clientAddress(request: Request): string {
    return (request.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
}

type Checked =
    | { ok: true; config: RegistrationConfig; application: ApplicationInput; id: string }
    | { ok: false; response: NextResponse };

/**
 * Runs every check an application must pass before anything is stored.
 * `entries` are the submitted text fields, as [name, value] pairs so that a
 * field sent twice can be noticed.
 */
export async function checkRegistrationRequest(request: Request, entries: [string, unknown][]): Promise<Checked> {
    const refuse = (response: NextResponse): Checked => ({ ok: false, response });
    const tooMany = () => refuse(registrationError("Too many attempts. Please wait a few minutes and try again.", 429));

    if (!byAddress.allow(clientAddress(request))) return tooMany();

    const fields = Object.fromEntries(entries);
    // The form has a field people never see or fill in; only automated
    // submissions put something in it.
    if (typeof fields.website === "string" && fields.website.trim()) {
        return refuse(registrationError("Invalid registration submission."));
    }

    const repeated = SINGLE_VALUE_FIELDS.some((name) => entries.filter(([key]) => key === name).length > 1);
    const unexpected = REJECTED_POSITION_FIELDS.some((name) => name in fields && String(fields[name] ?? "").trim() !== "");
    if (repeated || unexpected || SINGLE_VALUE_FIELDS.some((name) => name in fields && typeof fields[name] !== "string")) {
        return refuse(registrationError("An application can name one position only."));
    }

    const email = typeof fields.student_email === "string" ? fields.student_email.trim().toLowerCase() : "";
    if (email && !byEmail.allow(email)) return tooMany();

    const config = await getRegistrationConfig();
    if (!isAcceptingApplications(config)) {
        return refuse(registrationError("Committee registration is currently closed.", 403));
    }

    const result = validateApplicationInput(fields);
    if (!result.ok) return refuse(registrationError(result.error, 400, { errors: result.errors }));
    const application = result.value;

    if (!isPositionOpen(config, application.applied_position, application.department_position)) {
        const label = positionLabel(application.applied_position, application.department_position);
        return refuse(registrationError(`Applications for ${label} are closed.`, 403, {
            errors: { applied_position: `Applications for ${label} are closed. Please choose another position.` },
        }));
    }

    return { ok: true, config, application, id: applicationId(config.term, application.student_email) };
}

export const DUPLICATE_APPLICATION = "An application with this student email has already been submitted for this term.";
