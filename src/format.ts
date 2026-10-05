// USD arrives as decimal strings, SOL as lamports, USDC as 6-decimal base units (all strings).

export function usd(v: string | number | undefined): string {
  const n = typeof v === "string" ? Number(v) : v;
  if (n === undefined || !Number.isFinite(n)) return "–";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: n >= 1000 ? 0 : 2 });
}

export const sol = (lamports: string | undefined) =>
  lamports === undefined ? "–" : `${(Number(lamports) / 1e9).toLocaleString(undefined, { maximumFractionDigits: 3 })} SOL`;

export const usdc = (base: string | undefined) =>
  base === undefined ? "–" : `${(Number(base) / 1e6).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;

export const num = (n: number | undefined) => (n === undefined ? "–" : n.toLocaleString());

export function short(addr: string | undefined, head = 4, tail = 4): string {
  if (!addr) return "–";
  return addr.length <= head + tail + 1 ? addr : `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function ago(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "never";
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** 30 → "30s", 600 → "10m", 86400 → "1d" */
export function every(sec: number | null): string {
  if (sec === null) return "on demand";
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${sec / 60}m`;
  if (sec < 86400) return `${sec / 3600}h`;
  return `${sec / 86400}d`;
}

/** "412.5" → "412500000" for 6 decimals. Null for anything that isn't a plain non-negative decimal. */
export function toBaseUnits(value: string, decimals: number): string | null {
  const m = /^(\d{0,15})(?:\.(\d*))?$/.exec(value.trim());
  if (!m || (m[1] === "" && !m[2])) return null;
  const frac = (m[2] ?? "").slice(0, decimals).padEnd(decimals, "0");
  return (BigInt(m[1] || "0") * 10n ** BigInt(decimals) + BigInt(frac || "0")).toString();
}

export const SOLSCAN = { tx: "https://solscan.io/tx/", account: "https://solscan.io/account/", token: "https://solscan.io/token/" } as const;
