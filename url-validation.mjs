/** Только адрес единственного публичного приложения, без произвольных переходов. */
export function validatePilotUrl(value) {
  if (typeof value !== "string") return null;
  if (!/^https:\/\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.trycloudflare\.com\/?$/.test(value)) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.port || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") return null;
    return parsed.origin + "/";
  } catch { return null; }
}
