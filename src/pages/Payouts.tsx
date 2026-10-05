import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { request, type PayoutQueueItem } from "../api";
import { useSession } from "../App";
import { ago, toBaseUnits, usd } from "../format";
import { Badge, QueryState } from "./common";

export function PayoutsPage() {
  const s = useSession();
  const [selected, setSelected] = useState<string | null>(null);
  const queue = useQuery({
    queryKey: ["payouts", s.api],
    queryFn: () => request<{ items: PayoutQueueItem[] }>(s, "/admin/payout-queue").then((r) => r.items),
  });
  const item = queue.data?.find((q) => q.slug === selected) ?? queue.data?.[0] ?? null;

  return (
    <>
      <div className="head">
        <h1>Payouts</h1>
      </div>
      <p className="muted small">Campaigns owed at least the payout threshold, or owed anything for longer than the max age. Donate on GoFundMe, then record it here with the receipt.</p>
      <QueryState error={queue.error} loading={queue.isLoading} empty={queue.data?.length === 0} />
      {!!queue.data?.length && (
        <section className="two wide-left">
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th className="num">Owed</th>
                  <th>Since</th>
                  <th>Why</th>
                </tr>
              </thead>
              <tbody>
                {queue.data.map((q) => (
                  <tr key={q.slug} className={item?.slug === q.slug ? "selected" : ""} onClick={() => setSelected(q.slug)}>
                    <td className="wrap">
                      <a href={q.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                        {q.title}
                      </a>
                      <div className="muted small">{q.status}</div>
                    </td>
                    <td className="num">
                      <strong>{usd(q.owedUsd)}</strong>
                    </td>
                    <td>{ago(q.owedSince)}</td>
                    <td>{q.reason === "threshold" ? <Badge tone="warn">over threshold</Badge> : <Badge tone="bad">waiting too long</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {item && <RecordDonation key={item.slug} item={item} />}
        </section>
      )}
    </>
  );
}

const MONEY = /^\d{1,9}(\.\d{1,2})?$/;

function RecordDonation({ item }: { item: PayoutQueueItem }) {
  const s = useSession();
  const client = useQueryClient();
  const owed = (Number(item.usdcOwed) / 1e6).toFixed(2);
  const [usdcAmount, setUsdcAmount] = useState(owed);
  const [amountDonated, setAmountDonated] = useState(owed);
  const [currency, setCurrency] = useState("USD");
  const [processingFee, setProcessingFee] = useState("0");
  const [offrampFee, setOfframpFee] = useState("0");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);

  const base = toBaseUnits(usdcAmount, 6);
  const errors = {
    usdc: !base || BigInt(base) <= 0n ? "Enter the USDC amount." : BigInt(base) > BigInt(item.usdcOwed) ? `More than the ${owed} USDC owed.` : null,
    amount: MONEY.test(amountDonated) ? null : "Up to 2 decimals.",
    currency: /^[A-Z]{3}$/.test(currency) ? null : "A 3-letter code, like USD.",
    fees: MONEY.test(processingFee) && MONEY.test(offrampFee) ? null : "Fees: up to 2 decimals.",
  };
  const valid = !errors.usdc && !errors.amount && !errors.currency && !errors.fees && !!date && !!receipt;

  const save = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.set("campaign", item.slug);
      form.set("usdcAmount", base!);
      form.set("amountDonated", amountDonated);
      form.set("currency", currency);
      form.set("processingFee", processingFee);
      form.set("offrampFee", offrampFee);
      form.set("donatedAt", new Date(`${date}T12:00:00Z`).toISOString());
      if (reference.trim()) form.set("gofundmeDonationRef", reference.trim());
      if (note.trim()) form.set("note", note.trim());
      form.set("receipt", receipt!);
      return request<{ receiptUrl: string }>(s, "/admin/donations", { method: "POST", body: form });
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["payouts"] });
      void client.invalidateQueries({ queryKey: ["overview"] });
    },
  });

  const field = (label: string, input: ReactNode, err?: string | null) => (
    <label>
      {label}
      {input}
      {err && <span className="error small">{err}</span>}
    </label>
  );
  const decimal = (set: (v: string) => void) => (e: { target: { value: string } }) => set(e.target.value.replace(/[^0-9.]/g, ""));

  function submit(e: FormEvent) {
    e.preventDefault();
    if (valid) save.mutate();
  }

  return (
    <form className="card form" onSubmit={submit}>
      <h2>Record donation</h2>
      <p className="muted small">
        {item.title} · {owed} USDC owed
      </p>
      {field("USDC taken from the owed balance", <input inputMode="decimal" value={usdcAmount} onChange={decimal(setUsdcAmount)} />, errors.usdc)}
      <div className="row">
        {field("Amount donated on GoFundMe", <input inputMode="decimal" value={amountDonated} onChange={decimal(setAmountDonated)} />, errors.amount)}
        {field("Currency", <input maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />, errors.currency)}
      </div>
      <div className="row">
        {field("Processing fee", <input inputMode="decimal" value={processingFee} onChange={decimal(setProcessingFee)} />)}
        {field("Off-ramp fee", <input inputMode="decimal" value={offrampFee} onChange={decimal(setOfframpFee)} />)}
      </div>
      {errors.fees && <span className="error small">{errors.fees}</span>}
      {field("Donation date", <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />)}
      {field("GoFundMe donation reference (optional)", <input maxLength={200} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="From the confirmation email" />)}
      {field("Note (optional)", <input maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />)}
      {field("Receipt (PDF or image, up to 10 MB)", <input type="file" accept="application/pdf,image/png,image/jpeg,image/gif,image/webp" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />)}
      <button className="primary" disabled={!valid || save.isPending}>
        {save.isPending ? "Saving…" : "Save and publish receipt"}
      </button>
      {save.isSuccess && (
        <p className="ok small">
          Receipt published.{" "}
          <a href={save.data.receiptUrl} target="_blank" rel="noreferrer">
            View
          </a>
        </p>
      )}
      {save.error && <p className="error">{(save.error as Error).message}</p>}
      <p className="muted small">Publishing posts the receipt on the campaign page and moves the USDC from owed to donated. The ledger refuses more than what&apos;s owed.</p>
    </form>
  );
}
