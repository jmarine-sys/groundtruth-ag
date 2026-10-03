# Contratos entre Dev A y Dev B (congelados en el Bloque 0)

Cambiar algo de acá requiere avisar a los dos.

## Reporte (`Report`)

```json
{
  "zone": "pergamino",
  "crop": "wheat",
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

El servidor revisa la ronda antes de cerrarla ([lib/validation.ts](../lib/validation.ts)) y no modifica los datos (el hash firmado onchain sigue valiendo):

- `wallet` tiene que ser una dirección de Solana válida, y **una sola por ronda** (OD-20).
- `note` y `crop` no pueden estar vacíos; `note` hasta 500 caracteres.
- `predicted_pct` es un entero de 0 a 100; `signal` es `"below"` o `"normal"`; `ts` es fecha ISO en UTC.
- Todos los reportes son de la `zone` del body, que tiene que existir.

Errores: `400 { "error": "Invalid round: reports.1.note: note is empty" }` si algo de lo anterior falla o el JSON está roto; `503` si Open-Meteo no responde (OD-22) o si la revisión de Claude no está disponible (OD-23). Con `503` la ronda se suspende: no se marca ni se paga a nadie.

Respuesta (`RoundResult`):

```json
{
  "zone": "pergamino",
  "index": 0.72,
  "satellite_status": "normal",
  "panel_status": "below",
  "divergence": true,
  "weather": { "source": "open-meteo", "soil_moisture": 0.21, "precip_30d_mm": 18, "baseline_30d_mm": 61 },
  "flags": [{ "wallet": "<pubkey>", "reason": "Copies word for word the note of informant 3ck3…UNTD." }],
  "scores": [{ "wallet": "<pubkey>", "score": 1.4, "reward": 14 }],
  "explanation": "Dos frases para mostrar en pantalla.",
  "model": "claude-haiku-4-5-20251001"
}
```

- `model`: el modelo de Claude que hizo la revisión, tal como lo informa la API (hoy `claude-haiku-4-5-20251001`, OD-06).

- `weather`: `source` es `"open-meteo"` o `"fixed"`; `soil_moisture` (m³/m³, puede ser `null`); `precip_30d_mm` es la lluvia de los últimos 30 días y `baseline_30d_mm` el promedio de esa ventana en los 5 años anteriores. Es la forma de `lib/types.ts`, que ya usa la pantalla de Dev A.
- `index`: 0 (sin estrés) a 1 (estrés severo). Fórmula fija (OD-03): `0.5 * estrés climático + 0.5 * proporción del panel que dice "below"`, sin contar los reportes marcados. La IA no define el número: solo marca reportes y escribe `explanation`.
- `reward`: unidades del token de prueba a transferir a cada wallet (las transfiere Dev A).
- `satellite_status`: en el MVP sale de clima (Open-Meteo); NDVI queda para "Después".
