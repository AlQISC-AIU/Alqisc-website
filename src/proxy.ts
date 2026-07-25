import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/firebase/admin";

export function proxy(request: NextRequest) {
    const hasSession = request.cookies.has(SESSION_COOKIE_NAME);
    const pathname = request.nextUrl.pathname;

    if (!hasSession && pathname.startsWith("/admin") && pathname !== "/admin/login") {
        return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    // A cookie can be expired or belong to an administrator whose access was
    // removed. Keep the login page reachable so server-side authorization
    // redirects cannot create a /login <-> /dashboard loop.
    if (hasSession && pathname === "/admin") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*"],
};
