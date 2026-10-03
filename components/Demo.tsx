"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { address } from "@solana/kit";
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
  IconArrowRight,
  IconBuilding,
  IconCheck,
  IconClock,
  IconDrop,
  IconEqual,
  IconExternal,
  IconNotEqual,
  IconRefresh,
  IconShield,
  IconSprout,
  IconSun,
  IconUsers,
  IconWallet,
} from "@/components/icons";
import { LotMap } from "@/components/LotMap";
import { seedReports } from "@/lib/fixtures";
import { canonicalReport, reportMemo, sha256Hex } from "@/lib/hash";
import { ROUND_POOL_SOL } from "@/lib/payment";
import type { Report, RoundResult, Signal } from "@/lib/types";

const ZONE = "pergamino";
const CROP = "wheat";
/** Misma regla que app/api/basis-cover/route.ts: reportes válidos mínimos para que pague la cobertura. */
const MIN_VALID = 3;

type Tab = "agronomist" | "insurer";
type Busy = "close" | "payout" | "cover";

function explorer(signature: string) {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

function short(text: string) {
  return text.length > 10 ? `${text.slice(0, 4)}…${text.slice(-4)}` : text;
}

/** Color estable por wallet para los avatares del panel (oscuro para que el texto blanco contraste). */
function hue(wallet: string) {
  let h = 0;
  for (const c of wallet) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

/** Mensajes de error en lenguaje del usuario, con el detalle técnico al final. */
function friendly(message: string) {
  if (/reject|denied|cancel/i.test(message)) return "Signature cancelled in your wallet. Nothing was sent.";
  if (/429|rate limit/i.test(message))
    return "The public Solana devnet node is busy. Wait a few seconds and try again.";
  return message;
}

interface Payout {
  index_sig: string;
  payments: { wallet: string; reward: number; signature: string }[];
}

/** Lo que cobró en esta ronda la wallet conectada (el agrónomo que muestra la demo). */
interface Earning {
  reward: number;
  signature: string;
  before: number | null;
  after: number | null;
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
  const loading = <div className="card p-8 text-center text-sm text-neutral-600">Loading wallets…</div>;
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
  const [cover, setCover] = useState<BasisCover | null>(null);
  const [busy, setBusy] = useState<Busy | null>(null);
  const [tab, setTab] = useState<Tab>("agronomist");
  const [error, setError] = useState<{ at: Busy; message: string } | null>(null);
  const resultsRef = useRef<HTMLHeadingElement>(null);
  const me = connected?.account.address ?? null;
  const [balance, setBalance] = useState<number | null>(null);
  const [earning, setEarning] = useState<Earning | null>(null);

  // Saldo de la wallet conectada en devnet, para ver en pantalla lo que cobra el agrónomo.
  const refreshBalance = useCallback(async (): Promise<number | null> => {
    if (!me) return null;
    const { value } = await client.rpc.getBalance(address(me), { commitment: "confirmed" }).send();
    const sol = Number(value) / 1e9;
    setBalance(sol);
    return sol;
  }, [client, me]);

  useEffect(() => {
    if (!me) return;
    let stale = false;
    client.rpc
      .getBalance(address(me), { commitment: "confirmed" })
      .send()
      .then(({ value }) => {
        if (!stale) setBalance(Number(value) / 1e9);
      })
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [client, me]);

  // La agrónoma firma con Phantom un memo con el hash de su reporte.
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

  // Al cerrar la ronda, el resultado aparece debajo: llevar la vista y el foco ahí.
  useEffect(() => {
    if (!result) return;
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    resultsRef.current?.focus({ preventScroll: true });
  }, [result]);

  async function post<T>(path: string, body: unknown, label: Busy): Promise<T | null> {
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
      setError({ at: label, message: friendly((e as Error).message) });
      return null;
    } finally {
      setBusy(null);
    }
  }

  function newRound() {
    setResult(null);
    setPayout(null);
    setCover(null);
    setMine(null);
    setEarning(null);
    setNote("");
    setError(null);
    setTab("agronomist");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onTabKey(e: KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      const next: Tab = tab === "agronomist" ? "insurer" : "agronomist";
      setTab(next);
      document.getElementById(`tab-${next}`)?.focus();
    }
  }

  const status =
    busy === "close"
      ? "Closing the round"
      : busy === "payout"
        ? "Paying agronomists on Solana"
        : busy === "cover"
          ? "Checking the basis-risk cover"
          : cover?.paid
            ? `Cover paid ${cover.payout} SOL to the insured farmer`
            : payout
              ? `${payout.payments.length} agronomists paid`
              : result
                ? `Round closed. ${result.divergence ? "Basis risk detected." : "No basis risk."}`
                : mine?.memo_sig
                  ? "Report registered on Solana"
                  : "";

  return (
    <div className="space-y-6">
      <p className="sr-only" aria-live="polite">
        {status}
      </p>

      {/* Barra de rol + wallet */}
      <div className="card flex flex-col gap-3 p-2 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Choose a role"
          onKeyDown={onTabKey}
          className="grid grid-cols-2 gap-1 rounded-xl bg-neutral-100 p-1 sm:w-[26rem]"
        >
          <RoleTab id="agronomist" active={tab === "agronomist"} onClick={() => setTab("agronomist")} icon={<IconSprout className="h-4 w-4" />}>
            Agronomist
          </RoleTab>
          <RoleTab id="insurer" active={tab === "insurer"} onClick={() => setTab("insurer")} icon={<IconBuilding className="h-4 w-4" />}>
            Insurer
          </RoleTab>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 px-2">
          {connected ? (
            <>
              <span className="chip bg-brand-50 text-brand-700">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                {short(connected.account.address)}
                {balance !== null ? <span className="tabular-nums font-semibold">· {balance.toFixed(4)} SOL</span> : null}
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
            <span className="text-sm text-neutral-600">
              <a className="link" href="https://phantom.com/download" target="_blank" rel="noreferrer">
                Install Phantom
              </a>{" "}
              and switch it to Devnet
            </span>
          )}
        </div>
      </div>

      {tab === "agronomist" ? (
        <section role="tabpanel" id="panel-agronomist" aria-labelledby="tab-agronomist" className="space-y-6">
          <RoleIntro
            icon={<IconSprout />}
            title="Report what you see in your lot"
            text={`Connect your wallet, report the crop condition and sign. Your report is registered on Solana with a timestamp. When the round closes, ${ROUND_POOL_SOL} SOL is shared among the valid reports and paid to your wallet.`}
          />

          <div className="grid gap-6 lg:grid-cols-5">
            <div className="card overflow-hidden p-5 lg:col-span-2">
              <h3 className="font-semibold">Your registered lot</h3>
              <p className="mb-3 text-sm text-neutral-600">Wheat · 120 ha · Pergamino, Buenos Aires</p>
              <LotMap />
            </div>

            <div className="card p-5 lg:col-span-3">
              <h3 className="text-lg font-semibold">How does the wheat look in your lot this week?</h3>

              <div className="mt-4 grid grid-cols-2 gap-3" role="group" aria-label="Crop condition">
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
                  icon={<IconSprout className="h-6 w-6" />}
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
                  <span className="whitespace-nowrap text-2xl font-semibold tabular-nums text-brand-700">
                    {Math.round(predicted / 10)}
                    <span className="text-sm font-normal text-neutral-600"> / 10</span>
                  </span>
                </div>
                <div className="mt-3 flex gap-1.5" aria-hidden>
                  {Array.from({ length: 10 }, (_, i) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 rounded-full transition-colors ${
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
                  aria-valuetext={`${Math.round(predicted / 10)} of 10`}
                  onChange={(e) => setPredicted(Number(e.target.value))}
                  className="mt-2 w-full"
                />
                <p className="text-xs text-neutral-600">
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
                  className="mt-2 w-full rounded-xl border border-black/15 bg-white p-3 text-sm outline-none placeholder:text-neutral-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
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
                {!connected ? (
                  <span className="text-sm text-neutral-600">
                    Connect a wallet to sign.{" "}
                    <button className="link inline-flex items-center gap-1" onClick={() => setTab("insurer")}>
                      No wallet? See the insurer side
                      <IconArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ) : !note.trim() ? (
                  <span className="text-sm text-neutral-600">Add a short field note to sign.</span>
                ) : null}
              </div>
              {submit.error ? <ErrorBox>{friendly(String(submit.error))}</ErrorBox> : null}
            </div>
          </div>

          {mine?.memo_sig ? (
            <div className="card flex flex-col gap-3 border-brand-200 bg-brand-50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-brand-600 p-1.5 text-white">
                  <IconCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-brand-900">
                    {earning ? `You earned ${earning.reward} SOL for this report` : "Report registered on Solana"}
                  </p>
                  <p className="text-sm text-brand-700">
                    Only its fingerprint (hash) is on-chain, with your signature and the time.{" "}
                    <ExplorerLink signature={mine.memo_sig}>View transaction</ExplorerLink>
                  </p>
                </div>
              </div>
              <button className="btn" onClick={() => setTab("insurer")}>
                See the round as the insurer
                <IconArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </section>
      ) : (
        <section role="tabpanel" id="panel-insurer" aria-labelledby="tab-insurer" className="space-y-6">
          <RoleIntro
            icon={<IconBuilding />}
            title="Weekly round · wheat · Pergamino"
            text="The panel of agronomists is compared with the weather index for the same 20 km grid cell."
          />

          <div className="card p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <IconUsers className="h-5 w-5 text-neutral-600" />
                <h3 className="font-semibold">Field panel · {reports.length} reports</h3>
              </div>
              <span className="chip bg-neutral-100 text-neutral-700">
                <IconClock className="h-3.5 w-3.5" />
                Closes every Monday 12:00 ART
              </span>
            </div>

            {seeds.length === 0 ? (
              <ErrorBox>The demo agronomists are missing. Check NEXT_PUBLIC_SEED_WALLETS in the shared .env file.</ErrorBox>
            ) : null}

            <ul className="mt-4 divide-y divide-black/5">
              {reports.map((r) => {
                const flag = result?.flags.find((f) => f.wallet === r.wallet);
                return (
                  <li key={r.wallet} className="flex items-start gap-3 py-3">
                    <div
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                      style={{ background: `hsl(${hue(r.wallet)} 35% 32%)` }}
                      aria-hidden
                    >
                      {r.wallet.slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <code className="text-sm">{short(r.wallet)}</code>
                        <SignalChip signal={r.signal} />
                        {r.synthetic ? null : <span className="chip bg-brand-600 text-white">you</span>}
                        {flag ? <span className="chip bg-red-100 text-red-800">excluded</span> : null}
                      </div>
                      <p className={`mt-1 text-sm ${flag ? "text-neutral-500 line-through" : "text-neutral-800"}`}>
                        “{r.note}”
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-600">
                        Expects {Math.round(r.predicted_pct / 10)} of 10 to say below
                        {r.synthetic ? " · pre-loaded demo agronomist" : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button
                className="btn"
                disabled={!!busy || reports.length < 3 || !!result}
                onClick={async () => {
                  const r = await post<RoundResult>("/api/round/close", { zone: ZONE, reports }, "close");
                  if (r) setResult(r);
                }}
              >
                {busy === "close" ? "Closing round…" : result ? "Round closed" : "Close round now"}
              </button>
              <span className="text-sm text-neutral-600">
                Demo only: in production the round closes on its deadline, so nobody picks the moment.
              </span>
            </div>
            {error?.at === "close" ? <ErrorBox>{error.message}</ErrorBox> : null}
          </div>

          {result ? (
            <Results
              headingRef={resultsRef}
              result={result}
              reports={reports}
              me={me}
              reported={!!mine?.memo_sig}
              earning={earning}
              payout={payout}
              cover={cover}
              busy={busy}
              error={error}
              onPay={async () => {
                const before = await refreshBalance().catch(() => balance);
                const p = await post<Payout>("/api/payout", { result }, "payout");
                if (!p) return;
                setPayout(p);
                const mineRow = me ? p.payments.find((x) => x.wallet === me) : undefined;
                if (mineRow) {
                  // El RPC tarda un instante en reflejar el saldo confirmado.
                  await new Promise((r) => setTimeout(r, 1500));
                  const after = await refreshBalance().catch(() => null);
                  setEarning({ reward: mineRow.reward, signature: p.index_sig, before, after });
                }
              }}
              onCover={async () => {
                const p = await post<BasisCover>("/api/basis-cover", { result }, "cover");
                if (p) setCover(p);
              }}
              onNewRound={newRound}
            />
          ) : null}
        </section>
      )}
    </div>
  );
}

function Results({
  headingRef,
  result,
  reports,
  me,
  reported,
  earning,
  payout,
  cover,
  busy,
  error,
  onPay,
  onCover,
  onNewRound,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  result: RoundResult;
  reports: Report[];
  me: string | null;
  reported: boolean;
  earning: Earning | null;
  payout: Payout | null;
  cover: BasisCover | null;
  busy: Busy | null;
  error: { at: Busy; message: string } | null;
  onPay: () => void;
  onCover: () => void;
  onNewRound: () => void;
}) {
  const weatherDry = result.satellite_status === "below";
  const panelDry = result.panel_status === "below";
  const flagged = new Set(result.flags.map((f) => f.wallet));
  const valid = reports.filter((r) => !flagged.has(r.wallet));
  const validDry = valid.filter((r) => r.signal === "below").length;
  const triggers = !weatherDry && panelDry && valid.length >= MIN_VALID;
  const aiReview = !result.model.startsWith("rule-based");
  const maxReward = Math.max(...result.scores.map((s) => s.reward), 0.0001);

  return (
    <div className="space-y-6">
      <h2 ref={headingRef} tabIndex={-1} className="scroll-mt-6 pt-2 text-2xl font-semibold tracking-tight">
        Round result
      </h2>

      {/* La zona del satélite contra el lote del campo */}
      <div className="card p-5 sm:p-6">
        <div className="grid items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
          <Verdict
            label="Weather index for the 20 km square"
            dry={weatherDry}
            detail={`${result.weather.precip_30d_mm} mm of rain in 30 days vs ${result.weather.baseline_30d_mm} mm 5-year average`}
            icon={<IconDrop className="h-5 w-5" />}
          />
          <SquareVsField weatherDry={weatherDry} panelDry={panelDry} divergence={result.divergence} />
          <Verdict
            label="Agronomists in the field"
            dry={panelDry}
            detail={`${validDry} of ${valid.length} valid reports say the crop is below normal${
              result.flags.length ? ` · ${result.flags.length} excluded` : ""
            }`}
            icon={<IconUsers className="h-5 w-5" />}
          />
        </div>

        {result.divergence ? (
          <div className="mt-6 flex items-start gap-3 rounded-xl bg-red-50 p-4">
            <IconAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
            <div>
              <p className="font-semibold text-red-900">Basis risk detected</p>
              <p className="text-sm text-red-800">
                The square looks {weatherDry ? "dry" : "normal"} but the field says {panelDry ? "drought" : "normal"}. A
                satellite-only policy would {weatherDry ? "pay where the field is fine" : "miss this drought"}.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Regla de la cobertura y revisión */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="font-semibold">Basis-risk cover rule</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <RuleRow ok={!weatherDry}>Weather index says normal</RuleRow>
            <RuleRow ok={panelDry}>Agronomists confirm drought</RuleRow>
            <RuleRow ok={valid.length >= MIN_VALID}>
              At least {MIN_VALID} valid reports ({valid.length} after excluding {result.flags.length})
            </RuleRow>
          </ul>
          <p className={`mt-4 rounded-xl p-3 text-sm font-semibold ${triggers ? "bg-brand-50 text-brand-900" : "bg-neutral-100 text-neutral-700"}`}>
            {triggers ? "The cover pays the insured farmer." : "The cover does not trigger this round."}
          </p>
        </div>

        <div className="card p-5">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="font-semibold">Stress index</h3>
            <p className="text-2xl font-semibold tabular-nums">{result.index.toFixed(2)}</p>
          </div>
          <div className="relative mt-3 h-3 rounded-full bg-gradient-to-r from-brand-200 via-soil-100 to-soil-500" aria-hidden>
            <div
              className="absolute -top-1 h-5 w-1.5 rounded-full bg-[#1c2a1f] shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
              style={{ left: `calc(${Math.min(1, result.index) * 100}% - 3px)` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-neutral-600">
            <span>0 · no stress</span>
            <span>1 · severe</span>
          </div>
          <p className="mt-3 text-xs text-neutral-600">
            Fixed formula for the insurer&apos;s records: half weather stress, half valid panel consensus. Demo stand-in:
            weather data instead of the insurer&apos;s own satellite index.{" "}
            {aiReview ? "Reports reviewed by Claude AI." : "Reports reviewed by fixed rules (demo without an AI key)."}
          </p>
        </div>
      </div>

      {result.flags.length ? (
        <div className="space-y-2">
          {result.flags.map((f) => (
            <div key={f.wallet} className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800">
              <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <code>{short(f.wallet)}</code> excluded: {f.reason}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Recompensas */}
      <div className="card p-5">
        <h3 className="font-semibold">Agronomist rewards</h3>
        <p className="text-sm text-neutral-600">Paid for consistency with the panel, not for the outcome.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[18rem] text-sm">
            <thead className="text-left text-xs text-neutral-600">
              <tr className="border-b border-black/5">
                <th className="py-2 pr-4 font-medium">Agronomist</th>
                <th className="py-2 pr-4 font-medium">Score</th>
                <th className="py-2 font-medium">Reward</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {result.scores.map((s) => {
                const out = flagged.has(s.wallet);
                const isMe = s.wallet === me;
                return (
                  <tr key={s.wallet} className={isMe ? "bg-brand-50" : undefined}>
                    <td className="py-2.5 pr-4">
                      <code>{short(s.wallet)}</code>
                      {isMe ? <span className="chip ml-2 bg-brand-600 text-white">you</span> : null}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      {out ? <span className="chip bg-red-100 text-red-800">excluded</span> : s.score.toFixed(2)}
                    </td>
                    <td className="py-2.5">
                      {out ? (
                        <span className="text-neutral-600">No reward</span>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="hidden h-2 w-24 rounded-full bg-neutral-100 sm:block">
                            <div className="h-2 rounded-full bg-brand-500" style={{ width: `${(s.reward / maxReward) * 100}%` }} />
                          </div>
                          <span className="whitespace-nowrap tabular-nums">{s.reward} SOL</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Liquidación */}
      <div className="card p-5">
        <h3 className="font-semibold">Settlement on Solana</h3>
        <ol className="mt-4 space-y-5">
          <SettleStep
            n={1}
            done={!!payout}
            title="Publish the index and pay agronomists"
            text="One transaction: the index fingerprint plus every reward."
            action={
              payout ? null : (
                <button className="btn" disabled={!!busy} onClick={onPay}>
                  {busy === "payout" ? "Paying…" : "Publish and pay"}
                </button>
              )
            }
          >
            {payout ? (
              <p className="mt-1 text-sm text-neutral-700">
                {payout.payments.length} agronomists paid ·{" "}
                <ExplorerLink signature={payout.index_sig}>View transaction</ExplorerLink>
              </p>
            ) : null}
            {payout && earning ? (
              <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
                <p className="text-lg font-semibold text-brand-900">You earned {earning.reward} SOL as an agronomist</p>
                {earning.before !== null && earning.after !== null ? (
                  <p className="mt-1 text-sm tabular-nums text-brand-800">
                    Your wallet: {earning.before.toFixed(4)} → <strong>{earning.after.toFixed(4)} SOL</strong>
                  </p>
                ) : null}
                <p className="mt-1 text-sm text-brand-800">
                  Check it in Phantom&apos;s activity tab (Devnet). Paid for an honest report, whatever the weather.
                </p>
              </div>
            ) : null}
            {payout && !earning ? (
              <p className="mt-2 text-sm text-neutral-600">
                {reported
                  ? "Your reward is on its way; check Phantom's activity tab."
                  : "Your wallet did not report this round, so it was not paid. Sign a report in the Agronomist tab first."}
              </p>
            ) : null}
            {error?.at === "payout" ? <ErrorBox>{error.message}</ErrorBox> : null}
          </SettleStep>
          <SettleStep
            n={2}
            done={!!cover}
            title="Settle the basis-risk cover"
            text={`Pays the insured farmer when the weather index says normal and at least ${MIN_VALID} valid reports confirm drought.`}
            action={
              cover ? null : (
                <button className="btn" disabled={!!busy || !payout} onClick={onCover}>
                  {busy === "cover" ? "Checking…" : "Settle cover"}
                </button>
              )
            }
          >
            {!payout && !cover ? <p className="mt-1 text-xs text-neutral-600">Available after step 1.</p> : null}
            {cover && !cover.paid ? <p className="mt-1 text-sm text-neutral-700">Not triggered: {cover.reason}</p> : null}
            {error?.at === "cover" ? <ErrorBox>{error.message}</ErrorBox> : null}
          </SettleStep>
        </ol>
      </div>

      {cover?.paid ? (
        <div className="card border-brand-200 bg-brand-600 p-6 text-white">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-white/15 p-2">
              <IconShield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-semibold">The farmer was paid {cover.payout} SOL.</p>
              <p className="mt-1 max-w-2xl text-brand-50">
                The satellite square said normal. {cover.valid} agronomists in the field said drought, and the cover paid
                the case a satellite-only policy would have missed.
              </p>
              <a
                className="mt-3 inline-flex items-center gap-1 font-medium text-white underline underline-offset-2"
                href={explorer(cover.signature!)}
                target="_blank"
                rel="noreferrer"
              >
                View payout transaction
                <IconExternal className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      ) : null}

      {cover ? (
        <div className="flex justify-center">
          <button className="btn-ghost" onClick={onNewRound}>
            <IconRefresh className="h-4 w-4" />
            Start a new demo round
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Esquema de la idea del producto: la zona del satélite y el lote que el satélite no ve. */
function SquareVsField({ weatherDry, panelDry, divergence }: { weatherDry: boolean; panelDry: boolean; divergence: boolean }) {
  const square = weatherDry ? { fill: "#f3e6c8", stroke: "#b7802f" } : { fill: "#d6ecd6", stroke: "#2f7a3b" };
  const lot = panelDry ? "#b7802f" : "#2f7a3b";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg viewBox="0 0 120 120" className="h-32 w-32" role="img" aria-label={`The 20 km square looks ${weatherDry ? "dry" : "normal"}; the lot reported by agronomists is ${panelDry ? "in drought" : "normal"}.`}>
          <rect x="6" y="6" width="108" height="108" rx="6" fill={square.fill} stroke={square.stroke} strokeWidth="2" strokeDasharray="5 4" />
          <rect x="62" y="64" width="26" height="22" rx="3" fill={lot} />
          <path d="M62 75h26M75 64v22" stroke="#fff" strokeOpacity="0.45" strokeWidth="1.5" />
        </svg>
        <div
          className={`absolute -right-3 -top-3 flex h-10 w-10 items-center justify-center rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.12)] ${
            divergence ? "bg-red-600 text-white" : "bg-brand-600 text-white"
          }`}
        >
          {divergence ? <IconNotEqual className="h-5 w-5" /> : <IconEqual className="h-5 w-5" />}
        </div>
      </div>
      <p className="text-center text-xs text-neutral-600">
        Square: what the satellite averages
        <br />
        Block: the lot agronomists see
      </p>
    </div>
  );
}

function RoleTab({
  id,
  active,
  onClick,
  icon,
  children,
}: {
  id: Tab;
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      role="tab"
      id={`tab-${id}`}
      aria-selected={active}
      aria-controls={`panel-${id}`}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active ? "bg-white text-brand-700 shadow-sm" : "text-neutral-600 hover:text-neutral-900"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function RoleIntro({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="rounded-2xl bg-brand-600 p-3 text-white shadow-sm">{icon}</div>
      <div>
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
      className={`rounded-xl border-2 p-4 text-left transition-colors ${
        active ? on : "border-black/10 bg-white text-neutral-700 hover:border-black/20"
      }`}
    >
      {icon}
      <div className="mt-2 font-semibold">{title}</div>
      <div className="text-xs">{text}</div>
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
    <div className={`rounded-xl p-5 ${dry ? "bg-soil-50" : "bg-brand-50"}`}>
      <div className={`flex items-center gap-2 text-sm font-medium ${dry ? "text-soil-700" : "text-brand-700"}`}>
        {icon}
        {label}
      </div>
      <div className={`mt-2 text-3xl font-semibold ${dry ? "text-soil-700" : "text-brand-700"}`}>
        {dry ? "Drought" : "Normal"}
      </div>
      <p className="mt-1 text-sm text-neutral-700">{detail}</p>
    </div>
  );
}

function RuleRow({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          ok ? "bg-brand-600 text-white" : "bg-neutral-200 text-neutral-600"
        }`}
      >
        {ok ? <IconCheck className="h-3.5 w-3.5" /> : <span className="h-0.5 w-2 rounded bg-current" />}
      </span>
      <span className={ok ? "text-neutral-800" : "text-neutral-600"}>{children}</span>
    </li>
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
            done ? "bg-brand-600 text-white" : "bg-neutral-100 text-neutral-700"
          }`}
        >
          {done ? <IconCheck className="h-4 w-4" /> : n}
        </div>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-neutral-600">{text}</p>
          {children}
        </div>
      </div>
      {action ? <div className="shrink-0 pl-10 sm:pl-0">{action}</div> : null}
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
    <div role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
