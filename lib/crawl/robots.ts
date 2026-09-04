export async function isRobotsAllowed(url: string): Promise<boolean> {
  try {
    const target = new URL(url);
    const robotsUrl = `${target.origin}/robots.txt`;
    const res = await fetch(robotsUrl, { cache: "no-store" });
    if (!res.ok) return true;
    const text = await res.text();
    const lines = text.split("\n").map((l) => l.trim());
    let applies = false;
    for (const line of lines) {
      if (/^user-agent:\s*\*/i.test(line)) applies = true;
      if (/^user-agent:/i.test(line) && !/\*/i.test(line)) applies = false;
      if (applies && /^disallow:\s*\/\s*$/i.test(line)) return false;
    }
    return true;
  } catch {
    return true;
  }
}
