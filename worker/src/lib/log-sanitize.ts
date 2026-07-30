/**
 * Provider responses (SerpApi etc.) are logged verbatim for debugging.
 * A malicious or compromised upstream could embed CRLF/control characters
 * to forge fake log lines (log injection). Strip them before logging.
 */
export function sanitizeForLog<T>(value: T): T {
  if (typeof value === "string") {
    return value.replace(/[\r\n\t\x00-\x1f\x7f]/g, " ") as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeForLog(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeForLog(v);
    }
    return out as T;
  }
  return value;
}
