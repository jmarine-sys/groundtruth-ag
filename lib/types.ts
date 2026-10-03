// Tipos compartidos entre Dev A y Dev B. Siguen proyecto/contratos.md: no cambiar sin avisar.

export type Signal = "below" | "normal";

export interface Report {
  zone: string;
  crop: string;
  wallet: string;
  signal: Signal;
  /** 0-100: qué % de los demás informantes cree que responderá "below". */
  predicted_pct: number;
  note: string;
  ts: string;
  memo_sig?: string;
  synthetic?: boolean;
}

export interface Weather {
  source: "open-meteo" | "fixed";
  /** Humedad del suelo 3-9 cm, promedio de los últimos 7 días (m³/m³). */
  soil_moisture: number | null;
  precip_30d_mm: number;
  /** Promedio de lluvia de la misma ventana de 30 días en los 5 años anteriores. */
  baseline_30d_mm: number;
}

export interface Flag {
  wallet: string;
  reason: string;
}

export interface Score {
  wallet: string;
  score: number;
  reward: number;
}

export interface RoundResult {
  zone: string;
  /** 0 (sin estrés) a 1 (estrés severo). Fórmula fija: ver lib/index.ts. */
  index: number;
  satellite_status: Signal;
  panel_status: Signal;
  divergence: boolean;
  weather: Weather;
  flags: Flag[];
  scores: Score[];
  explanation: string;
  model: string;
}
