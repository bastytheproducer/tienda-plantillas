# TODO — Actualizar repo a versión v4 (Barril & Miel)

## Objetivo
Actualizar el repositorio GitHub con la versión v4 del zip `tienda-plantillas_4.zip`,
que incluye age gate 18+, formulario de despacho, datos de cerveza (estilo/ABV/volumen),
aviso legal y webhook con aviso de pedido a la tienda — **manteniendo el fix de Upstash
(POST en body + token con permisos de escritura)**.

## Pasos

- [x] 1. Copiar frontend v4: `index.html`, `script.js`, `styles.css`, `gracias.html`
- [x] 2. Copiar admin v4: `admin.html`, `admin.js`
- [x] 3. Copiar catálogo v4: `data/products.json` (esquema style/abv/volume)
- [x] 4. Copiar APIs v4: `create-preference.js`, `webhook.js`, `api/admin/products.js`, `api/admin/orders.js`
- [x] 5. Mantener `lib/kv.js` con el fix POST + cambiar clave Redis a `barrilymiel:products:v2`
- [x] 6. Eliminar archivos de descarga digital que ya no se usan: `api/download.js`, `api/admin/download.js`, `lib/sign.js`, `private-files/`
- [x] 7. Copiar `README.md`, `.env.example`, `public/images/LEEME.txt`, `package.json`, `vercel.json`
- [x] 8. Verificar que no queden referencias a archivos eliminados
- [ ] 9. Commit + push a GitHub
- [ ] 10. Verificar deploy en Vercel

