import { headers } from "next/headers";

/**
 * Public origin of the current request. Used for magic-link redirects so
 * Vercel preview deployments return to themselves. Falls back to
 * NEXT_PUBLIC_SITE_URL, then localhost.
 */
export function getSiteUrl(): string {
  try {
    const h = headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    // outside a request scope
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
