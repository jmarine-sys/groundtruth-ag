import { Demo } from "@/components/Demo";
import { LogoMark } from "@/components/icons";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-black/5 bg-white/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-8 w-8" />
            <span className="text-lg font-semibold tracking-tight">GroundTruth</span>
          </div>
          <span className="chip bg-soil-100 text-soil-700">
            <span className="h-1.5 w-1.5 rounded-full bg-soil-500" />
            Solana devnet · test funds only
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16">
        <section className="py-10 sm:py-14">
          <p className="eyebrow text-brand-600">Basis-risk audit for crop insurance</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            The satellite sees the square.
            <span className="text-brand-600"> We see the field.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-neutral-600">
            Local agronomists report what they see in their lots. Each report is signed on Solana, paid for honesty and
            checked against weather data, so insurers can spot the droughts a satellite index misses.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {[
              ["Signed on Solana", "Every report is timestamped and tamper-proof"],
              ["Paid for honesty", "Rewards don't depend on the outcome"],
              ["Collusion check", "Copied or coordinated reports are excluded"],
            ].map(([title, text]) => (
              <div key={title} className="card px-4 py-3">
                <div className="text-sm font-semibold">{title}</div>
                <div className="text-xs text-neutral-500">{text}</div>
              </div>
            ))}
          </div>
        </section>

        <Demo />
      </main>

      <footer className="border-t border-black/5 py-6 text-center text-xs text-neutral-500">
        GroundTruth · Prototype for the Colosseum Crypto World&apos;s Fair · Runs on Solana devnet with test funds. In
        production payouts are in USDC.
      </footer>
    </div>
  );
}
