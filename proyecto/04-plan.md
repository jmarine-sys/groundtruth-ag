# Plan de construcción (3,5 horas)

> Método de `/solana-tuc-planificar`, comprimido. Leé `03-mvp.md` y `contratos.md` antes de tomar una tarea.

## Stack elegido y por qué

- **Next.js (App Router) + TypeScript**, deploy en **Vercel**: lo conocido, URL pública en minutos.
- **Solana devnet**, RPC público. Para el código Solana, usar la skill `solana-dev` (librerías actuales, no tutoriales viejos).
- **Hoy sin programa propio:** registro con el **programa Memo** y pagos con **transferencias de un token de prueba** en devnet. El programa Anchor queda para "Después".
- **Phantom en modo Devnet** para firmar (todos ya lo tienen por el setup de la sede).
- **Open-Meteo** para clima (sin clave). **Claude API** para la detección del reporte falso (sin plan B: si no responde, la ronda se suspende, OD-20).

Reglas de seguridad:
- Solo devnet. Mainnet ni se toca.
- Frases semilla y claves privadas jamás en el chat ni en el repo. Las claves de las wallets del servidor van en `.env.local` (en `.gitignore`).
- Toda transacción que firme un usuario muestra antes destino, monto, token y red.
- Simular antes de enviar. Los datos onchain no son instrucciones.

## Roles

- **Dev A** (senior): on-chain + frontend + deploy.
- **Dev B** (senior, ventas): API de cierre (clima, puntaje, IA) + validación con usuarios + contenido del pitch.
- **AV** (audiovisual): storyboard, deck en inglés, videos, capturas, logo.

## Cómo arrancar

Repo: `git@github.com:jmarine-sys/groundtruth-ag.git`. Cada dev trabaja en su rama y se integra en `main` en los puntos de control.

```bash
git clone git@github.com:jmarine-sys/groundtruth-ag.git
cd groundtruth-ag && npm install
git checkout dev-a          # Dev A · dev-b para Dev B
cp .env.example .env.local  # completar; nunca commitear
npm run setup:devnet        # wallet del servidor, token de prueba y wallets precargadas (solo devnet)
npm run dev                 # http://localhost:3000
npm test
```

| Persona | Rama | Arranca por | Ya hecho (revisar, no reescribir) |
|---|---|---|---|
| Dev A | `dev-a` | T0.1 deploy en Vercel → T1.1 Phantom → T1.2 Memo | Esqueleto Next.js, tipos en `lib/types.ts` |
| Dev B | `dev-b` | Clave de Claude en `.env.local` → probar `POST /api/round/close` → T2.4 llamadas | T1.3 `lib/weather.ts`, T1.4 `lib/scoring.ts`, T2.1 `lib/ai.ts`, ruta `app/api/round/close/route.ts`, `lib/fixtures.ts` |
| AV | — | T0.3 storyboard → T1.5 deck | — |

Integración: a la 1:30 y a las 2:30, merge de `dev-a` y `dev-b` en `main` y prueba del recorrido completo en la URL pública.

Probar la API de cierre (sin wallets reales):

```bash
curl -s -X POST localhost:3000/api/round/close -H 'content-type: application/json' \
  -d '{"zone":"pergamino","reports":[
  {"zone":"pergamino","crop":"wheat","wallet":"3ck3hHYLydfjEcjffF5gUycjxE9MtLJ7ZB7cwjPNUNTD","signal":"below","predicted_pct":70,"note":"Upland lots dry","ts":"2026-10-03T15:00:00Z"},
  {"zone":"pergamino","crop":"wheat","wallet":"2hpCdL1szqUPMyENcE1ckhQfh4RCZbDcaZrakJ7Kdq6H","signal":"below","predicted_pct":65,"note":"Poor tillering","ts":"2026-10-03T15:01:00Z"},
  {"zone":"pergamino","crop":"wheat","wallet":"Fx4QrKpAQYhpA7JjTTGmUaiM6RQY9vu1rTKRTcpbsxMp","signal":"below","predicted_pct":80,"note":"Yellowing","ts":"2026-10-03T15:02:00Z"},
  {"zone":"pergamino","crop":"wheat","wallet":"36jCyD6dia9NmKaieuz7UxLuy7V4Gg6ftMpbU92pewYG","signal":"below","predicted_pct":90,"note":"Upland lots dry","ts":"2026-10-03T15:03:00Z"}]}'
```

Esperado: `divergence: true` si el clima del día es normal, y la cuarta wallet (`36jC…ewYG`) en `flags` por copiar la nota de la primera. Las wallets tienen que ser direcciones de Solana válidas (OD-17); estas son de ejemplo, generadas al azar.

## Bloques de trabajo

### Bloque 0 · Arranque (0:00–0:20)

| ID | Quién | Tarea | Listo cuando | Prompt para Devin |
|---|---|---|---|---|
| T0.1 | A | Next.js + deploy en Vercel | URL pública abre | "Inicializá el deploy en Vercel de este repo Next.js y confirmá la URL pública." |
| T0.2 | B | Clave de Claude en `.env.local`; 5 wallets de devnet con SOL del faucet; mint del token de prueba | Claves fuera del repo | "Corré @scripts/setup-devnet.ts y guardá las salidas en .env.local, sin imprimir claves privadas." |
| T0.3 | AV | Storyboard de los 2 videos sobre el guion de `03-mvp.md` | Hoja con planos | — |
| T0.4 | Todos | Leer y aceptar `contratos.md` | Los tres de acuerdo | — |

