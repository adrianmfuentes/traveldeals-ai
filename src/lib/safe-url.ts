/**
 * Deal booking URLs originate from third-party providers (flight/hotel search
 * APIs) and are rendered as anchor hrefs. A compromised or malicious upstream
 * response could return a `javascript:` or `data:` URI instead of a real
 * booking link, which would execute in the viewer's browser on click.
 * Only allow the http/https schemes through.
 */
export function isSafeHttpUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
