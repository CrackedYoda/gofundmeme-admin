import { useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "../api";
import { useSession } from "../App";
import { ago, num, short, sol, SOLSCAN, usd, usdc } from "../format";
import { Badge, QueryState, Stat, useOverview } from "./common";

export function OverviewPage() {
  const s = useSession();
  const client = useQueryClient();
  const overview = useOverview();
  const o = overview.data;

  const killSwitch = useMutation({
    mutationFn: (on: boolean) => request(s, "/admin/kill-switch", { method: "POST", body: JSON.stringify({ on }) }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["overview"] }),
  });

  const staleJobs = o?.jobs.filter((j) => j.stale) ?? [];
  const failingJobs = o?.jobs.filter((j) => j.lastErrorAt && (!j.lastOkAt || j.lastErrorAt > j.lastOkAt)) ?? [];

  return (
    <>
      <div className="head">
        <h1>Overview</h1>
        {o && <span className="muted small">Updated {ago(o.generatedAt)} · refreshes every 30s</span>}
      </div>
      <QueryState error={overview.error} loading={overview.isLoading} />
      {o && (
        <>
          <section className="card status-row">
            {(["api", "mongo", "redis", "worker"] as const).map((k) => (
              <span key={k} className="status">
                <span className={`dot ${o.services[k] ? "ok" : "bad"}`} />
                {k === "api" ? "API" : k === "mongo" ? "MongoDB" : k === "redis" ? "Redis" : "Worker"}
              </span>
            ))}
            <span className="status">
              <span className={`dot ${staleJobs.length || failingJobs.length ? "warn" : "ok"}`} />
              {staleJobs.length || failingJobs.length ? `${staleJobs.length} stale, ${failingJobs.length} failing jobs` : "All jobs on schedule"}
            </span>
            <span className="spacer" />
            {o.killSwitch.on ? (
              <>
                <Badge tone="bad">{o.killSwitch.env ? "Paused by KILL_SWITCH env" : "Launches and sweeps paused"}</Badge>
                {!o.killSwitch.env && (
                  <button onClick={() => killSwitch.mutate(false)} disabled={killSwitch.isPending}>
                    Resume
                  </button>
                )}
              </>
            ) : (
              <>
                <Badge tone="ok">Running</Badge>
                <button
                  className="danger"
                  disabled={killSwitch.isPending}
                  onClick={() => window.confirm("Pause all launches and sweeps?") && killSwitch.mutate(true)}
                >
                  Pause launches
                </button>
              </>
            )}
          </section>
          {killSwitch.error && <p className="error">{(killSwitch.error as Error).message}</p>}

          <h2>Money</h2>
          <section className="grid">
            <Stat label="Donated" value={usd(o.stats.donatedUsd)} sub={usdc(o.money.usdcDonated)} />
            <Stat label="Waiting to be donated" value={usd(o.stats.waitingUsd)} sub={`${usdc(o.money.usdcOwed)} owed · ${sol(o.money.unswappedLamports)} not swapped`} />
            <Stat label="Payouts due" value={num(o.payoutsDue)} sub="over the threshold, or owed too long" tone={o.payoutsDue ? "warn" : undefined} />
            <Stat label="Creator fees swept" value={sol(o.money.claimedLamports)} sub={`${sol(o.money.campaignLamports)} campaigns · ${sol(o.money.platformLamports)} platform`} />
          </section>

          <h2>Health</h2>
          <section className="grid">
            <Stat
              label="Ops wallet gas"
              value={o.ops ? sol(o.ops.lamports) : "–"}
              sub={
                o.ops ? (
                  <>
                    alert below {sol(o.ops.alertLamports)} · checked {ago(o.ops.at)} ·{" "}
                    <a href={SOLSCAN.account + o.ops.address} target="_blank" rel="noreferrer">
                      {short(o.ops.address)}
                    </a>
                  </>
                ) : (
                  "not checked yet (hourly)"
                )
              }
              tone={o.ops?.low ? "bad" : undefined}
            />
            <Stat
              label="Integrity check"
              value={o.checks.integrity ? (o.checks.integrity.ok ? "Passing" : "Mismatch") : "–"}
              sub={o.checks.integrity ? `${o.checks.integrity.detail} · ${ago(o.checks.integrity.at)}` : "not run yet (daily)"}
              tone={o.checks.integrity && !o.checks.integrity.ok ? "bad" : undefined}
            />
            <Stat
              label="Creator check"
              value={o.checks.creator ? (o.checks.creator.ok ? "Passing" : "Problem") : "–"}
              sub={o.checks.creator ? `${o.checks.creator.detail} · ${ago(o.checks.creator.at)}` : "not run yet (daily)"}
              tone={(o.checks.creator && !o.checks.creator.ok) || o.tokens.creatorMismatch ? "bad" : undefined}
            />
            <Stat label="Alerts, last 24h" value={num(o.alerts24h)} tone={o.alerts24h ? "warn" : undefined} />
          </section>

          <h2>Activity</h2>
          <section className="grid">
            <Stat label="Coins live" value={num(o.tokens.live + o.tokens.graduated)} sub={`${num(o.tokens.graduated)} graduated`} />
            <Stat
              label="Launches not live"
              value={num(o.tokens.pending + o.tokens.failed + o.tokens.expired)}
              sub={`${num(o.tokens.pending)} pending · ${num(o.tokens.failed)} failed · ${num(o.tokens.expired)} expired`}
              tone={o.tokens.failed ? "warn" : undefined}
            />
            <Stat label="Campaigns" value={num(o.campaigns.total)} sub={`${num(o.campaigns.verified)} verified · ${num(o.campaigns.blocked)} blocked`} />
            <Stat
              label="Swaps (SOL → USDC)"
              value={num(o.swaps.done)}
              sub={`${num(o.swaps.building + o.swaps.sent)} in flight · ${num(o.swaps.stuck)} stuck · ${num(o.swaps.failed)} failed`}
              tone={o.swaps.stuck || o.swaps.failed ? "bad" : undefined}
            />
          </section>
        </>
      )}
    </>
  );
}
