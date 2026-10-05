/** Talks to gofundmeme-backend's /admin routes with a Sign-In With Solana session.
 *
 * The session token lives in sessionStorage only: it is gone when the tab closes, it expires on the
 * server after 12 hours, and it is never sent anywhere but the configured backend. */

const SESSION_KEY = "gfm-admin-session";
export const DEFAULT_API = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";
export const SESSION_EXPIRED = "gfm-admin-session-expired";

export interface Session {
  api: string;
  token: string;
  wallet: string;
}

export function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(s: Session | null) {
  try {
    if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage blocked: the session just lasts until reload */
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Unauthenticated calls (sign-in). */
export async function call<T>(api: string, path: string, init?: RequestInit & { token?: string }): Promise<T> {
  const headers: Record<string, string> = {};
  if (init?.token) headers.Authorization = `Bearer ${init.token}`;
  if (init?.body && !(init.body instanceof FormData)) headers["Content-Type"] = "application/json";
  let res: Response;
  try {
    res = await fetch(api + path, { ...init, headers });
  } catch {
    throw new ApiError("Couldn't reach the backend. Check the URL and that its CORS_ORIGINS allows this origin.", 0);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      res.status === 401
        ? "Your session expired. Sign in again."
        : res.status === 403
          ? "This wallet isn't in the backend's ADMIN_WALLETS."
          : (body?.message ?? `Request failed (${res.status}).`);
    throw new ApiError(message, res.status);
  }
  return body as T;
}

/** Authenticated admin calls. A 401 signs the panel out. */
export async function request<T>(s: Session, path: string, init?: RequestInit): Promise<T> {
  try {
    return await call<T>(s.api, path, { ...init, token: s.token });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) window.dispatchEvent(new Event(SESSION_EXPIRED));
    throw err;
  }
}

// ---------------------------------------------------------------- types
// Copied from gofundmeme-backend packages/core/src/api-types.ts; keep in sync.

export type Stats = {
  donatedUsd: string;
  waitingUsd: string;
  coinsLaunched: number;
  campaignsSupported: number;
};

export type AdminJob = {
  job: string; // "<queue>/<name>"
  intervalSec: number | null; // null for jobs that only run on demand (sweeps, swaps)
  stale: boolean;
  lastRunAt: string | null;
  lastMs: number | null;
  lastOkAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  runs: number;
  failures: number;
};

export type AdminCheck = { ok: boolean; detail: string; at: string };

/** GET /admin/overview */
export type AdminOverview = {
  generatedAt: string;
  stats: Stats;
  killSwitch: { on: boolean; env: boolean };
  services: { api: boolean; mongo: boolean; redis: boolean; worker: boolean };
  jobs: AdminJob[];
  ops: { address: string; lamports: string; alertLamports: string; low: boolean; at: string } | null;
  checks: { integrity: AdminCheck | null; creator: AdminCheck | null };
  money: {
    claimedLamports: string;
    campaignLamports: string;
    platformLamports: string;
    unswappedLamports: string;
    usdcLocked: string;
    usdcDonated: string;
    usdcOwed: string;
  };
  tokens: Record<"pending" | "live" | "graduated" | "failed" | "expired", number> & { creatorMismatch: number };
  campaigns: { total: number; verified: number; blocked: number };
  swaps: { building: number; sent: number; failed: number; done: number; stuck: number };
  payoutsDue: number;
  alerts24h: number;
};

export type AdminAlert = { kind: string; message: string; at: string };

export type AdminLaunch = {
  mint: string;
  name: string;
  symbol: string;
  status: "pending" | "live" | "graduated" | "failed" | "expired";
  failureReason: string | null;
  launcherWallet: string;
  campaign: { slug: string; title: string } | null;
  createdAt: string;
  launchedAt: string | null;
};

export type AdminCampaign = {
  id: number;
  slug: string;
  title: string;
  url: string;
  status: "unclaimed" | "verified";
  blocked: boolean;
  blockedReason: string | null;
  coins: number;
  donatedUsd: string;
  owedUsd: string;
  unswappedLamports: string;
  createdAt: string;
};

/** GET /admin/payout-queue */
export type PayoutQueueItem = {
  campaignId: number;
  slug: string;
  title: string;
  url: string;
  status: "unclaimed" | "verified";
  usdcOwed: string;
  owedUsd: string;
  owedSince: string | null;
  reason: "threshold" | "age";
};

/** GET /auth/nonce, POST /auth/verify */
export type SiwsNonce = { nonce: string; message: string };
export type SiwsSession = { token: string; wallet: string; admin: boolean };
