const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);

export function isSafePublicHttpUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (BLOCKED_HOSTS.has(host)) return false;
    if (host.endsWith(".local") || host.endsWith(".internal")) return false;
    if (isPrivateIpv4(host)) return false;
    if (host === "169.254.169.254") return false;
    return true;
  } catch {
    return false;
  }
}

function isPrivateIpv4(host: string) {
  const parts = host.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10 || a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

export function isSameOrigin(left: string, right: string) {
  try {
    return new URL(left).origin === new URL(right).origin;
  } catch {
    return false;
  }
}

export function isSkippableAssetUrl(raw: string) {
  return /\.(pdf|zip|docx?|xlsx?|pptx?|png|jpe?g|gif|svg|webp|mp4|mp3)(\?|$)/i.test(raw);
}
