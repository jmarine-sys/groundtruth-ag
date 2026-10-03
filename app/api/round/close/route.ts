import { type Review, reviewPanel } from "@/lib/ai";
import { computeIndex } from "@/lib/index";
import { rewards } from "@/lib/scoring";
import type { RoundResult, Weather } from "@/lib/types";
import { parseCloseBody } from "@/lib/validation";
import { climateStatus, fetchWeather } from "@/lib/weather";

/** Unidades del token de prueba que el sponsor pone por ronda (simulado, se declara en la demo). */
const POOL = Number(process.env.ROUND_POOL ?? 100);

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Body is not valid JSON" }, { status: 400 });
  }
  const parsed = parseCloseBody(input);
  if (!parsed.ok) {
    return Response.json({ error: `Invalid round: ${parsed.error}` }, { status: 400 });
  }
  const body = parsed.body;

  let weather: Weather;
  if (body.weather_override) {
    weather = { source: "fixed", ...body.weather_override };
  } else {
    try {
      weather = await fetchWeather(body.zone);
    } catch (error) {
      // Sin clima no hay índice: la ronda se suspende hasta que Open-Meteo vuelva (OD-19).
      console.error("Open-Meteo no respondió:", error);
      return Response.json(
        { error: "Weather service unavailable: rounds are suspended until it is back." },
        { status: 503 },
      );
    }
  }

  const satellite_status = climateStatus(weather);
  let review: Review;
  try {
    review = await reviewPanel(body.reports, weather, satellite_status);
  } catch (error) {
    // Sin la revisión de la IA no se juzga a nadie: la ronda se suspende hasta que vuelva (OD-20).
    console.error("La revisión con IA no está disponible:", error);
    return Response.json(
      { error: "AI review unavailable: rounds are suspended until it is back." },
      { status: 503 },
    );
  }
  const { index, panel_status } = computeIndex(body.reports, review.flags, weather);

  const result: RoundResult = {
    zone: body.zone,
    index,
    satellite_status,
    panel_status,
    divergence: satellite_status !== panel_status,
    weather,
    flags: review.flags,
    scores: rewards(body.reports, review.flags, POOL),
    explanation: review.explanation,
    model: review.model,
  };
  return Response.json(result);
}
