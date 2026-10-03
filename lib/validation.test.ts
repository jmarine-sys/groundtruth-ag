import { describe, expect, it } from "vitest";
import { seedReports } from "./fixtures";
import { parseCloseBody } from "./validation";

// Direcciones de Solana válidas generadas al azar (solo la parte pública).
const wallets = [
  "3ck3hHYLydfjEcjffF5gUycjxE9MtLJ7ZB7cwjPNUNTD",
  "2hpCdL1szqUPMyENcE1ckhQfh4RCZbDcaZrakJ7Kdq6H",
  "Fx4QrKpAQYhpA7JjTTGmUaiM6RQY9vu1rTKRTcpbsxMp",
  "36jCyD6dia9NmKaieuz7UxLuy7V4Gg6ftMpbU92pewYG",
];

function body(overrides: Record<string, unknown> = {}) {
  return { zone: "pergamino", reports: seedReports(wallets, "2026-10-03T15:00:00.000Z"), ...overrides };
}

function withReport(i: number, patch: Record<string, unknown>) {
  const reports = seedReports(wallets, "2026-10-03T15:00:00.000Z").map((r, j) => (j === i ? { ...r, ...patch } : r));
  return body({ reports });
}

describe("parseCloseBody", () => {
  it("acepta la ronda de la demo sin tocar los datos", () => {
    const input = body();
    const parsed = parseCloseBody(input);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.body.reports).toEqual(input.reports);
  });

  it("rechaza una nota vacía o solo con espacios", () => {
    const parsed = parseCloseBody(withReport(1, { note: "   " }));
    expect(parsed).toEqual({ ok: false, error: "reports.1.note: note is empty" });
  });

  it("rechaza dos reportes de la misma wallet en la ronda", () => {
    const parsed = parseCloseBody(withReport(2, { wallet: wallets[0] }));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toContain("reports.2.wallet: this wallet already sent a report");
  });

  it("rechaza un porcentaje escrito con letras, decimal o fuera de 0-100", () => {
    for (const predicted_pct of ["setenta", 70.5, -1, 101]) {
      expect(parseCloseBody(withReport(0, { predicted_pct })).ok).toBe(false);
    }
  });

  it("rechaza una wallet que no es una dirección de Solana", () => {
    const parsed = parseCloseBody(withReport(0, { wallet: "A1" }));
    expect(parsed).toEqual({ ok: false, error: "reports.0.wallet: wallet is not a valid Solana address" });
  });

  it("rechaza una respuesta que no sea below o normal", () => {
    expect(parseCloseBody(withReport(0, { signal: "drought" })).ok).toBe(false);
  });

  it("rechaza una fecha inválida y un reporte de otra zona", () => {
    expect(parseCloseBody(withReport(0, { ts: "ayer" })).ok).toBe(false);
    expect(parseCloseBody(withReport(0, { zone: "rosario" })).ok).toBe(false);
  });

  it("rechaza zonas desconocidas, incluso nombres heredados de Object", () => {
    expect(parseCloseBody(body({ zone: "rosario" })).ok).toBe(false);
    expect(parseCloseBody(body({ zone: "constructor" })).ok).toBe(false);
  });

  it("rechaza una ronda vacía o que no es un objeto", () => {
    expect(parseCloseBody(body({ reports: [] })).ok).toBe(false);
    expect(parseCloseBody(null).ok).toBe(false);
  });
});
