import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/firebase/admin";
import {
    ADMIN_BASE_PATH,
    ADMIN_DASHBOARD_PATH,
    ADMIN_LOGIN_PATH,
} from "@/lib/admin-routes";

export function proxy(request: NextRequest) {
    const hasSession = request.cookies.has(SESSION_COOKIE_NAME);
    const pathname = request.nextUrl.pathname;

    if (!hasSession && pathname.startsWith(ADMIN_BASE_PATH) && pathname !== ADMIN_LOGIN_PATH) {
        return NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, request.url));
    }

    // A cookie can be expired or belong to an administrator whose access was
    // removed. Keep the login page reachable so server-side authorization
    // redirects cannot create a /login <-> /dashboard loop.
    if (hasSession && pathname === ADMIN_BASE_PATH) {
        return NextResponse.redirect(new URL(ADMIN_DASHBOARD_PATH, request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/club-console-alqisc-7q4m-test/admin/:path*"],
};