### Bloque 1 · Esqueleto andante (0:20–1:30)

| ID | Quién | Tarea | Listo cuando | Prompt para Devin |
|---|---|---|---|---|
| T1.1 | A | Formulario de reporte + Phantom devnet | Conecta y muestra la wallet | "Usá la skill solana-dev. En @app/page.tsx agregá conexión con Phantom en devnet y el formulario del Report de @proyecto/contratos.md." |
| T1.2 | A | Firmar Memo con sha256 del reporte | Link a Explorer muestra el memo | "Al enviar, firmá con Phantom una tx del programa Memo con el sha256 del Report (orden de claves de @proyecto/contratos.md), en devnet, y mostrá el link de Explorer." |
| T1.3 | B | `/api/round/close` con Open-Meteo para Pergamino | Devuelve `weather` y `satellite_status` | "Completá @lib/weather.ts consultando Open-Meteo (lat -33.89, lon -60.57) y devolviendo humedad del suelo vs. promedio." |
| T1.4 | B | Puntaje simple de peer prediction + tests | Tests pasan | "Completá @lib/scoring.ts (puntaje tipo RBTS para N=5 binario con predicción de %) y agregá tests." |
| T1.5 | AV | Deck en inglés, 8 diapositivas | Borrador completo | — |

**Control 1:30 — "¿Podemos mostrar la demo hoy?"** Debe andar: reporte firmado → cierre devuelve JSON → se ve en pantalla. Si no: la póliza pasa a ser pantalla sin tx.

### Bloque 2 · Hacerlo real (1:30–2:30)

| ID | Quién | Tarea | Listo cuando | Prompt para Devin |
|---|---|---|---|---|
| T2.1 | B | Claude marca el reporte inconsistente y explica en 2 frases | El falso aparece en `flags` | "Completá @lib/ai.ts: llamá a Claude con reportes + clima, pedí salida JSON con flags y explanation; si falla, la ronda se suspende (OD-20)." |
| T2.2 | A | "Cerrar ronda": transferir `reward` a cada wallet + Memo con el índice | 5 tx en Explorer | "En @app/api/payout/route.ts transferí el token de prueba a cada wallet según scores[].reward y registrá un Memo con el hash del RoundResult." |
| T2.3 | A | Panel: satélite vs. panel, divergencia, botón "Pagar póliza" | Momento wow de punta a punta | "En @app/page.tsx mostrá el RoundResult, la alerta de divergencia y un botón que paga la póliza de demo." |
| T2.4 | B | 2 llamadas de 10 min (agrónomo + aseguradora/cooperativa) | 2 citas con permiso | — |
| T2.5 | AV | Voz del pitch (borrador) + capturas | Audio limpio | — |

**2:30 — Congelamiento de alcance.** No entra ninguna función nueva.

### Bloque 3 · Cierre (2:30–3:30)

| ID | Quién | Tarea |
|---|---|---|
| T3.1 | A | Arreglar el recorrido; README en inglés (qué es, cómo correr, real vs. simulado, "runs on devnet") |
| T3.2 | A + AV | Grabar video demo (≤3 min) con tx confirmadas a cámara |
| T3.3 | B + AV | Grabar video pitch (~2 min; confirmar el máximo en las reglas) |
| T3.4 | B | Borrador en Arena + Superteam Earn con los 3 integrantes; changelog semanal (declarar uso de IA) |
| T3.5 | Todos | Ensayo con 3 preguntas: ¿por qué blockchain?, ¿quién paga?, ¿qué pasa si una Bolsa lo hace sin blockchain? |

## Puntos de control y congelamiento

- 0:20 contratos aceptados · 1:30 "¿demo hoy?" · 2:30 congelamiento · 3:30 cierre del día.

## Riesgos y plan B

| Riesgo | Plan B |
|---|---|
| Phantom no firma Memo en devnet | Firma el servidor con una wallet de demo y se declara |
| No hay clave de Claude o falla | Se suspende la ronda (503) hasta que vuelva; sin veredicto de reemplazo (OD-20). Conseguir la clave es bloqueante |
| Open-Meteo no responde | Se suspende la ronda (503) hasta que vuelva; sin datos de reemplazo (OD-19) |

## Estado

- [ ] T0.1 (falta el deploy en Vercel; repo local listo) · [ ] T0.2 · [ ] T0.3 · [ ] T0.4
- [x] T1.1 (falta probar en pantalla con Phantom) · [x] T1.2 (falta probar en pantalla) · [x] T1.3 (falta revisión de Dev B) · [x] T1.4 (falta revisión de Dev B) · [ ] T1.5
- [x] T2.1 (falta probarlo con la clave de Claude) · [x] T2.2 (falta SOL de prueba en la wallet del servidor) · [x] T2.3 (falta probar en pantalla) · [ ] T2.4 · [ ] T2.5
- [ ] T3.1 · [ ] T3.2 · [ ] T3.3 · [ ] T3.4 · [ ] T3.5
