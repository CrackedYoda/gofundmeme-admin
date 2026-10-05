import { useEffect, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { request, type AdminCampaign } from "../api";
import { useSession } from "../App";
import { ago, num, sol, usd } from "../format";
import { Badge, QueryState } from "./common";

type Filter = "" | "false" | "true";

export function CampaignsPage() {
  const s = useSession();
  const client = useQueryClient();
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [blocked, setBlocked] = useState<Filter>("");

  useEffect(() => {
    const id = setTimeout(() => setQ(input.trim()), 300);
    return () => clearTimeout(id);
  }, [input]);

  const campaigns = useInfiniteQuery({
    queryKey: ["campaigns", s.api, q, blocked],
    initialPageParam: "0",
    queryFn: ({ pageParam }) => {
      const p = new URLSearchParams({ cursor: pageParam });
      if (q) p.set("q", q);
      if (blocked) p.set("blocked", blocked);
      return request<{ items: AdminCampaign[]; nextCursor: string | null }>(s, `/admin/campaigns?${p}`);
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const rows = campaigns.data?.pages.flatMap((p) => p.items) ?? [];

  const setBlock = useMutation({
    mutationFn: ({ id, block, reason }: { id: number; block: boolean; reason?: string }) =>
      request(s, `/admin/campaigns/${id}/block`, { method: "POST", body: JSON.stringify({ blocked: block, ...(reason ? { reason } : {}) }) }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["campaigns"] });
      void client.invalidateQueries({ queryKey: ["overview"] });
    },
  });

  function toggle(c: AdminCampaign) {
    if (c.blocked) {
      if (window.confirm(`Unblock "${c.title}"? It will show on the site and accept new coins again.`)) setBlock.mutate({ id: c.id, block: false });
      return;
    }
    const reason = window.prompt(`Block "${c.title}"? It disappears from the site and can't get new coins. Reason (optional):`);
    if (reason !== null) setBlock.mutate({ id: c.id, block: true, reason: reason.trim() || undefined });
  }

  return (
    <>
      <div className="head">
        <h1>Campaigns</h1>
        <div className="seg">
          {(
            [
              ["", "All"],
              ["false", "Active"],
              ["true", "Blocked"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} className={id === blocked ? "active" : ""} onClick={() => setBlocked(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <input className="search" placeholder="Search by title or slug" value={input} onChange={(e) => setInput(e.target.value)} />
      {setBlock.error && <p className="error">{(setBlock.error as Error).message}</p>}
      <QueryState error={campaigns.error} loading={campaigns.isLoading} empty={campaigns.data && rows.length === 0} />
      {rows.length > 0 && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Status</th>
                <th className="num">Coins</th>
                <th className="num">Donated</th>
                <th className="num">Owed</th>
                <th className="num">Not swapped</th>
                <th>Added</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="wrap">
                    <a href={c.url} target="_blank" rel="noreferrer">
                      {c.title}
                    </a>
                    <div className="muted small mono">{c.slug}</div>
                  </td>
                  <td>
                    {c.blocked ? <Badge tone="bad">blocked</Badge> : <Badge tone={c.status === "verified" ? "ok" : "muted"}>{c.status}</Badge>}
                    {c.blockedReason && <div className="muted small">{c.blockedReason}</div>}
                  </td>
                  <td className="num">{num(c.coins)}</td>
                  <td className="num">{usd(c.donatedUsd)}</td>
                  <td className="num">{usd(c.owedUsd)}</td>
                  <td className="num">{sol(c.unswappedLamports)}</td>
                  <td title={c.createdAt}>{ago(c.createdAt)}</td>
                  <td>
                    <button className={c.blocked ? "" : "danger"} onClick={() => toggle(c)} disabled={setBlock.isPending}>
                      {c.blocked ? "Unblock" : "Block"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {campaigns.hasNextPage && (
        <p>
          <button onClick={() => void campaigns.fetchNextPage()} disabled={campaigns.isFetchingNextPage}>
            {campaigns.isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        </p>
      )}
    </>
  );
}
