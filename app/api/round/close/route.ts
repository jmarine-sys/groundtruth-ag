import { reviewPanel } from "@/lib/ai";
import { computeIndex } from "@/lib/index";
import { rewards } from "@/lib/scoring";
import type { Report, RoundResult, Weather } from "@/lib/types";
import { climateStatus, fetchWeather, ZONES } from "@/lib/weather";

/** Unidades del token de prueba que el sponsor pone por ronda (simulado, se declara en la demo). */
const POOL = Number(process.env.ROUND_POOL ?? 100);

interface CloseBody {
  zone: string;
  reports: Report[];
  /** Solo para la demo: fija el clima (por ejemplo, una sequía histórica). Se declara a cámara. */
  weather_override?: Omit<Weather, "source">;
}

export async function POST(request: Request) {
  const body = (await request.json()) as CloseBody;
  if (!ZONES[body.zone]) {
    return Response.json({ error: `Zona desconocida: ${body.zone}` }, { status: 400 });
  }
  if (!Array.isArray(body.reports) || body.reports.length === 0) {
    return Response.json({ error: "La ronda no tiene reportes" }, { status: 400 });
  }

  let weather: Weather;
  if (body.weather_override) {
    weather = { source: "fixed", ...body.weather_override };
  } else {
    try {
      weather = await fetchWeather(body.zone);
    } catch (error) {
      return Response.json(
        { error: `No se pudo leer el clima: ${(error as Error).message}` },
        { status: 502 },
      );
    }
  }

  const satellite_status = climateStatus(weather);
  const review = await reviewPanel(body.reports, weather, satellite_status);
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
