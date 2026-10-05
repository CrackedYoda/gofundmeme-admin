import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { request, type AdminOverview } from "../api";
import { useSession } from "../App";

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "warn" | "bad" }) {
  return (
    <div className={`card stat ${tone ?? ""}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

export function QueryState({ error, loading, empty }: { error: unknown; loading: boolean; empty?: boolean }) {
  if (error) return <p className="error">{error instanceof Error ? error.message : "Something went wrong."}</p>;
  if (loading) return <p className="muted">Loading…</p>;
  if (empty) return <p className="muted">Nothing here.</p>;
  return null;
}

export function Badge({ tone, children }: { tone: "ok" | "warn" | "bad" | "muted"; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function statusTone(status: string): "ok" | "warn" | "bad" | "muted" {
  if (["live", "graduated", "verified", "done"].includes(status)) return "ok";
  if (["pending", "building", "sent", "unclaimed"].includes(status)) return "warn";
  if (["failed", "expired"].includes(status)) return "bad";
  return "muted";
}

/** Overview, polled every 30 s (the worker's fastest jobs run on that beat). Shared by Overview and Jobs. */
export function useOverview() {
  const s = useSession();
  return useQuery({
    queryKey: ["overview", s.api],
    queryFn: () => request<AdminOverview>(s, "/admin/overview"),
    refetchInterval: 30_000,
  });
}
