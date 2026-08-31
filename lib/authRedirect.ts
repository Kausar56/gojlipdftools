const PRODUCTION_ORIGIN = "https://www.gojli.com";

/** The origin to build an auth redirect URL (email confirmation, magic
 *  link, password reset, OAuth callback) from.
 *
 *  Trusting `window.location.origin` directly is risky in production: it's
 *  whatever address is in the browser's URL bar at that moment, not
 *  necessarily the site's real domain. Anyone who reaches the app through an
 *  unintended address — the server's own bind address (0.0.0.0), a raw
 *  server IP, a staging URL — gets that baked into their confirmation
 *  email's link instead of the working public domain, and Supabase happily
 *  honors it if the project's Auth redirect allow-list is permissive. Only
 *  genuine local development (localhost/127.0.0.1) still uses the live
 *  origin, so `npm run dev` keeps producing working links without extra
 *  setup; everything else falls back to the real production origin. */
export function getAuthRedirectOrigin(): string {
  if (typeof window === "undefined") return PRODUCTION_ORIGIN;
  const { hostname, origin } = window.location;
  const isLocalDev = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  return isLocalDev ? origin : PRODUCTION_ORIGIN;
}
