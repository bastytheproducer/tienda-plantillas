# TODO — Costo de envío según domicilio (Barril & Miel)

## Objetivo
Agregar el costo de envío al carrito según la comuna/dirección del cliente,
con retiro en tienda gratis y estrategias de enganche justas.

## Estado: en progreso

- [x] 1. `script.js`: agregar selector Retiro/Despacho y cálculo de envío por zona (Haversine desde Puerto Montt).
- [x] 2. `index.html`: agregar selector de modo de entrega y bloque de resumen de envío.
- [x] 3. `styles.css`: estilos para el selector y el resumen de envío.
- [x] 4. `create-preference.js`: agregar el costo de envío como ítem del pago y guardarlo en metadata.
- [x] 5. `webhook.js`: mostrar el costo de envío en los correos y WhatsApp.
- [x] 6. Commit + push a GitHub y verificación en producción. (commit `73d0bbf`)

## Reglas de envío
- Retiro en tienda → $0 (gratis). Dirección: Puerto Montt, Pasaje Tres Volcanes 30.
- Despacho a domicilio → según zona de distancia desde Puerto Montt:
  - Z1: 0–8 km → $1.990
  - Z2: 8–20 km → $3.490
  - Z3: 20–40 km → $4.990
  - Z4: 40–100 km → $6.990
  - Z5: +100 km → $9.990
- Envío GRATIS si el subtotal supera $25.000 (despacho).
