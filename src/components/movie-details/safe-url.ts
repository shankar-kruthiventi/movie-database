/** Follow-up C (2026-11-09): TMDB's `homepage` is third-party data rendered as an href, so only absolute http(s) URLs
 *  may become a link. `javascript:`, `data:`, `vbscript:`, protocol-relative (`//evil`), relative and malformed
 *  values give `undefined` (no link). The value is returned unchanged (not normalised) so the link text and href stay
 *  exactly what TMDB sent. */
export function safeHttpUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
}
