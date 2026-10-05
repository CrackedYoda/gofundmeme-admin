import { useQuery } from "@tanstack/react-query";
import { request, type AdminAlert } from "../api";
import { useSession } from "../App";
import { ago } from "../format";
import { Badge, QueryState } from "./common";

const TONE: Record<string, "bad" | "warn"> = { integrity: "bad", "creator-changed": "bad", "ops-gas": "bad", "job-failed": "warn" };

export function AlertsPage() {
  const s = useSession();
  const alerts = useQuery({
    queryKey: ["alerts", s.api],
    queryFn: () => request<{ items: AdminAlert[] }>(s, "/admin/alerts?limit=200").then((r) => r.items),
    refetchInterval: 30_000,
  });

  return (
    <>
      <div className="head">
        <h1>Alerts</h1>
      </div>
      <p className="muted small">The same alerts the worker sends to Telegram, newest first (the last 200).</p>
      <QueryState error={alerts.error} loading={alerts.isLoading} empty={alerts.data?.length === 0} />
      {!!alerts.data?.length && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Kind</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {alerts.data.map((a, i) => (
                <tr key={`${a.at}-${i}`}>
                  <td title={a.at}>{ago(a.at)}</td>
                  <td>
                    <Badge tone={TONE[a.kind] ?? "warn"}>{a.kind}</Badge>
                  </td>
                  <td className="wrap">{a.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
