# Barril y Miel — Tienda de cerveza artesanal

Tienda online completa: catálogo de cervezas, carrito, checkout con Mercado Pago
(acepta tarjetas, transferencia y otros medios) y confirmación automática de
pedidos por correo. Sin servidor propio, sin costo fijo mientras no haya ventas.

## Qué hace cada parte

- `public/` — el sitio que ve la gente (catálogo, carrito, checkout).
- `data/products.json` — tu catálogo de cervezas. Es la ÚNICA fuente de verdad
  de precios; el navegador nunca decide el precio, siempre se valida en el
  servidor.
- `api/create-preference.js` — genera el pago en Mercado Pago cuando alguien
  hace clic en "Pagar ahora".
- `api/webhook.js` — Mercado Pago le avisa a esto cuando un pago se aprueba;
  ahí se dispara la confirmación del pedido por correo.
- `api/admin/*` — panel privado para ver ventas y gestionar el catálogo.

## Paso 1 — Cuenta de Mercado Pago (gratis)

1. Crea una cuenta en https://www.mercadopago.cl si no tienes una, a tu nombre.
2. Entra a https://www.mercadopago.cl/developers/panel → crea una aplicación.
3. Copia el **Access Token de producción** (no el de pruebas). Ese token va en
   la variable `MP_ACCESS_TOKEN`.
4. Asocia la cuenta bancaria donde quieres recibir los pagos. Los retiros se
   hacen desde Mercado Pago directamente.

## Paso 2 — Envío de correos automáticos (Resend, gratis para partir)

1. Crea una cuenta en https://resend.com
2. Verifica un dominio propio o usa el dominio de prueba mientras consigues uno.
3. Copia tu API key → variable `RESEND_API_KEY`.
4. Define `FROM_EMAIL` con el correo remitente que verificaste.

## Paso 3 — Agrega tus cervezas y fotos

El catálogo vive en `data/products.json`. Cada cerveza tiene `id`, `name`,
`format` (ej: "Lata 473 ml", "Botella 330 ml"), `price` en CLP, `tagline` con
notas de sabor y `file` con la imagen que se muestra en la tienda.

## Paso 4 — Publicar el sitio (Vercel, gratis)

1. Crea una cuenta en https://vercel.com (puedes entrar con GitHub).
2. Sube esta carpeta a un repositorio de GitHub.
3. En Vercel: "Add New Project" → importa ese repositorio.
4. En "Environment Variables" carga las variables de `.env.example` con tus
   valores reales.
5. Deploy. Vercel te da una URL gratis (`tu-proyecto.vercel.app`) — actualiza
   `SITE_URL` con esa URL exacta y vuelve a hacer deploy (Redeploy).
6. En el panel de Mercado Pago → Notificaciones/Webhooks, confirma que la URL
   `https://tu-proyecto.vercel.app/api/webhook` esté recibiendo eventos de pago.

## Panel admin (`/admin`)

Acceso privado para revisar ventas y gestionar el catálogo sin tocar código.
Configura `ADMIN_USER` y `ADMIN_PASSWORD` en las variables de entorno, más
`ADMIN_SESSION_SECRET` (genera uno con `openssl rand -hex 32`).

Para guardar cambios del catálogo desde el admin necesitas conectar una base
gratis de Upstash Redis (`UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`).

## Cómo agregar una cerveza nueva

1. Sube la foto del producto a `public/plantillas/`.
2. Agrega un bloque nuevo en `data/products.json` con un `id` único.
3. Vuelve a hacer deploy (o si conectaste GitHub a Vercel, con cada `git push`
   se actualiza solo).

## Qué NO incluye este sitio (y por qué)

- No promete "dinero garantizado": ningún negocio real lo garantiza.
- No guarda tus credenciales de Mercado Pago en ningún archivo de este proyecto.
- No incluye publicidad ni tráfico: el sitio está listo para vender, pero
  conseguir visitas (redes sociales, SEO, algo de pauta paga) sigue siendo
  trabajo tuyo.

