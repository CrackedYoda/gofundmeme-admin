import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { request, type AdminLaunch } from "../api";
import { useSession } from "../App";
import { ago, short, SOLSCAN } from "../format";
import { Badge, QueryState, statusTone } from "./common";

const FILTERS = [
  ["failed", "Failed"],
  ["pending", "Pending"],
  ["expired", "Expired"],
  ["", "All"],
] as const;
type Filter = (typeof FILTERS)[number][0];

export function LaunchesPage() {
  const s = useSession();
  const [status, setStatus] = useState<Filter>("failed");
  const launches = useQuery({
    queryKey: ["launches", s.api, status],
    queryFn: () => request<{ items: AdminLaunch[] }>(s, `/admin/launches?limit=200${status ? `&status=${status}` : ""}`).then((r) => r.items),
  });

  return (
    <>
      <div className="head">
        <h1>Launches</h1>
        <div className="seg">
          {FILTERS.map(([id, label]) => (
            <button key={id} className={id === status ? "active" : ""} onClick={() => setStatus(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="muted small">Pending launches expire after 10 minutes if they&apos;re never submitted. Failed ones were rejected on-chain or paid the wrong creator.</p>
      <QueryState error={launches.error} loading={launches.isLoading} empty={launches.data?.length === 0} />
      {!!launches.data?.length && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Coin</th>
                <th>Status</th>
                <th>Campaign</th>
                <th>Launcher</th>
                <th>Created</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {launches.data.map((t) => (
                <tr key={t.mint}>
                  <td>
                    <strong>{t.name}</strong> <span className="muted">${t.symbol}</span>
                    <div>
                      <a className="mono small" href={SOLSCAN.token + t.mint} target="_blank" rel="noreferrer">
                        {short(t.mint)}
                      </a>
                    </div>
                  </td>
                  <td>
                    <Badge tone={statusTone(t.status)}>{t.status}</Badge>
                  </td>
                  <td>{t.campaign ? t.campaign.title : <span className="muted">–</span>}</td>
                  <td>
                    <a className="mono" href={SOLSCAN.account + t.launcherWallet} target="_blank" rel="noreferrer">
                      {short(t.launcherWallet)}
                    </a>
                  </td>
                  <td title={t.createdAt}>{ago(t.createdAt)}</td>
                  <td className="wrap">{t.failureReason ?? <span className="muted">–</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
