import { describe, expect, it } from "vitest";
import { seedReports } from "./fixtures";
import { computeIndex } from "./index";
import { copiedNoteFlags, rbtsScores, rewards } from "./scoring";
import type { Report } from "./types";

const wallets = ["A1", "B2", "C3", "D4", "E5"];

function panel(): Report[] {
  const seeded = seedReports(wallets.slice(0, 4), "2026-10-03T15:00:00Z");
  return [
    ...seeded,
    { ...seeded[0], wallet: "E5", synthetic: false, predicted_pct: 75, note: "Trigo en espigazón con estrés visible." },
  ];
}

describe("rbtsScores", () => {
  it("es determinista", () => {
    expect(rbtsScores(panel())).toEqual(rbtsScores([...panel()].reverse()));
  });

  it("da puntaje neutro con menos de 3 reportes", () => {
    const scores = rbtsScores(panel().slice(0, 2));
    expect([...scores.values()]).toEqual([1, 1]);
  });
});

describe("rewards", () => {
  it("no paga a los marcados y no se pasa del fondo", () => {
    const reports = panel();
    const flags = [{ wallet: "D4", reason: "x" }];
    const result = rewards(reports, flags, 100);
    expect(result.find((s) => s.wallet === "D4")?.reward).toBe(0);
    expect(result.reduce((sum, s) => sum + s.reward, 0)).toBeLessThanOrEqual(100);
  });
});

describe("copiedNoteFlags", () => {
  it("marca al que copia la nota de otro informante", () => {
    expect(copiedNoteFlags(panel()).map((f) => f.wallet)).toEqual(["D4"]);
  });

  it("no toma dos notas vacías como copia", () => {
    const reports = panel().map((r) => (r.wallet === "B2" || r.wallet === "C3" ? { ...r, note: "  " } : r));
    expect(copiedNoteFlags(reports).map((f) => f.wallet)).toEqual(["D4"]);
  });

  it("detecta la copia aunque cambien mayúsculas o espacios", () => {
    const reports = panel().map((r) =>
      r.wallet === "D4" ? { ...r, note: `  ${r.note.toUpperCase().replace(" ", "   ")} ` } : r,
    );
    expect(copiedNoteFlags(reports).map((f) => f.wallet)).toEqual(["D4"]);
  });
});

describe("computeIndex", () => {
  it("detecta sequía en el panel aunque el clima esté normal", () => {
    const weather = { source: "fixed" as const, soil_moisture: 0.27, precip_30d_mm: 58, baseline_30d_mm: 61 };
    const { panel_status, index } = computeIndex(panel(), [{ wallet: "D4", reason: "x" }], weather);
    expect(panel_status).toBe("below");
    expect(index).toBeGreaterThan(0.5);
  });
});
