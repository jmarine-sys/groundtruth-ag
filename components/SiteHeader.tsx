import Link from "next/link";
import { LogoMark } from "@/components/icons";

const REPO = "https://github.com/jmarine-sys/groundtruth-ag";

/** Encabezado común de la landing y la demo. */
export function SiteHeader({ current }: { current: "landing" | "demo" }) {
  return (
    <header className="border-b border-black/5 bg-white/80">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5" aria-label="GroundTruth home">
          <LogoMark className="h-8 w-8" />
          <span className="text-lg font-semibold tracking-tight">GroundTruth</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-4">
          {current === "landing" ? (
            <a href="#how" className="hidden px-2 py-1 text-neutral-700 hover:text-neutral-900 sm:inline">
              How it works
            </a>
          ) : (
            <Link href="/" className="px-2 py-1 text-neutral-700 hover:text-neutral-900">
              Overview
            </Link>
          )}
          <a href={REPO} target="_blank" rel="noreferrer" className="hidden px-2 py-1 text-neutral-700 hover:text-neutral-900 sm:inline">
            GitHub
          </a>
          {current === "landing" ? (
            <Link href="/demo" className="btn px-3 py-2">
              Open the demo
            </Link>
          ) : (
            <span className="chip whitespace-nowrap bg-soil-100 text-soil-700">
              <span className="h-1.5 w-1.5 rounded-full bg-soil-500" />
              Devnet<span className="hidden sm:inline"> · test funds only</span>
            </span>
          )}
        </nav>
      </div>
    </header>
  );
}

export { REPO };
