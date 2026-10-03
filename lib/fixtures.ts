import type { Report } from "./types";

// Informantes precargados para la demo (synthetic: true, se declara a cámara).
// Las wallets se reemplazan por las 4 wallets de devnet del equipo (.env.local).
// El cuarto es el reporte falso a propósito: copia la nota del primero (colusión).
export function seedReports(wallets: string[], ts = new Date().toISOString()): Report[] {
  const base = { zone: "pergamino", crop: "trigo", synthetic: true } as const;
  const copied = "Lotes de loma con hojas enruladas, sin lluvia útil hace 25 días.";
  const rows: Omit<Report, keyof typeof base | "wallet" | "ts">[] = [
    { signal: "below", predicted_pct: 70, note: copied },
    { signal: "below", predicted_pct: 65, note: "Macollaje pobre en siembras tardías, suelo seco a 10 cm." },
    { signal: "below", predicted_pct: 80, note: "Amarillamiento en cabeceras, el productor suspendió la refertilización." },
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
