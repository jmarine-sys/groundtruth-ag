# MVP: Índice agroclimático por informantes

> Recorte hecho con el método de `/solana-tuc-mvp`, comprimido para una jornada de 3,5 horas.
> Hoy no se entrega: la meta es demo andando + videos grabados + borrador en Arena. Cierre real: 13/10 03:59 (hora Argentina).

## Usuario, momento wow y guion de demo

- **Usuario:** agrónoma de la zona de Pergamino que recorre lotes de trigo.
- **Problema en una frase:** el seguro satelital mira zonas de ~20 km y no ve el lote; a veces el campo se seca y el seguro no paga (riesgo base). Desde la Res. SSN 315/2026 (B.O. 23/07/2026) la aseguradora tiene que informar ese riesgo.
- **Momento wow:** "El índice de clima dice que la zona está normal, el panel de campo dice sequía: se marca el riesgo base, se paga a los informantes y la cobertura de riesgo base le paga sola al productor asegurado: cubre justo el caso que el satélite no ve (OD-20)."

Guion (5 pasos):
1. La agrónoma conecta Phantom (devnet) y carga su reporte: trigo, "por debajo de lo normal", y qué % de los demás cree que dirá lo mismo.
2. Firma: el reporte queda registrado en Solana con fecha y hora (hash en un Memo).
3. Se cierra la ronda con 5 reportes (4 precargados + 1 falso a propósito). La IA marca el falso.
4. Se calcula el puntaje de cada informante y cada uno cobra en SOL de devnet (en producción, USDC).
5. Se ve el índice: clima normal / panel sequía → divergencia → con 3 o más reportes válidos, la cobertura de riesgo base paga sola al asegurado. Links al explorador.

## Tipo de producto y flujo central

Tipo: **Pagos y cobros** + registro verificable (pago con registro onchain).
Por qué cadena: registro que ni la aseguradora ni el productor controlan, pagos automáticos a los informantes, índice público que cualquiera puede consultar.

## Entra / Después / No entra

| Entra (máx. 3) | Esfuerzo | Después (en orden) | No entra |
|---|---|---|---|
| 1. Reporte firmado y registrado onchain (Memo) | S | Programa Anchor propio (reglas onchain) | Mainnet, verificación de identidad |
| 2. Cierre de ronda: clima + puntaje + IA → pagos onchain | M | Commit-reveal (ocultar reportes hasta el cierre) | Varias zonas o cultivos |
| 3. Panel del índice con divergencia + pago de la cobertura de riesgo base | M | Login con email (sin Phantom) | App móvil, disputas |

## Real vs. simulado

| Parte | Estado |
|---|---|
| Transacciones en devnet (Memo + transferencias) | Real |
| Datos de clima (Open-Meteo, sin clave) | Real |
| Puntaje de peer prediction | Real (cálculo) |
| Detección del reporte falso con IA (Claude) | Real; si Claude no está disponible la ronda se suspende, sin plan B (OD-26) |
| 4 informantes precargados | Simulado, se dice a cámara |
| Fondo del sponsor y asegurado de demo | Simulado, se dice a cámara |
| Sequía para mostrar la divergencia | Datos históricos o fijados a mano, se dice a cámara |

## Riesgo técnico a probar primero

- Dev A: firmar una transacción Memo desde Phantom en devnet (30 min).
- Dev B: que la API de Claude responda con la clave del equipo. Sin clave no cierra ninguna ronda (OD-26): es bloqueante para la demo.

## Definición de listo

- En una URL pública, un usuario con Phantom en devnet completa el recorrido (reportar → cerrar ronda → ver índice y pagos) en menos de 3 minutos, sin ayuda.
- Al menos 1 transacción Memo del reporte + las transferencias de recompensa + 1 pago de la cobertura de riesgo base visibles en Solana Explorer (devnet).
- README en inglés que dice qué es real, qué es simulado y que corre en devnet.
