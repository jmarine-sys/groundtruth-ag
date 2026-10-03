import type { Metadata } from "next";
import { Demo } from "@/components/Demo";
import { IconCheck } from "@/components/icons";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "GroundTruth · Demo",
  description: "Try GroundTruth on Solana devnet: report as an agronomist, settle as the insurer.",
};

export default function DemoPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader current="demo" />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16">
        <section className="py-8 sm:py-10">
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Run one round of GroundTruth
          </h1>
          <p className="mt-3 max-w-2xl text-neutral-600">
            Report as an agronomist with Phantom on Solana devnet, then switch to the insurer to close the round, see
            where the satellite square and the field disagree, and settle the payouts.
          </p>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-700">
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
