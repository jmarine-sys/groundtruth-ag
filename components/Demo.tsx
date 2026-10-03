"use client";

import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
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
import {
  IconAlert,
  IconBuilding,
  IconCheck,
  IconClock,
  IconDrop,
  IconExternal,
  IconShield,
  IconSprout,
  IconSun,
  IconUsers,
  IconWallet,
} from "@/components/icons";
import { LotMap } from "@/components/LotMap";
import { seedReports } from "@/lib/fixtures";
import { canonicalReport, reportMemo, sha256Hex } from "@/lib/hash";
import type { Report, RoundResult, Signal } from "@/lib/types";

const ZONE = "pergamino";
const CROP = "wheat";
/** Umbral del índice que muestra la barra (la cobertura decide por divergencia + panel válido). */
const THRESHOLD = 0.5;

function explorer(signature: string) {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

function short(text: string) {
  return text.length > 10 ? `${text.slice(0, 4)}…${text.slice(-4)}` : text;
}

/** Color estable por wallet para los avatares del panel. */
function hue(wallet: string) {
  let h = 0;
  for (const c of wallet) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
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
  const loading = <div className="card p-8 text-center text-sm text-neutral-500">Loading wallets…</div>;
  if (!isBrowser) return loading;
  return (
    <WalletReadyGate client={client} fallback={loading}>
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

  // El informante firma con Phantom un memo con el hash de su reporte.
  const submit = useAction(async (signal_: AbortSignal, report: Report) => {
    const hash = await sha256Hex(canonicalReport(report));
    const sent = await client.sendTransaction(
      [getAddMemoInstruction({ memo: reportMemo(hash) })],
      { abortSignal: signal_ },
    );
    const signed = { ...report, memo_sig: sent.context.signature };
    setMine(signed);
    return signed;
  });

  const reports = mine ? [...seeds, mine] : seeds;

  async function post<T>(path: string, body: unknown, label: string): Promise<T | null> {
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
    <div className="space-y-6">
      {/* Barra de rol + wallet */}
      <div className="card flex flex-col gap-3 p-2 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" className="grid grid-cols-2 gap-1 rounded-xl bg-neutral-100 p-1 sm:w-[28rem]">
          <RoleTab active={tab === "informant"} onClick={() => setTab("informant")} icon={<IconSprout className="h-4 w-4" />}>
            Agronomist
          </RoleTab>
          <RoleTab active={tab === "operator"} onClick={() => setTab("operator")} icon={<IconBuilding className="h-4 w-4" />}>
            Insurer / operator
          </RoleTab>
        </div>
        <div className="flex items-center justify-end gap-2 px-2">
          {connected ? (
            <>
              <span className="chip bg-brand-50 text-brand-700">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                {short(connected.account.address)}
              </span>
              <button className="btn-ghost" onClick={() => disconnect()}>
                Disconnect
              </button>
            </>
          ) : wallets.length ? (
            wallets.map((w) => (
              <button key={w.name} className="btn" onClick={() => connect(w)}>
                <IconWallet className="h-4 w-4" />
                Connect {w.name}
              </button>
            ))
          ) : (
            <span className="text-sm text-neutral-500">Install Phantom and switch it to Devnet</span>
          )}
        </div>
      </div>

      {tab === "informant" ? (
        <>
          <RoleIntro
            icon={<IconSprout />}
            eyebrow="Informant view"
            title="Report what you see in your lot"
            text="You connect your wallet, report the crop condition and sign. Your report is registered on Solana with a timestamp. That is all an informant does."
          />

          <div className="grid gap-6 lg:grid-cols-5">
            <div className="card overflow-hidden lg:col-span-2">
              <div className="p-5 pb-3">
                <p className="eyebrow text-neutral-500">Your registered lot</p>
                <p className="mt-1 font-semibold">Wheat · 120 ha · Pergamino, Buenos Aires</p>
              </div>
              <div className="px-5 pb-5">
                <LotMap />
              </div>
            </div>

            <div className="card p-5 lg:col-span-3">
              <p className="eyebrow text-neutral-500">This week&apos;s report</p>
              <h2 className="mt-1 text-lg font-semibold">How does the wheat look in your lot?</h2>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <SignalOption
                  active={signal === "below"}
                  onClick={() => setSignal("below")}
                  icon={<IconSun className="h-6 w-6" />}
                  title="Below normal"
                  text="Water stress, poor growth"
                  tone="soil"
                />
                <SignalOption
                  active={signal === "normal"}
                  onClick={() => setSignal("normal")}
                  icon={<IconDrop className="h-6 w-6" />}
                  title="Normal"
                  text="Crop looks as expected"
                  tone="brand"
                />
              </div>

              <div className="mt-6">
                <div className="flex items-baseline justify-between gap-4">
                  <label htmlFor="guess" className="text-sm font-medium">
                    Out of 10 agronomists in this zone, how many will say “below normal”?
                  </label>
                  <span className="whitespace-nowrap text-2xl font-semibold text-brand-700">
                    {Math.round(predicted / 10)}
                    <span className="text-sm font-normal text-neutral-500"> / 10</span>
                  </span>
                </div>
                <div className="mt-3 flex gap-1.5" aria-hidden>
                  {Array.from({ length: 10 }, (_, i) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 rounded-full transition ${
                        i < Math.round(predicted / 10) ? "bg-soil-500" : "bg-neutral-200"
                      }`}
                    />
                  ))}
                </div>
                <input
                  id="guess"
                  type="range"
                  min={0}
                  max={100}
                  step={10}
                  value={predicted}
                  onChange={(e) => setPredicted(Number(e.target.value))}
                  className="mt-2 w-full accent-brand-600"
                />
                <p className="text-xs text-neutral-500">
                  Nobody knows the exact number: answer what you honestly expect. Rewards favour honest reports and good
                  guesses, so exaggerating does not pay.
                </p>
              </div>

              <div className="mt-5">
                <label htmlFor="note" className="text-sm font-medium">
                  What do you see in the field?
                </label>
                <textarea
                  id="note"
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white p-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  rows={3}
                  placeholder="e.g. Rolled leaves on upland lots, soil dry at 10 cm"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
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
                  <IconShield className="h-4 w-4" />
                  {submit.isRunning ? "Waiting for signature…" : "Sign and register on Solana"}
                </button>
                {!connected ? <span className="text-xs text-neutral-500">Connect your wallet first</span> : null}
              </div>
              {submit.error ? <ErrorBox>{String(submit.error)}</ErrorBox> : null}
            </div>
          </div>

          {mine?.memo_sig ? (
            <div className="card flex flex-col gap-3 border-brand-200 bg-brand-50/80 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-brand-600 p-1.5 text-white">
                  <IconCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-brand-900">Report registered on Solana</p>
                  <p className="text-sm text-brand-700">
                    Only its fingerprint (hash) is on-chain, with your signature and the time.{" "}
                    <ExplorerLink signature={mine.memo_sig}>View transaction</ExplorerLink>
                  </p>
                </div>
              </div>
              <button className="btn" onClick={() => setTab("operator")}>
                See the round as the insurer →
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <RoleIntro
            icon={<IconBuilding />}
            eyebrow="Insurer / operator view"
            title="Weekly round · wheat · Pergamino"
            text="The round closes on a fixed deadline, so nobody chooses the moment. The panel is compared with the weather index for the same grid cell."
          />

          <div className="card p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <IconUsers className="h-5 w-5 text-neutral-500" />
                <h2 className="font-semibold">Field panel · {reports.length} reports</h2>
              </div>
              <span className="chip bg-neutral-100 text-neutral-600">
                <IconClock className="h-3.5 w-3.5" />
                Closes Monday 12:00 ART · demo: closed manually
              </span>
            </div>

            {seeds.length === 0 ? (
              <ErrorBox>Missing NEXT_PUBLIC_SEED_WALLETS: check the shared .env file.</ErrorBox>
            ) : null}

            <ul className="mt-4 divide-y divide-black/5">
              {reports.map((r) => {
                const flag = result?.flags.find((f) => f.wallet === r.wallet);
                return (
                  <li key={r.wallet} className="flex items-start gap-3 py-3">
                    <div
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                      style={{ background: `hsl(${hue(r.wallet)} 35% 45%)` }}
                    >
                      {r.wallet.slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="text-sm">{short(r.wallet)}</code>
                        <SignalChip signal={r.signal} />
                        <span className="text-xs text-neutral-500">expects {r.predicted_pct}% to say below</span>
                        {r.synthetic ? (
                          <span className="chip bg-neutral-100 text-neutral-500">pre-loaded</span>
                        ) : (
                          <span className="chip bg-brand-600 text-white">you</span>
                        )}
                        {flag ? <span className="chip bg-red-100 text-red-700">flagged</span> : null}
                      </div>
                      <p className={`mt-1 text-sm ${flag ? "text-neutral-400 line-through" : "text-neutral-700"}`}>
                        “{r.note}”
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button
                className="btn"
                disabled={!!busy || reports.length < 3}
                onClick={async () => {
                  setPayout(null);
                  setReview(null);
                  const r = await post<RoundResult>("/api/round/close", { zone: ZONE, reports }, "close");
                  if (r) setResult(r);
                }}
              >
                {busy === "close" ? "Closing round…" : "Close round now (demo)"}
              </button>
              <span className="text-xs text-neutral-500">Shows the index, flagged reports and payouts.</span>
            </div>
          </div>

          {result ? <Results result={result} payout={payout} review={review} busy={busy} onPay={async () => {
            const p = await post<Payout>("/api/payout", { result }, "payout");
            if (p) setPayout(p);
          }} onCover={async () => {
            const p = await post<BasisCover>("/api/basis-cover", { result }, "review");
            if (p) setReview(p);
          }} /> : null}
        </>
      )}

      {error ? <ErrorBox>{error}</ErrorBox> : null}
    </div>
  );
}

function Results({
  result,
  payout,
  review,
  busy,
  onPay,
  onCover,
}: {
  result: RoundResult;
  payout: Payout | null;
  review: BasisCover | null;
  busy: string | null;
  onPay: () => void;
  onCover: () => void;
}) {
  const weatherDry = result.satellite_status === "below";
  const panelDry = result.panel_status === "below";
  return (
    <div className="space-y-6">
      {/* Clima vs panel */}
      <div className="grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
        <Verdict
          label="Weather index (Open-Meteo)"
          dry={weatherDry}
          detail={`${result.weather.precip_30d_mm} mm of rain in 30 days vs ${result.weather.baseline_30d_mm} mm 5-year average`}
          icon={<IconDrop className="h-5 w-5" />}
        />
        <div className="flex items-center justify-center">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full text-xl font-semibold ${
              result.divergence ? "bg-red-100 text-red-600" : "bg-brand-100 text-brand-700"
            }`}
          >
            {result.divergence ? "≠" : "="}
          </div>
        </div>
        <Verdict
          label="Field panel"
          dry={panelDry}
          detail={result.explanation.split(". ")[0] + "."}
          icon={<IconUsers className="h-5 w-5" />}
        />
      </div>

      {result.divergence ? (
        <div className="card flex items-start gap-3 border-red-200 bg-red-50 p-5">
          <IconAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold text-red-900">Basis risk detected</p>
            <p className="text-sm text-red-800">
              The weather index and the field panel disagree for this grid cell. This is the case a satellite-only policy
              would miss.
            </p>
          </div>
        </div>
      ) : null}

      {/* Índice */}
      <div className="card p-5">
        <div className="flex items-baseline justify-between">
          <p className="eyebrow text-neutral-500">Stress index</p>
          <p className="text-3xl font-semibold">{result.index.toFixed(2)}</p>
        </div>
        <div className="relative mt-3 h-3 rounded-full bg-gradient-to-r from-brand-200 via-soil-100 to-soil-500">
          <div
            className="absolute -top-1 h-5 w-1.5 rounded-full bg-neutral-900 shadow"
            style={{ left: `calc(${Math.min(1, result.index) * 100}% - 3px)` }}
          />
          <div className="absolute -top-2 h-7 border-l-2 border-dashed border-neutral-400" style={{ left: `${THRESHOLD * 100}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-xs text-neutral-500">
          <span>0 · no stress</span>
          <span>threshold {THRESHOLD}</span>
          <span>1 · severe</span>
        </div>
        <p className="mt-4 text-sm text-neutral-700">{result.explanation}</p>
        <p className="mt-2 text-xs text-neutral-500">
          Fixed formula: 50% weather stress + 50% valid panel consensus. Demo proxy: weather models, not satellite imagery;
          in production the panel audits the insurer&apos;s own satellite index. Review by {result.model}.
        </p>

        {result.flags.map((f) => (
          <div key={f.wallet} className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800">
            <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <code>{short(f.wallet)}</code> excluded: {f.reason}
            </span>
          </div>
        ))}
      </div>

      {/* Puntajes */}
      <div className="card overflow-hidden">
        <div className="p-5 pb-2">
          <p className="eyebrow text-neutral-500">Informant rewards</p>
          <p className="text-sm text-neutral-600">Paid for consistency with the panel, not for the outcome.</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-5 py-2 font-medium">Informant</th>
              <th className="px-5 py-2 font-medium">Score</th>
              <th className="px-5 py-2 font-medium">Reward</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {result.scores.map((s) => {
              const max = Math.max(...result.scores.map((x) => x.reward), 0.0001);
              return (
                <tr key={s.wallet}>
                  <td className="px-5 py-2.5">
                    <code>{short(s.wallet)}</code>
                  </td>
                  <td className="px-5 py-2.5 tabular-nums">{s.score.toFixed(2)}</td>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-24 rounded-full bg-neutral-100">
                        <div className="h-2 rounded-full bg-brand-500" style={{ width: `${(s.reward / max) * 100}%` }} />
                      </div>
                      <span className="tabular-nums">{s.reward} SOL</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Liquidación */}
      <div className="card p-5">
        <p className="eyebrow text-neutral-500">Settlement on Solana</p>
        <ol className="mt-4 space-y-4">
          <SettleStep
            n={1}
            done={!!payout}
            title="Publish the index and pay informants"
            text="One transaction: the index fingerprint plus every reward."
            action={
              <button className="btn" disabled={!!busy || !!payout} onClick={onPay}>
                {busy === "payout" ? "Paying…" : payout ? "Done" : "Publish & pay"}
              </button>
            }
          >
            {payout ? (
              <p className="text-sm text-neutral-600">
                {payout.payments.length} informants paid ·{" "}
                <ExplorerLink signature={payout.index_sig}>View transaction</ExplorerLink>
              </p>
            ) : null}
          </SettleStep>
          <SettleStep
            n={2}
            done={!!review?.paid}
            title="Settle the basis-risk cover"
            text="Pays the insured farmer when the weather index says normal and at least 3 valid reports confirm drought."
            action={
              <button className="btn" disabled={!!busy || !payout || !!review} onClick={onCover}>
                {busy === "review" ? "Checking…" : review ? "Done" : "Settle cover"}
              </button>
            }
          >
            {review ? (
              review.paid ? (
                <p className="text-sm text-neutral-600">
                  Paid {review.payout} SOL to the insured farmer · {review.valid} valid reports ·{" "}
                  <ExplorerLink signature={review.signature!}>View transaction</ExplorerLink>
                </p>
              ) : (
                <p className="text-sm text-neutral-600">Not triggered: {review.reason}</p>
              )
            ) : null}
          </SettleStep>
        </ol>
      </div>
    </div>
  );
}

function RoleTab({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
        active ? "bg-white text-brand-700 shadow-sm" : "text-neutral-500 hover:text-neutral-800"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function RoleIntro({ icon, eyebrow, title, text }: { icon: ReactNode; eyebrow: string; title: string; text: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="rounded-2xl bg-brand-600 p-3 text-white shadow-sm">{icon}</div>
      <div>
        <p className="eyebrow text-brand-600">{eyebrow}</p>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">{text}</p>
      </div>
    </div>
  );
}

function SignalOption({
  active,
  onClick,
  icon,
  title,
  text,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  text: string;
  tone: "soil" | "brand";
}) {
  const on = tone === "soil" ? "border-soil-500 bg-soil-50 text-soil-700" : "border-brand-500 bg-brand-50 text-brand-700";
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-xl border-2 p-4 text-left transition ${
        active ? on : "border-black/10 bg-white text-neutral-600 hover:border-black/20"
      }`}
    >
      {icon}
      <div className="mt-2 font-semibold">{title}</div>
      <div className="text-xs opacity-80">{text}</div>
    </button>
  );
}

function SignalChip({ signal }: { signal: Signal }) {
  return signal === "below" ? (
    <span className="chip bg-soil-100 text-soil-700">below normal</span>
  ) : (
    <span className="chip bg-brand-100 text-brand-700">normal</span>
  );
}

function Verdict({ label, dry, detail, icon }: { label: string; dry: boolean; detail: string; icon: ReactNode }) {
  return (
    <div className={`card p-5 ${dry ? "border-soil-500/30 bg-soil-50" : "border-brand-200 bg-brand-50"}`}>
      <div className={`flex items-center gap-2 text-sm font-medium ${dry ? "text-soil-700" : "text-brand-700"}`}>
        {icon}
        {label}
      </div>
      <div className={`mt-2 text-3xl font-semibold ${dry ? "text-soil-700" : "text-brand-700"}`}>
        {dry ? "Drought" : "Normal"}
      </div>
      <p className="mt-1 text-sm text-neutral-600">{detail}</p>
    </div>
  );
}

function SettleStep({
  n,
  done,
  title,
  text,
  action,
  children,
}: {
  n: number;
  done: boolean;
  title: string;
  text: string;
  action: ReactNode;
  children?: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
            done ? "bg-brand-600 text-white" : "bg-neutral-100 text-neutral-600"
          }`}
        >
          {done ? <IconCheck className="h-4 w-4" /> : n}
        </div>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-neutral-500">{text}</p>
          {children}
        </div>
      </div>
      <div className="shrink-0 pl-10 sm:pl-0">{action}</div>
    </li>
  );
}

function ExplorerLink({ signature, children }: { signature: string; children: ReactNode }) {
  return (
    <a className="link inline-flex items-center gap-1" href={explorer(signature)} target="_blank" rel="noreferrer">
      {children}
      <IconExternal className="h-3.5 w-3.5" />
    </a>
  );
}

function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
