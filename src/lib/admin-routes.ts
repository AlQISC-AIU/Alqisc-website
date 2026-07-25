export const ADMIN_BASE_PATH = "/club-console-alqisc-7q4m-test/admin";
export const ADMIN_LOGIN_PATH = `${ADMIN_BASE_PATH}/login`;
export const ADMIN_DASHBOARD_PATH = `${ADMIN_BASE_PATH}/dashboard`;
export const ADMIN_MOBILE_NAV_EVENT = "alqisc:admin-mobile-nav";

export function adminPath(path = "") {
    if (!path) return ADMIN_BASE_PATH;
    return `${ADMIN_BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}
