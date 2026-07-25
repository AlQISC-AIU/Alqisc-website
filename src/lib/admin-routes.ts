export const ADMIN_BASE_PATH = "/club-console-alqisc-7q4m-test/admin";
export const ADMIN_LOGIN_PATH = `${ADMIN_BASE_PATH}/login`;
export const ADMIN_DASHBOARD_PATH = `${ADMIN_BASE_PATH}/dashboard`;

export function adminPath(path = "") {
    if (!path) return ADMIN_BASE_PATH;
    return `${ADMIN_BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}
