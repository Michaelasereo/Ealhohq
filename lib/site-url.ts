/**
 * Canonical public site origin (no trailing slash).
 * Used for SEO canonicals, OG URLs, and sitemap.
 */
export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ??
    "https://ealho.com"
  );
}
