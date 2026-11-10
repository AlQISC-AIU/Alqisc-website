// Temporary: runs the browser tests against the dev server that is already
// running on the emulators, instead of starting another one.
import base from "./playwright.config";

export default { ...base, use: { ...base.use, baseURL: "http://localhost:3000" }, webServer: undefined };
