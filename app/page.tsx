import Link from "next/link";
import { IconArrowRight, IconExternal, IconCheck } from "@/components/icons";
import { REPO, SiteHeader } from "@/components/SiteHeader";

// Transacciones reales en devnet de una ronda de prueba (3/10/2026): un pago a agrónomos y una cobertura.
const PAYOUT_TX =
  "34MAZFLA4dpVrmKZy2DWkw9TTEg9qv6vuzB8pCs5fv61vbCXWXs62NMbbQ4YMNDGkX3kKFBFyVkUU2XyjQiJbVFe";
const COVER_TX =
  "5W8yqd62i4qqDUrynvmRnrzjaGo8J7UsZMeHLiSxtfRpSujb3VpydwW11xX242UjD2EBSJXDQPdL2fMRrUyiEm5W";
const explorer = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

export default function Landing() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader current="landing" />

      <main className="flex-1">
        {/* Apertura: la frase y la norma */}
        <section className="mx-auto grid w-full max-w-5xl gap-10 px-4 pb-16 pt-12 sm:pt-16 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-6xl">
              The satellite sees the square. <span className="text-brand-600">We see the field.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-neutral-600">
              GroundTruth measures basis risk in crop insurance: a panel of local agronomists, signed on Solana and paid
              for honesty, shows insurers where their satellite index misses a drought.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/demo" className="btn px-5 py-3 text-base">
                Open the demo
                <IconArrowRight className="h-4 w-4" />
              </Link>
              <a href={REPO} target="_blank" rel="noreferrer" className="btn-ghost px-4 py-3 text-base">
                Read the code
              </a>
            </div>
            <p className="mt-4 text-sm text-neutral-600">
              Working prototype on Solana devnet · Built for the Colosseum Crypto World&apos;s Fair
            </p>
          </div>

          <aside className="lg:col-span-5">
            <div className="relative rounded-2xl border border-soil-500/25 bg-soil-50 p-6 shadow-[0_1px_2px_rgba(74,48,12,0.08),0_16px_32px_-20px_rgba(74,48,12,0.35)]">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-soil-500/25 pb-3">
                <p className="whitespace-nowrap font-semibold text-soil-900">Res. SSN 315/2026</p>
                <p className="text-xs tabular-nums text-soil-700">Boletín Oficial · 23/07/2026</p>
              </div>
              <p className="mt-4 text-soil-900">
                Argentina&apos;s insurance regulator opened the door to parametric crop insurance. Insurers must now
                tell farmers about <strong className="font-semibold">basis risk</strong>: the gap between what the
                index says and what happens on their farm.
              </p>
              <p className="mt-5 text-2xl font-semibold leading-snug text-soil-900">
                Nobody measures it yet.
                <span className="block text-brand-700">GroundTruth does.</span>
              </p>
              <p className="mt-4 text-xs text-soil-700">Summary in our words, not the text of the resolution.</p>
            </div>
          </aside>
        </section>

        {/* Qué cuesta el riesgo base */}
        <section className="border-y border-black/5 bg-white">
          <div className="mx-auto w-full max-w-5xl px-4 py-16">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance">
              An index averages a 20 km square. A drought doesn&apos;t.
            </h2>
            <p className="mt-3 max-w-2xl text-neutral-600">
              When the square and the field disagree, someone pays for the error. Today the insurer only sees the
              square.
            </p>

            <div className="mt-10 grid gap-8 md:grid-cols-2">
              <Mismatch
                squareDry={false}
                lotDry
                who="The farmer loses"
                text="The index says normal, the lot is in drought. The policy pays nothing."
              />
              <Mismatch
                squareDry
                lotDry={false}
                who="The insurer loses"
                text="The index says drought, the lot is fine. The policy pays a loss that never happened."
              />
            </div>
          </div>
        </section>

        {/* Cómo se mide */}
        <section id="how" className="mx-auto w-full max-w-5xl scroll-mt-6 px-4 py-16">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance">
            How GroundTruth measures it, every week
          </h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-4 md:gap-6">
            {[
              [
                "Report",
                "An agronomist with a registered lot says whether the crop is below normal, and how many of 10 peers will say the same.",
              ],
              [
                "Sign on Solana",
                "The report's fingerprint is signed from the agronomist's own wallet, with a timestamp nobody can change later.",
              ],
              [
                "Check",
                "Weather data and an AI review flag suspicious reports, like a note copied from another agronomist. Those are excluded.",
              ],
              [
                "Pay",
                "Agronomists are paid for consistency with the panel, not for the outcome. When the index says normal and 3+ valid reports confirm drought, a basis-risk cover pays the farmer.",
              ],
            ].map(([title, text], i) => (
              <li key={title} className="relative">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                    {i + 1}
                  </span>
                  <span className="hidden h-px flex-1 bg-brand-200 md:block" aria-hidden />
                </div>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-neutral-600">{text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-10 max-w-2xl text-sm text-neutral-600">
            The index itself is a fixed formula an actuary can audit: half weather stress, half the share of valid
            reports saying &ldquo;below normal&rdquo;. The AI never sets the number.
          </p>
        </section>

        {/* Por qué Solana */}
        <section className="bg-brand-900 text-white">
          <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-16 lg:grid-cols-2">
            <h2 className="text-3xl font-semibold tracking-tight text-balance">
              Insurer and farmer trust the same record without trusting each other.
            </h2>
            <ul className="space-y-5 text-brand-50">
              <li>
                <p className="font-semibold text-white">A record neither side controls</p>
                <p className="text-sm">
                  Each report is committed on Solana before the round closes, so nobody can rewrite it after the
                  weather is known.
                </p>
              </li>
              <li>
                <p className="font-semibold text-white">Payouts that settle themselves</p>
                <p className="text-sm">
                  The index and every agronomist reward go out in one transaction, for a fraction of a cent.
                </p>
              </li>
              <li>
                <p className="font-semibold text-white">An index any insurer can read</p>
                <p className="text-sm">The result is public, so another insurer or cooperative can plug it in.</p>
              </li>
              <li className="flex flex-wrap gap-x-5 gap-y-2 pt-1 text-sm">
                <a className="inline-flex items-center gap-1 font-medium text-white underline underline-offset-2" href={explorer(PAYOUT_TX)} target="_blank" rel="noreferrer">
                  See a real devnet payout
                  <IconExternal className="h-3.5 w-3.5" />
                </a>
                <a className="inline-flex items-center gap-1 font-medium text-white underline underline-offset-2" href={explorer(COVER_TX)} target="_blank" rel="noreferrer">
                  See a basis-risk cover payout
                  <IconExternal className="h-3.5 w-3.5" />
                </a>
              </li>
            </ul>
          </div>
        </section>

        {/* Qué es real */}
        <section className="mx-auto w-full max-w-5xl px-4 py-16">
          <h2 className="text-3xl font-semibold tracking-tight">What the prototype really does</h2>
          <div className="mt-8 grid gap-10 md:grid-cols-2">
            <div>
              <h3 className="font-semibold text-brand-700">Real, on Solana devnet</h3>
              <ul className="mt-3 space-y-2 text-sm text-neutral-700">
                {[
                  "Reports signed from the agronomist's Phantom wallet",
                  "Live weather for the zone (Open-Meteo)",
                  "Peer-prediction scoring and collusion checks",
                  "Index publication, agronomist rewards and cover payout",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-soil-700">Simulated for the demo</h3>
              <ul className="mt-3 space-y-2 text-sm text-neutral-700">
                {[
                  "Four pre-loaded agronomists, one insured farmer and the policy terms",
                  "One fixed zone: Pergamino, Buenos Aires",
                  "Weather data standing in for the insurer's satellite index",
                  "Test funds; production payouts would be in USDC",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-soil-500" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Cierre */}
        <section className="mx-auto w-full max-w-5xl px-4 pb-20">
          <div className="flex flex-col items-start gap-6 rounded-2xl bg-brand-600 px-6 py-10 text-white sm:flex-row sm:items-center sm:justify-between sm:px-10">
            <div>
              <p className="text-2xl font-semibold tracking-tight text-balance">
                Watch the square and the field disagree.
              </p>
              <p className="mt-1 text-brand-50">One round takes about two minutes. With Phantom on devnet you report as an agronomist; the insurer side works without a wallet.</p>
            </div>
            <Link href="/demo" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-brand-700 transition-colors hover:bg-brand-50">
              Open the demo
              <IconArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/5 py-6 text-center text-xs text-neutral-600">
        GroundTruth · Prototype for the Colosseum Crypto World&apos;s Fair ·{" "}
        <a className="link" href={REPO} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </footer>
    </div>
  );
}

/** La zona promediada por el satélite contra el lote real, para cada lado del riesgo base. */
function Mismatch({ squareDry, lotDry, who, text }: { squareDry: boolean; lotDry: boolean; who: string; text: string }) {
  const square = squareDry ? { fill: "#f3e6c8", stroke: "#b7802f" } : { fill: "#d6ecd6", stroke: "#2f7a3b" };
  return (
    <figure className="flex items-center gap-6">
      <svg
        viewBox="0 0 120 120"
        className="h-28 w-28 shrink-0 sm:h-36 sm:w-36"
        role="img"
        aria-label={`Index square ${squareDry ? "dry" : "normal"}, lot ${lotDry ? "in drought" : "normal"}`}
      >
        <rect x="6" y="6" width="108" height="108" rx="6" fill={square.fill} stroke={square.stroke} strokeWidth="2" strokeDasharray="5 4" />
        <rect x="62" y="64" width="26" height="22" rx="3" fill={lotDry ? "#b7802f" : "#2f7a3b"} />
        <path d="M62 75h26M75 64v22" stroke="#fff" strokeOpacity="0.45" strokeWidth="1.5" />
      </svg>
      <figcaption>
        <p className="text-xl font-semibold">{who}</p>
        <p className="mt-1 text-neutral-600">{text}</p>
        <p className="mt-3 text-xs text-neutral-600">
          Square: index says <b>{squareDry ? "drought" : "normal"}</b> · Block: lot is <b>{lotDry ? "in drought" : "normal"}</b>
        </p>
      </figcaption>
    </figure>
  );
}
