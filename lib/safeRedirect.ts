/** Only ever a same-site path — `redirect`/`next` query params are
 *  user-controlled, so anything else (an absolute URL, a protocol-relative
 *  `//host/...`) is rejected in favor of `fallback` to avoid an open redirect
 *  after login. */
export function safeRedirectPath(value: string | string[] | undefined, fallback: string): string {
  const target = Array.isArray(value) ? value[0] : value;
  if (target && target.startsWith("/") && !target.startsWith("//")) return target;
  return fallback;
}
