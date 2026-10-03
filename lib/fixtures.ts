import type { Report } from "./types";

// Informantes precargados para la demo (synthetic: true, se declara a cámara).
// Las wallets se reemplazan por las 4 wallets de devnet del equipo (.env.local).
// El cuarto es el reporte falso a propósito: copia la nota del primero (colusión).
// Las notas no niegan la lluvia de la zona (Open-Meteo puede dar un mes normal o húmedo):
// cuentan lo que el promedio zonal no ve, que es el riesgo base que muestra la demo.
export function seedReports(wallets: string[], ts = new Date().toISOString()): Report[] {
  const base = { zone: "pergamino", crop: "wheat", synthetic: true } as const;
  const copied = "The storms missed our upland lots: the farm gauge caught a fraction of the district rain and leaves roll by midday.";
  const rows: Omit<Report, keyof typeof base | "wallet" | "ts">[] = [
    { signal: "below", predicted_pct: 70, note: copied },
    { signal: "below", predicted_pct: 65, note: "Most of the rain came in one downpour that ran off the slopes; soil is dry again at 10 cm and tillering is poor." },
    { signal: "below", predicted_pct: 80, note: "Yellowing on sandy headlands that hold little water after rain; the farmer cancelled the second fertilizer pass." },
    { signal: "below", predicted_pct: 90, note: copied },
  ];
  const start = new Date(ts).getTime();
  return rows.map((row, i) => ({
    ...base,
    ...row,
    wallet: wallets[i],
    ts: new Date(start + i * 60_000).toISOString(),
  }));
}

/** Clima normal fijo, por si el clima real del día no sirve para mostrar la divergencia (se declara a cámara). */
export const DEMO_NORMAL_WEATHER = {
  soil_moisture: 0.27,
  precip_30d_mm: 58,
  baseline_30d_mm: 61,
};
