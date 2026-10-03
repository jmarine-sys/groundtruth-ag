// Zonas y lotes de la demo. Datos fijos: en el producto completo el lote se carga al
// crear la cuenta del informante y la celda sale de la grilla del índice de la aseguradora.

export interface Zone {
  name: string;
  /** Punto donde se consulta el clima (centro de la celda). */
  lat: number;
  lon: number;
  /** Media celda en grados: ~10 km hacia cada lado, celda de ~20 × 20 km. */
  halfLat: number;
  halfLon: number;
}

export const ZONES: Record<string, Zone> = {
  // 0,09° de latitud ≈ 10 km; en longitud se divide por cos(33,9°) ≈ 0,83.
  pergamino: { name: "Pergamino, Buenos Aires", lat: -33.89, lon: -60.57, halfLat: 0.09, halfLon: 0.108 },
};

/** Lote del informante que firma en la demo (registrado al crear la cuenta, simulado). */
export const DEMO_LOT = {
  zone: "pergamino",
  label: "Registered lot · wheat · 120 ha",
  lat: -33.925,
  lon: -60.525,
};
