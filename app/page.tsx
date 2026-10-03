import { Demo } from "@/components/Demo";
import { IconCheck, LogoMark } from "@/components/icons";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-black/5 bg-white/80">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-8 w-8" />
            <span className="text-lg font-semibold tracking-tight">GroundTruth</span>
          </div>
          <span className="chip whitespace-nowrap bg-soil-100 text-soil-700">
            <span className="h-1.5 w-1.5 rounded-full bg-soil-500" />
            Devnet<span className="hidden sm:inline"> · test funds only</span>
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16">
        <section className="py-10 sm:py-14">
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl">
            The satellite sees the square. <span className="text-brand-600">We see the field.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-neutral-600">
            Crop insurance pays from satellite data averaged over 20 km squares, so a drought on one farm can go unpaid.
            Insurers call that gap <strong className="font-semibold text-neutral-800">basis risk</strong>. GroundTruth
            measures it with a panel of local agronomists whose reports are signed on Solana and checked against
            weather data.
          </p>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-700">
            {[
              "Every report is signed and timestamped on Solana",
              "Agronomists are paid for honesty, not for the outcome",
              "Copied or coordinated reports are excluded",
            ].map((text) => (
              <li key={text} className="flex items-center gap-2">
                <IconCheck className="h-4 w-4 text-brand-600" />
                {text}
              </li>
            ))}
          </ul>
        </section>

        <Demo />
      </main>

      <footer className="border-t border-black/5 py-6 text-center text-xs text-neutral-600">
        GroundTruth · Prototype for the Colosseum Crypto World&apos;s Fair · In production payouts are in USDC.
      </footer>
    </div>
  );
}
