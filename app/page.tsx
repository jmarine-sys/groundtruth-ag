import { Demo } from "@/components/Demo";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold">GroundTruth</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Satellites see 20 km squares. Agronomists see the field. GroundTruth turns their reports into an
          auditable panel that flags when a satellite index misses a drought.
        </p>
        <p className="mt-2 inline-block rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">
          Prototype on Solana devnet · test tokens, no real money
        </p>
      </header>
      <Demo />
    </main>
  );
}
