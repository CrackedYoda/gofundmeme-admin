import { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { call, DEFAULT_API, loadSession, saveSession, SESSION_EXPIRED, type Session, type SiwsNonce, type SiwsSession } from "./api";
import { short } from "./format";
import { AlertsPage } from "./pages/Alerts";
import { CampaignsPage } from "./pages/Campaigns";
import { JobsPage } from "./pages/Jobs";
import { LaunchesPage } from "./pages/Launches";
import { OverviewPage } from "./pages/Overview";
import { PayoutsPage } from "./pages/Payouts";

const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error("useSession outside a session");
  return s;
}

const PAGES = {
  overview: { label: "Overview", Component: OverviewPage },
  jobs: { label: "Jobs", Component: JobsPage },
  alerts: { label: "Alerts", Component: AlertsPage },
  payouts: { label: "Payouts", Component: PayoutsPage },
  launches: { label: "Launches", Component: LaunchesPage },
  campaigns: { label: "Campaigns", Component: CampaignsPage },
} as const;
type PageId = keyof typeof PAGES;

export function App() {
  const [session, setSession] = useState<Session | null>(loadSession);
  const [page, setPage] = useState<PageId>("overview");
  const client = useQueryClient();
  const { disconnect } = useWallet();

  const signOut = () => {
    saveSession(null);
    client.clear();
    setSession(null);
  };

  useEffect(() => {
    window.addEventListener(SESSION_EXPIRED, signOut);
    return () => window.removeEventListener(SESSION_EXPIRED, signOut);
  });

  if (!session) {
    return (
      <Login
        onLogin={(s) => {
          saveSession(s);
          setSession(s);
        }}
      />
    );
  }

  const { Component } = PAGES[page];
  return (
    <SessionContext.Provider value={session}>
      <header className="top">
        <div className="brand">
          gofundmeme <span>admin</span>
        </div>
        <nav>
          {(Object.keys(PAGES) as PageId[]).map((id) => (
            <button key={id} className={id === page ? "active" : ""} onClick={() => setPage(id)}>
              {PAGES[id].label}
            </button>
          ))}
        </nav>
        <span className="muted small mono">{short(session.wallet)}</span>
        <button
          className="ghost"
          onClick={() => {
            signOut();
            void disconnect();
          }}
        >
          Sign out
        </button>
      </header>
      <main>
        <Component />
      </main>
    </SessionContext.Provider>
  );
}

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

function Login({ onLogin }: { onLogin: (s: Session) => void }) {
  const { wallets, wallet, select, publicKey, signMessage, connecting } = useWallet();
  const [api, setApi] = useState(DEFAULT_API);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const available = wallets.filter((w) => w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable);

  async function signIn() {
    if (!publicKey || !signMessage) return;
    const base = api.trim().replace(/\/$/, "");
    const address = publicKey.toBase58();
    setBusy(true);
    setError(null);
    try {
      // Sign-In With Solana: the backend issues a one-time message, the wallet signs it.
      const n = await call<SiwsNonce>(base, `/auth/nonce?wallet=${address}`);
      const sig = await signMessage(new TextEncoder().encode(n.message));
      const s = await call<SiwsSession>(base, "/auth/verify", { method: "POST", body: JSON.stringify({ wallet: address, nonce: n.nonce, signature: toBase64(sig) }) });
      if (!s.admin) throw new Error("This wallet isn't in the backend's ADMIN_WALLETS.");
      onLogin({ api: base, token: s.token, wallet: s.wallet });
    } catch (err) {
      setError(err instanceof Error ? (/reject/i.test(err.message) ? "Signing was cancelled." : err.message) : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="card">
        <div className="brand">
          gofundmeme <span>admin</span>
        </div>
        <label>
          Backend API
          <input value={api} onChange={(e) => setApi(e.target.value)} placeholder="https://api…/api" />
        </label>
        {!publicKey ? (
          <>
            <div className="label">Connect an admin wallet</div>
            {available.length === 0 && <p className="muted small">No Solana wallet found in this browser. Install Phantom or Solflare, then reload.</p>}
            {available.map((w) => (
              <button key={w.adapter.name} className="wallet" onClick={() => select(w.adapter.name)} disabled={connecting}>
                <img src={w.adapter.icon} alt="" />
                {w.adapter.name}
              </button>
            ))}
          </>
        ) : (
          <>
            <p className="muted small">
              {wallet?.adapter.name} <span className="mono">{short(publicKey.toBase58(), 6, 6)}</span>
            </p>
            <button className="primary" onClick={signIn} disabled={busy || !api.trim()}>
              {busy ? "Check your wallet…" : "Sign in"}
            </button>
            {!signMessage && <p className="error">This wallet can't sign messages.</p>}
          </>
        )}
        {error && <p className="error">{error}</p>}
        <p className="muted small">Signing a message costs nothing. The session is kept for this tab only.</p>
      </div>
    </div>
  );
}
