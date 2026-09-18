const productionUrl = "https://www.alqisc.com";

export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL || productionUrl;

  const url = configuredUrl.startsWith("http") ? configuredUrl : `https://${configuredUrl}`;
  const normalizedUrl = url.replace(/\/$/, "");

  // Search metadata should always identify the public custom domain, including
  // on Vercel preview and project-domain deployments.
  return normalizedUrl.includes(".vercel.app") ? productionUrl : normalizedUrl;
}
