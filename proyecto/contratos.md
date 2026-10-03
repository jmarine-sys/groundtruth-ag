# Contratos entre Dev A y Dev B (congelados en el Bloque 0)

Cambiar algo de acá requiere avisar a los dos.

## Reporte (`Report`)

```json
{
  "zone": "pergamino",
  "crop": "trigo",
  "wallet": "<pubkey base58>",
  "signal": "below",
  "predicted_pct": 60,
  "note": "Hojas enruladas en lotes altos, sin lluvia hace 25 días",
  "ts": "2026-10-03T15:20:00Z",
  "memo_sig": "<firma de la tx Memo, opcional>",
  "synthetic": false
}
```

- `signal`: `"below"` (por debajo de lo normal) o `"normal"`.
- `predicted_pct`: 0-100, qué % de los demás informantes cree que responderá `"below"`.
- Hash registrado onchain: `sha256` del JSON del reporte **sin** `memo_sig`, con las claves en este orden.
- `synthetic: true` marca los reportes precargados (se declaran en la demo).

## Cierre de ronda

`POST /api/round/close` — body: `{ "zone": "pergamino", "reports": Report[] }`

Respuesta (`RoundResult`):

```json
{
  "zone": "pergamino",
  "index": 0.72,
  "satellite_status": "normal",
  "panel_status": "below",
  "divergence": true,
  "weather": { "source": "open-meteo", "soil_moisture": 0.21, "baseline": 0.24, "precip_30d_mm": 18 },
  "flags": [{ "wallet": "<pubkey>", "reason": "Reporta normal con 30 días sin lluvia y 4 de 5 vecinos en sequía" }],
  "scores": [{ "wallet": "<pubkey>", "score": 1.4, "reward": 14 }],
  "explanation": "Dos frases para mostrar en pantalla.",
  "model": "claude-sonnet-5-5 | rule-based"
}
```

- `index`: 0 (sin estrés) a 1 (estrés severo). Fórmula fija: `0.5 * clima + 0.5 * consenso del panel ponderado por puntaje`. La IA no define el número: solo baja el peso de los reportes marcados y escribe `explanation`.
- `reward`: unidades del token de prueba a transferir a cada wallet (las transfiere Dev A).
- `satellite_status`: en el MVP sale de clima (Open-Meteo); NDVI queda para "Después".
