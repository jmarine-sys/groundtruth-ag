import type { Report, RoundResult } from "./types";

// Hashes que se registran onchain. Usa Web Crypto, que existe en el navegador y en Node.

const REPORT_KEYS = ["zone", "crop", "wallet", "signal", "predicted_pct", "note", "ts"] as const;

/** JSON del reporte con las claves en el orden de proyecto/contratos.md, sin memo_sig. */
export function canonicalReport(report: Report): string {
  return JSON.stringify(Object.fromEntries(REPORT_KEYS.map((k) => [k, report[k]])));
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function reportMemo(hash: string): string {
  return `groundtruth:report:${hash}`;
}

export async function indexMemo(result: RoundResult): Promise<string> {
  const hash = await sha256Hex(JSON.stringify(result));
  return `groundtruth:index:${result.zone}:${result.index}:${hash}`;
}
