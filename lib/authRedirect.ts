const PRODUCTION_ORIGIN = "https://www.gojli.com";

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

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
  return isLocalHostname(hostname) ? origin : PRODUCTION_ORIGIN;
}

/** Same trust rule as getAuthRedirectOrigin, but for a server-side Request
 *  (used by app/auth/callback/route.ts to build its own redirect back to
 *  the browser). `request.url`'s origin reflects whatever Host the Node
 *  process itself saw — on Hostinger's LiteSpeed + Node setup that can be
 *  the process's own bind address (0.0.0.0:3000) instead of the public
 *  domain when the reverse proxy doesn't forward the original Host header,
 *  which otherwise sends the user's browser to a dead 0.0.0.0 address right
 *  after Supabase's own redirect worked correctly. */
export function getServerAuthOrigin(request: Request): string {
  const { hostname, origin } = new URL(request.url);
  return isLocalHostname(hostname) ? origin : PRODUCTION_ORIGIN;
}
