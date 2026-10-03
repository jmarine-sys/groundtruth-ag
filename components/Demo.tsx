"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { getAddMemoInstruction } from "@solana-program/memo";
import {
  useConnect,
  useConnectedWallet,
  useDisconnect,
  useWallets,
  WalletReadyGate,
} from "@solana/kit-plugin-wallet/react";
import { useAction, useClient } from "@solana/react";
import type { AppClient } from "@/app/providers";
import { LotMap } from "@/components/LotMap";
import { seedReports } from "@/lib/fixtures";
import { canonicalReport, reportMemo, sha256Hex } from "@/lib/hash";
import type { Report, RoundResult, Signal } from "@/lib/types";

const ZONE = "pergamino";
const CROP = "wheat";

function explorer(signature: string) {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

function short(text: string) {
  return text.length > 10 ? `${text.slice(0, 4)}…${text.slice(-4)}` : text;
}

interface Payout {
  index_sig: string;
  payments: { wallet: string; reward: number; signature: string }[];
}

interface BasisCover {
  paid: boolean;
  valid: number;
  reason?: string;
  payout?: number;
  signature?: string;
}

const noopSubscribe = () => () => {};

export function Demo() {
  const client = useClient<AppClient>();
  // La wallet solo existe en el navegador: en el servidor siempre se renderiza el
  // placeholder y en el cliente el flujo completo. Sin esto, React detecta que el HTML
  // del servidor no coincide con el del navegador (error de hidratación).
  const isBrowser = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  if (!isBrowser) return <p>Loading wallets…</p>;
  return (
    <WalletReadyGate client={client} fallback={<p>Loading wallets…</p>}>
      <Flow client={client} />
    </WalletReadyGate>
  );
}

function Flow({ client }: { client: AppClient }) {
  const wallets = useWallets(client);
  const connected = useConnectedWallet(client);
  const { dispatch: connect } = useConnect(client);
  const { dispatch: disconnect } = useDisconnect(client);

  const seeds = useMemo(() => {
    const list = (process.env.NEXT_PUBLIC_SEED_WALLETS ?? "")
      .split(",")
      .filter(Boolean);
    return list.length === 4 ? seedReports(list) : [];
  }, []);

  const [signal, setSignal] = useState<Signal>("below");
  const [predicted, setPredicted] = useState(70);
  const [note, setNote] = useState("");
  const [mine, setMine] = useState<Report | null>(null);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [payout, setPayout] = useState<Payout | null>(null);
  const [review, setReview] = useState<BasisCover | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<"informant" | "operator">("informant");
  const [error, setError] = useState<string | null>(null);

  // Paso 2: el informante firma con Phantom un memo con el hash de su reporte.
  const submit = useAction(async (signal_: AbortSignal, report: Report) => {
    const hash = await sha256Hex(canonicalReport(report));
    const sent = await client.sendTransaction(
      [getAddMemoInstruction({ memo: reportMemo(hash) })],
      {
        abortSignal: signal_,
      },
    );
    const signed = { ...report, memo_sig: sent.context.signature };
    setMine(signed);
    return signed;
  });

  const reports = mine ? [...seeds, mine] : seeds;

  async function post<T>(
    path: string,
    body: unknown,
    label: string,
  ): Promise<T | null> {
    setBusy(label);
    setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? res.statusText);
      return json as T;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <div
        role="tablist"
        className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800"
      >
        <TabButton
          active={tab === "informant"}
          onClick={() => setTab("informant")}
        >
          Informant · agronomist
        </TabButton>
        <TabButton
          active={tab === "operator"}
          onClick={() => setTab("operator")}
        >
          Insurer / operator
        </TabButton>
      </div>

      {tab === "informant" ? (
        <>
          <RoleHeader
            role="Informant view"
            who="Agronomist in the field"
            what="Connects a wallet, reports what they see and signs. That is all an informant does."
          />

          <Step n={1} title="Connect your wallet (devnet)">
            {connected ? (
              <div className="flex items-center gap-3">
                <code className="text-sm">
                  {short(connected.account.address)}
                </code>
                <button className="btn-secondary" onClick={() => disconnect()}>
                  Disconnect
                </button>
              </div>
            ) : wallets.length ? (
              <div className="flex flex-wrap gap-2">
                {wallets.map((w) => (
                  <button
                    key={w.name}
                    className="btn"
                    onClick={() => connect(w)}
                  >
                    Connect {w.name}
                  </button>
                ))}
              </div>
            ) : (
              <p>No wallet found. Install Phantom and switch it to Devnet.</p>
            )}
          </Step>

          <Step n={2} title={`Report crop condition · ${CROP}, Pergamino`}>
            <div className="space-y-3">
              <LotMap />
              <div className="flex gap-4">
                {(["below", "normal"] as const).map((s) => (
                  <label key={s} className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={signal === s}
                      onChange={() => setSignal(s)}
                    />
                    {s === "below" ? "Below normal" : "Normal"}
                  </label>
                ))}
              </div>
              <label className="block">
                Your guess: out of 10 agronomists in this zone, how many will
                answer “below normal”? <b>{Math.round(predicted / 10)} of 10</b>
                <span className="block text-xs text-neutral-500">
                  Nobody knows the exact number. Answer what you honestly
                  expect: the payout rewards honest reports and good guesses, so
                  exaggerating does not pay.
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={10}
                  value={predicted}
                  onChange={(e) => setPredicted(Number(e.target.value))}
                  className="w-full"
                />
              </label>
              <textarea
                className="w-full rounded border p-2"
                rows={2}
                placeholder="What do you see in the field?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <button
                className="btn"
                disabled={!connected || submit.isRunning || !note.trim()}
                onClick={() =>
                  submit.dispatch({
                    zone: ZONE,
                    crop: CROP,
                    wallet: connected!.account.address,
                    signal,
                    predicted_pct: predicted,
                    note: note.trim(),
                    ts: new Date().toISOString(),
                  })
                }
              >
                {submit.isRunning
                  ? "Waiting for signature…"
                  : "Sign and register on Solana"}
              </button>
              {submit.error ? (
                <p className="text-red-600">{String(submit.error)}</p>
              ) : null}
              {mine?.memo_sig ? (
                <p>
                  Report hash registered on-chain:{" "}
                  <a
                    className="link"
                    href={explorer(mine.memo_sig)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    view transaction
                  </a>
                </p>
              ) : null}
            </div>
          </Step>

          {mine?.memo_sig ? (
            <p className="text-sm">
              Done. Your report is in this round.{" "}
              <button className="link" onClick={() => setTab("operator")}>
                See the round as the insurer →
              </button>
            </p>
          ) : null}
        </>
      ) : (
        <>
          <RoleHeader
            role="Insurer / operator view"
            who="Insurance company or cooperative"
            what={`Round for ${CROP} in Pergamino closes every Monday at 12:00 (Argentina). Nobody picks the moment: in production it closes on its deadline. In this demo it is closed manually.`}
          />

          <Step n={1} title={`Round panel · ${reports.length} reports`}>
            {seeds.length === 0 ? (
              <p className="text-red-600">
                Missing NEXT_PUBLIC_SEED_WALLETS: run the devnet setup script.
              </p>
            ) : null}
            <ul className="space-y-1 text-sm">
              {reports.map((r) => (
                <li key={r.wallet}>
                  <code>{short(r.wallet)}</code> ·{" "}
                  {r.signal === "below" ? "below normal" : "normal"} · predicts{" "}
                  {r.predicted_pct}% · “{r.note}”{" "}
                  {r.synthetic ? (
                    <em className="text-neutral-500">(pre-loaded)</em>
                  ) : (
                    <b>(you)</b>
                  )}
                </li>
              ))}
            </ul>
            <button
              className="btn mt-3"
              disabled={!!busy || reports.length < 3}
              onClick={async () => {
                setPayout(null);
                setReview(null);
                const r = await post<RoundResult>(
                  "/api/round/close",
                  { zone: ZONE, reports },
                  "close",
                );
                if (r) setResult(r);
              }}
            >
              {busy === "close" ? "Closing round…" : "Close round now (demo)"}
            </button>
            <p className="mt-1 text-xs text-neutral-500">
              Closing the round shows the index, the flagged reports and the
              payouts below.
            </p>
          </Step>

          {result ? (
            <Step n={2} title="Index">
              <div className="grid grid-cols-2 gap-3">
                <Stat
                  label="Weather index (Open-Meteo)"
                  value={
                    result.satellite_status === "below" ? "Drought" : "Normal"
                  }
                />
                <Stat
                  label="Field panel"
                  value={result.panel_status === "below" ? "Drought" : "Normal"}
                />
              </div>
              {result.divergence ? (
                <p className="mt-3 rounded bg-red-100 p-3 font-medium text-red-900">
                  Basis risk detected: the weather index and the field panel
                  disagree.
                </p>
              ) : null}
              <p className="mt-3">
                Index <b>{result.index}</b> · rain{" "}
                {result.weather.precip_30d_mm} mm in 30 days vs{" "}
                {result.weather.baseline_30d_mm} mm 5-year average (
                {result.weather.source})
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Demo proxy: rainfall and soil moisture from weather models, not
                satellite imagery. In production the panel audits the
                insurer&apos;s own satellite index for the same grid cell.
              </p>
              <p className="mt-2 text-neutral-700 dark:text-neutral-300">
                {result.explanation}
              </p>
              {result.flags.map((f) => (
                <p key={f.wallet} className="mt-2 text-amber-800">
                  ⚠ <code>{short(f.wallet)}</code> flagged: {f.reason}
                </p>
              ))}
              <p className="mt-1 text-xs text-neutral-500">
                Review by {result.model}
              </p>

              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th>Informant</th>
                    <th>Score</th>
                    <th>Reward (USDC)</th>
                  </tr>
                </thead>
                <tbody>
                  {result.scores.map((s) => (
                    <tr key={s.wallet}>
                      <td>
                        <code>{short(s.wallet)}</code>
                      </td>
                      <td>{s.score}</td>
                      <td>{s.reward}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="btn"
                  disabled={!!busy || !!payout}
                  onClick={async () => {
                    const p = await post<Payout>(
                      "/api/payout",
                      { result },
                      "payout",
                    );
                    if (p) setPayout(p);
                  }}
                >
                  {busy === "payout"
                    ? "Paying informants…"
                    : "Publish index and pay informants"}
                </button>
                <button
                  className="btn"
                  disabled={!!busy || !payout || !!review}
                  onClick={async () => {
                    const p = await post<BasisCover>(
                      "/api/basis-cover",
                      { result },
                      "review",
                    );
                    if (p) setReview(p);
                  }}
                >
                  {busy === "review"
                    ? "Checking cover…"
                    : "Settle basis-risk cover"}
                </button>
              </div>

              {payout ? (
                <ul className="mt-3 space-y-1 text-sm">
                  <li>
                    Index published:{" "}
                    <a
                      className="link"
                      href={explorer(payout.index_sig)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      memo transaction
                    </a>
                  </li>
                  {payout.payments.map((p) => (
                    <li key={p.signature}>
                      {p.reward} USDC → <code>{short(p.wallet)}</code> ·{" "}
                      <a
                        className="link"
                        href={explorer(p.signature)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        transaction
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
              {review ? (
                <div
                  className={`mt-3 rounded p-3 ${
                    review.paid
                      ? "bg-green-100 text-green-900"
                      : "bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                  }`}
                >
                  {review.paid ? (
                    <>
                      <p className="font-medium">
                        Basis-risk cover paid {review.payout} USDC to the insured
                        farmer.
                      </p>
                      <p className="mt-1 text-sm">
                        The weather index alone would not pay, but {review.valid}{" "}
                        valid field reports confirmed drought in this cell. This
                        cover pays exactly the case the satellite index misses.{" "}
                        <a
                          className="link"
                          href={explorer(review.signature!)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Payout transaction
                        </a>
                      </p>
                    </>
                  ) : (
                    <p>Basis-risk cover not triggered: {review.reason}</p>
                  )}
                </div>
              ) : null}
            </Step>
          ) : null}
        </>
      )}

      {error ? <p className="text-red-600">{error}</p> : null}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
        active
          ? "border-green-700 text-green-700"
          : "border-transparent text-neutral-500 hover:text-neutral-800"
      }`}
    >
      {children}
    </button>
  );
}

function RoleHeader({
  role,
  who,
  what,
}: {
  role: string;
  who: string;
  what: string;
}) {
  return (
    <div className="border-l-4 border-green-700 pl-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-green-700">
        {role}
      </div>
      <div className="font-medium">{who}</div>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{what}</p>
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="mb-3 font-semibold">
        {n}. {title}
      </h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
