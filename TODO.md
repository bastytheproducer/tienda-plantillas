# TODO — Actualizar repo a versión v5 (Barril & Miel + mapa + WhatsApp)

## Objetivo
Actualizar el repositorio GitHub con la versión v5 del zip `tienda-plantillas_5.zip`,
que agrega mapa interactivo en checkout, carrito con múltiples unidades, aviso WhatsApp
y notificación Waze — **manteniendo el fix de Upstash (POST en body + key barrilymiel:products:v2)**.

## Pasos

- [x] 1. Copiar frontend v5: `index.html` (con Leaflet + mapa), `script.js` (carrito múltiple + mapa), `styles.css` (estilos mapa), `gracias.html`
- [x] 2. Copiar admin v5: `admin.html` (pedidos con dirección + Waze), `admin.js` (función wazeUrl)
- [x] 3. Copiar APIs v5: `create-preference.js` (metadata con lat/lng), `webhook.js` (Waze + WhatsApp + STORE_NOTIFY_EMAIL), `api/admin/products.js` (validación campos), `api/admin/orders.js` (datos de dirección)
- [x] 4. Mantener `lib/kv.js` con el fix POST + clave Redis `barrilymiel:products:v2`
- [x] 5. Mantener imágenes `.png` en lugar de volver a `.jpg`
- [x] 6. Copiar `README.md`, `.env.example` (agregar CALLMEBOT_PHONE, CALLMEBOT_APIKEY)
- [x] 7. Commit + push a GitHub

## Mejora visual del catálogo ✅

- [x] Agregar imagen real a cada producto del catálogo (APA, Ale, Lager, Hidromiel)
  - Archivos: `public/images/catalogo-ale.png`, `catalogo-lager.png`, `catalogo-ipa.png`, `catalogo-hidromiel.png`
- [x] Agregar campo `image` en `data/products.json`
- [x] Mostrar imagen con `object-fit:cover` en cada tarjeta con zoom al hover
- [x] Agregar ícono 🛒 al botón "Carrito" en la barra superior
- [x] Commit + push a GitHub (`826ee7e`)
