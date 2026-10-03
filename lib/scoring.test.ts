import { describe, expect, it } from "vitest";
import { seedReports } from "./fixtures";
import { computeIndex } from "./index";
import { rbtsScores, rewards, ruleBasedFlags } from "./scoring";
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

describe("ruleBasedFlags", () => {
  it("marca al que copia la nota de otro informante", () => {
    const flags = ruleBasedFlags(panel(), false);
    expect(flags.map((f) => f.wallet)).toEqual(["D4"]);
  });

  it("marca al que contradice al panel y al clima", () => {
    const reports = panel().map((r) => (r.wallet === "B2" ? { ...r, signal: "normal" as const } : r));
    const flags = ruleBasedFlags(reports, true);
    expect(flags.map((f) => f.wallet)).toContain("B2");
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
