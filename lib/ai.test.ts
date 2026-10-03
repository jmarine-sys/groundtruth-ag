import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { seedReports } from "./fixtures";

// Claude simulado: los tests nunca llaman a la API real ni gastan créditos.
const { parse } = vi.hoisted(() => ({ parse: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { parse };
  },
}));

import { mergeFlags, panelSummary, reviewPanel, ReviewUnavailableError } from "./ai";

const reports = seedReports(["A1", "B2", "C3", "D4"], "2026-10-03T15:00:00Z");
const weather = { source: "fixed" as const, soil_moisture: 0.27, precip_30d_mm: 58, baseline_30d_mm: 61 };

const savedKey = process.env.ANTHROPIC_API_KEY;
beforeEach(() => {
  parse.mockReset();
  process.env.ANTHROPIC_API_KEY = "test-key";
});
afterEach(() => {
  process.env.ANTHROPIC_API_KEY = savedKey;
});

describe("sin clave de Claude (workaround de demo)", () => {
  it("revisa con la regla fija, marca la nota copiada y no llama a Claude", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_AUTH_TOKEN;
    const review = await reviewPanel(reports, weather, "normal");
    expect(parse).not.toHaveBeenCalled();
    expect(review.model).toBe("rule-based (no Claude key)");
    expect(review.flags.map((f) => f.wallet)).toEqual(["D4"]);
  });
});

describe("mergeFlags", () => {
  it("deja una sola marca por wallet y gana la primera", () => {
    const merged = mergeFlags(
      [{ wallet: "D4", reason: "copy" }],
      [
        { wallet: "D4", reason: "model" },
        { wallet: "B2", reason: "model" },
      ],
    );
    expect(merged).toEqual([
      { wallet: "D4", reason: "copy" },
      { wallet: "B2", reason: "model" },
    ]);
  });
});

/** Corre la revisión y devuelve el error con que falla (o null si no falla). */
function reviewError() {
  return reviewPanel(reports, weather, "normal").then(
    () => null,
    (error: unknown) => error,
  );
}

describe("panelSummary", () => {
  it("cuenta solo los reportes no marcados", () => {
    const flags = [{ wallet: "D4", reason: "copy" }];
    expect(panelSummary(reports, flags)).toBe("3 of 3 valid reports say the crop is below normal (1 flagged and excluded).");
  });

  it("sin marcas no agrega la aclaración", () => {
    expect(panelSummary(reports.slice(0, 3), [])).toBe("3 of 3 valid reports say the crop is below normal.");
  });
});

describe("reviewPanel", () => {
  it("si Claude no responde, no juzga a nadie: la revisión no está disponible", async () => {
    parse.mockRejectedValueOnce(new Error("connection refused"));
    const error = await reviewError();
    expect(error).toBeInstanceOf(ReviewUnavailableError);
    expect((error as Error).message).toBe("Claude did not respond: connection refused");
  });

  it("si Claude se niega, la revisión no está disponible", async () => {
    parse.mockResolvedValueOnce({ stop_reason: "refusal", parsed_output: null, model: "claude-haiku-4-5-20251001" });
    const error = await reviewError();
    expect(error).toBeInstanceOf(ReviewUnavailableError);
    expect((error as Error).message).toBe("Claude returned no review (stop_reason: refusal)");
  });

  it("si la respuesta se corta sin JSON válido, la revisión no está disponible", async () => {
    parse.mockResolvedValueOnce({ stop_reason: "max_tokens", parsed_output: null, model: "claude-haiku-4-5-20251001" });
    expect(await reviewError()).toBeInstanceOf(ReviewUnavailableError);
  });

  it("con Claude, suma la copia textual aunque el modelo no la marque e ignora wallets inventadas", async () => {
    parse.mockResolvedValueOnce({
      stop_reason: "end_turn",
      model: "claude-haiku-4-5-20251001",
      parsed_output: {
        flags: [{ wallet: "ZZ9", reason: "not in the round" }],
        explanation: "Two sentences.",
      },
    });
    const review = await reviewPanel(reports, weather, "normal");
    expect(review.flags.map((f) => f.wallet)).toEqual(["D4"]);
    // El conteo lo pone el código: 3 válidos aunque el modelo no haya marcado la copia.
    expect(review.explanation).toBe("3 of 3 valid reports say the crop is below normal (1 flagged and excluded). Two sentences.");
    expect(review.model).toBe("claude-haiku-4-5-20251001");
  });

  it("pide la revisión a Haiku 4.5, sin effort (no lo admite) ni respaldo del servidor", async () => {
    parse.mockResolvedValueOnce({ stop_reason: "end_turn", model: "claude-haiku-4-5-20251001", parsed_output: { flags: [], explanation: "x" } });
    await reviewPanel(reports, weather, "normal");
    const request = parse.mock.calls[0][0];
    expect(request.model).toBe("claude-haiku-4-5");
    expect(request.output_config).not.toHaveProperty("effort");
    expect(request).not.toHaveProperty("fallbacks");
    expect(request).not.toHaveProperty("betas");
  });
});
