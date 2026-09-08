const localUrl = "http://localhost:3000";

export function getSiteUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;

  if (!configuredUrl) return localUrl;
  const url = configuredUrl.startsWith("http") ? configuredUrl : `https://${configuredUrl}`;
  return url.replace(/\/$/, "");
}
