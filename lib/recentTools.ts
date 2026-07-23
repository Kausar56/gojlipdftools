const STORAGE_KEY = "gojli:recent-tools";
const MAX_RECENT = 6;

export function getRecentToolSlugs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordToolVisit(slug: string): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getRecentToolSlugs();
    const next = [slug, ...existing.filter((item) => item !== slug)].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable (private browsing, etc.) — skip tracking silently.
  }
}
