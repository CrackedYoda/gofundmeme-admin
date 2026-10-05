import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { App } from "./App";
import "./styles.css";

const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

// The panel only asks the wallet to sign a message; this RPC is never used for transactions.
const RPC = "https://api.mainnet-beta.solana.com";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <ConnectionProvider endpoint={RPC}>
        {/* Browser wallets (Phantom, Solflare, Backpack…) register through the Wallet Standard. */}
        <WalletProvider wallets={[]} autoConnect>
          <App />
        </WalletProvider>
      </ConnectionProvider>
    </QueryClientProvider>
  </StrictMode>,
);
