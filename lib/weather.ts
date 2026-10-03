import type { Signal, Weather } from "./types";
import { ZONES } from "./zones";

export { ZONES };

const TZ = "America%2FArgentina%2FBuenos_Aires";
const BASELINE_YEARS = 5;
/** Lluvia de los últimos 30 días por debajo de este % del promedio = estrés hídrico. */
const DRY_RATIO = 0.6;
/** Tiempo máximo de espera por cada consulta a Open-Meteo. */
const TIMEOUT_MS = 8000;

/**
 * Clima real de Open-Meteo (sin clave): lluvia de los últimos 30 días contra el
 * promedio de la misma ventana en los 5 años anteriores, y humedad del suelo.
 */
export async function fetchWeather(zone: string): Promise<Weather> {
  const z = ZONES[zone];
  if (!z) throw new Error(`Zona desconocida: ${zone}`);

  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${z.lat}&longitude=${z.lon}` +
    `&daily=precipitation_sum&hourly=soil_moisture_3_to_9cm&past_days=30&forecast_days=1&timezone=${TZ}`;
  const current = await getJson(forecastUrl);

  const days: string[] = current.daily.time.slice(0, 30);
  const precip30 = sum(current.daily.precipitation_sum.slice(0, 30));
  const soil: (number | null)[] = current.hourly.soil_moisture_3_to_9cm;
  const lastWeek = soil.slice(-24 * 8, -24).filter((v): v is number => v !== null);

  const start = days[0];
  const end = days[days.length - 1];
  const thisYear = Number(start.slice(0, 4));
  const pastTotals = await Promise.all(
    Array.from({ length: BASELINE_YEARS }, (_, i) => thisYear - 1 - i).map(
      async (year) => {
        const url =
          `https://archive-api.open-meteo.com/v1/archive?latitude=${z.lat}&longitude=${z.lon}` +
          `&start_date=${shiftYear(start, year)}&end_date=${shiftYear(end, year)}` +
          `&daily=precipitation_sum&timezone=${TZ}`;
        const past = await getJson(url);
        return sum(past.daily.precipitation_sum);
      },
    ),
  );

  return {
    source: "open-meteo",
    soil_moisture: lastWeek.length ? round3(sum(lastWeek) / lastWeek.length) : null,
    precip_30d_mm: round1(precip30),
    baseline_30d_mm: round1(sum(pastTotals) / pastTotals.length),
  };
}

export function climateStatus(w: Weather): Signal {
  return w.precip_30d_mm < DRY_RATIO * w.baseline_30d_mm ? "below" : "normal";
}

/** Estrés climático 0-1: cuánto falta de lluvia respecto del promedio. */
export function climateStress(w: Weather): number {
  if (w.baseline_30d_mm <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - w.precip_30d_mm / w.baseline_30d_mm));
}

async function getJson(url: string) {
  // Si Open-Meteo no contesta a tiempo, se corta y la ronda se suspende (no queda colgada).
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Open-Meteo respondió ${res.status}`);
  return res.json();
}

function shiftYear(date: string, year: number): string {
  return `${year}${date.slice(4)}`;
}

function sum(xs: (number | null)[]): number {
  return xs.reduce<number>((a, b) => a + (b ?? 0), 0);
}

function round1(x: number) {
  return Math.round(x * 10) / 10;
}

function round3(x: number) {
  return Math.round(x * 1000) / 1000;
}
