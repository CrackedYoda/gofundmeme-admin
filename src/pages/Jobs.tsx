import { ago, every, num } from "../format";
import { Badge, QueryState, useOverview } from "./common";

export function JobsPage() {
  const overview = useOverview();
  const jobs = overview.data?.jobs ?? [];

  return (
    <>
      <div className="head">
        <h1>Worker jobs</h1>
      </div>
      <p className="muted small">
        Every job the worker runs, from its own heartbeats. A scheduled job is stale when it hasn&apos;t run for two of its intervals.
        Sweeps and swaps run on demand, so they&apos;re never stale.
      </p>
      <QueryState error={overview.error} loading={overview.isLoading} empty={overview.data && jobs.length === 0} />
      {jobs.length > 0 && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Job</th>
                <th>Status</th>
                <th>Every</th>
                <th>Last run</th>
                <th className="num">Took</th>
                <th className="num">Runs</th>
                <th className="num">Failures</th>
                <th>Last error</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => {
                const failing = !!j.lastErrorAt && (!j.lastOkAt || j.lastErrorAt > j.lastOkAt);
                return (
                  <tr key={j.job}>
                    <td className="mono">{j.job}</td>
                    <td>{j.stale ? <Badge tone="bad">stale</Badge> : failing ? <Badge tone="bad">failing</Badge> : j.runs ? <Badge tone="ok">ok</Badge> : <Badge tone="muted">not run</Badge>}</td>
                    <td className="muted">{every(j.intervalSec)}</td>
                    <td>{ago(j.lastRunAt)}</td>
                    <td className="num muted">{j.lastMs === null ? "–" : `${num(j.lastMs)} ms`}</td>
                    <td className="num">{num(j.runs)}</td>
                    <td className="num">{num(j.failures)}</td>
                    <td className="wrap">{j.lastError ? <span className="error">{j.lastError}</span> : <span className="muted">–</span>}{j.lastErrorAt && <span className="muted small"> · {ago(j.lastErrorAt)}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
