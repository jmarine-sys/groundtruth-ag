import type { Flag, Report, Score } from "./types";

// Robust Bayesian Truth Serum (Witkowski & Parkes, 2012) para respuestas binarias.
// Funciona desde n=3 y no necesita una creencia previa común. Cada informante i se
// compara con un "referente" j (su predicción) y un "par" k (su respuesta). Para que
// el cálculo sea reproducible por cualquiera, j y k se eligen en forma cíclica sobre
// la lista ordenada por wallet.

/** Regla de puntaje cuadrática binaria: premia predecir bien si el par dijo "below". */
function quadratic(y: number, peerSaysBelow: boolean): number {
  return peerSaysBelow ? 2 * y - y * y : 1 - y * y;
}

export function rbtsScores(reports: Report[]): Map<string, number> {
  const sorted = [...reports].sort((a, b) => a.wallet.localeCompare(b.wallet));
  const n = sorted.length;
  const scores = new Map<string, number>();
  if (n < 3) {
    for (const r of sorted) scores.set(r.wallet, 1);
    return scores;
  }

  for (let i = 0; i < n; i++) {
    const self = sorted[i];
    const ref = sorted[(i + 1) % n];
    const peer = sorted[(i + 2) % n];

    const yRef = clamp01(ref.predicted_pct / 100);
    const delta = Math.min(yRef, 1 - yRef);
    // Predicción "sombra": la del referente, corrida hacia la respuesta propia.
    const shadow = self.signal === "below" ? yRef + delta : yRef - delta;
    const peerSaysBelow = peer.signal === "below";

    const info = quadratic(shadow, peerSaysBelow);
    const pred = quadratic(clamp01(self.predicted_pct / 100), peerSaysBelow);
    scores.set(self.wallet, info + pred);
  }
  return scores;
}

/**
 * Reparte el fondo de la ronda en proporción al puntaje. Los reportes marcados
 * como sospechosos no cobran. Las recompensas son unidades enteras del token de prueba.
 */
export function rewards(
  reports: Report[],
  flags: Flag[],
  pool: number,
): Score[] {
  const raw = rbtsScores(reports);
  const flagged = new Set(flags.map((f) => f.wallet));
  const eligible = reports.filter((r) => !flagged.has(r.wallet));
  const total = eligible.reduce((sum, r) => sum + (raw.get(r.wallet) ?? 0), 0);

  return reports.map((r) => {
    const score = round2(raw.get(r.wallet) ?? 0);
    const reward =
      flagged.has(r.wallet) || total === 0
        ? 0
        : Math.floor((pool * (raw.get(r.wallet) ?? 0)) / total);
    return { wallet: r.wallet, score, reward };
  });
}

/**
 * Colusión: una nota idéntica a la de otro informante anterior (sin importar mayúsculas
 * ni espacios). Una nota vacía no es copia de nadie. Se suma a la revisión de la IA;
 * sin IA la ronda no se cierra (OD-23).
 */
export function copiedNoteFlags(reports: Report[]): Flag[] {
  const seen = new Map<string, string>();
  const copied: Flag[] = [];
  for (const r of [...reports].sort((a, b) => a.ts.localeCompare(b.ts))) {
    const key = r.note.trim().toLowerCase().replace(/\s+/g, " ");
    if (!key) continue;
    const original = seen.get(key);
    if (original) {
      copied.push({ wallet: r.wallet, reason: `Copies word for word the note of informant ${short(original)}.` });
    } else {
      seen.set(key, r.wallet);
    }
  }
  return copied;
}

function short(wallet: string): string {
  return wallet.length > 8 ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : wallet;
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
