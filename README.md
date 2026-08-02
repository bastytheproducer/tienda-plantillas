# Libro Mayor — Tienda automatizada de plantillas digitales

Sitio completo: catálogo, carrito, checkout con Mercado Pago (acepta tarjetas,
transferencia y otros medios), y entrega automática por correo del archivo
comprado. Sin servidor propio, sin costo fijo mientras no haya ventas.

## Qué hace cada parte

- `public/` — el sitio que ve la gente (catálogo, carrito, checkout).
- `data/products.json` — tu catálogo. Es la ÚNICA fuente de verdad de precios;
  el navegador nunca decide el precio, siempre se valida en el servidor.
- `api/create-preference.js` — genera el pago en Mercado Pago cuando alguien
  hace clic en "Pagar ahora".
- `api/webhook.js` — Mercado Pago le avisa a esto cuando un pago se aprueba;
  ahí se dispara el envío automático del correo con el archivo.
- `api/download.js` — entrega el archivo real, solo si el enlace viene con un
  token válido (se genera únicamente después de un pago aprobado).
- `private-files/` — donde van tus archivos reales (.xlsx, etc). Nunca son
  públicos directamente.

## Paso 1 — Cuenta de Mercado Pago (gratis)

1. Crea una cuenta en https://www.mercadopago.cl si no tienes una, a tu nombre.
2. Entra a https://www.mercadopago.cl/developers/panel → crea una aplicación.
3. Copia el **Access Token de producción** (no el de pruebas). Ese token va en
   la variable `MP_ACCESS_TOKEN`.
4. En tu cuenta de Mercado Pago, en la sección de tu perfil/cuenta bancaria,
   asocia la cuenta donde quieres que se depositen los pagos (puede ser tu
   Cuenta RUT). Los retiros desde Mercado Pago a tu cuenta se hacen desde ahí
   directamente — este sitio nunca toca ese dato, tú lo configuras una sola
   vez en Mercado Pago.

Con Checkout Pro (lo que usa este sitio) el comprador puede pagar con tarjeta
de crédito, débito, transferencia y otros medios habilitados por Mercado Pago
en Chile — no hay que integrar cada uno por separado.

## Paso 2 — Envío de correos automáticos (Resend, gratis para partir)

1. Crea una cuenta en https://resend.com
2. Verifica un dominio propio o usa el dominio de prueba mientras consigues
   uno (para producción real conviene tener tu propio dominio).
3. Copia tu API key → variable `RESEND_API_KEY`.
4. Define `FROM_EMAIL` con el correo remitente que verificaste.

## Paso 3 — Sube tus plantillas reales

Reemplaza los archivos de ejemplo en `private-files/` por tus plantillas de
verdad. El nombre de archivo debe coincidir exactamente con el campo `"file"`
de cada producto en `data/products.json`.

## Paso 4 — Publicar el sitio (Vercel, gratis)

1. Crea una cuenta en https://vercel.com (puedes entrar con GitHub).
2. Sube esta carpeta a un repositorio de GitHub.
3. En Vercel: "Add New Project" → importa ese repositorio.
4. En "Environment Variables" carga las 5 variables de `.env.example` con tus
   valores reales.
5. Deploy. Vercel te da una URL gratis (`tu-proyecto.vercel.app`) — actualiza
   `SITE_URL` con esa URL exacta y vuelve a hacer deploy (Redeploy) para que
   quede consistente con los `back_urls` y el webhook.
6. En el panel de Mercado Pago → Notificaciones/Webhooks, confirma que la URL
   `https://tu-proyecto.vercel.app/api/webhook` esté recibiendo eventos de
   pago (Mercado Pago la detecta sola porque se manda en cada preferencia,
   pero puedes verificarla ahí).

El plan gratuito de Vercel cubre tráfico normal de una tienda chica sin costo.
Si en el futuro el sitio crece mucho, ahí recién Vercel empieza a cobrar — es
decir, el hosting se paga solo, y solo, cuando ya hay ingresos de sobra.

## Paso 5 — Dominio propio (opcional, cuando haya ventas)

Mientras no quieras pagar nada, usa la URL gratis `tu-proyecto.vercel.app`.
Cuando el sitio ya esté generando ventas, compra un dominio (`.cl` cuesta
alrededor de $10.000-$15.000 anual en NIC Chile) y conéctalo desde Vercel →
Settings → Domains. Ahí sí conviene pagarlo con las primeras ventas, tal como
pediste.

## Panel admin (`/admin`)

Acceso privado para revisar ventas y gestionar el catálogo sin tocar código.

**Usuario sugerido:** `bastian`
**Contraseña inicial sugerida:** `7ea8e22e81d53b11c0ad1e4475951e1d`

No dejes esa contraseña tal cual. Configúrala tú mismo en Vercel → Settings →
Environment Variables, en las variables `ADMIN_USER` y `ADMIN_PASSWORD` (usa
la que quieras, no tiene que ser la sugerida). Nadie más que tú, con acceso a
tu panel de Vercel, puede ver o cambiar esas variables — no quedan en el
código ni en este chat de forma permanente.

También necesitas `ADMIN_SESSION_SECRET` (cualquier texto largo al azar,
genera uno con `openssl rand -hex 32`) — es lo que firma tu sesión de login
para que nadie pueda falsificarla.

Con eso configurado, entras en `https://tu-sitio.vercel.app/admin` y puedes:

- Ver las ventas recientes tal como las tiene Mercado Pago (correo, monto,
  estado: aprobado/pendiente/rechazado) — así confirmas que todo esté
  funcionando bien sin tener que revisar nada a mano.
- Agregar, editar o eliminar plantillas del catálogo.

Para que los cambios del catálogo se guarden (y no solo se puedan ver),
necesitas conectar una base gratis de Upstash Redis:

1. Crea una cuenta gratis en https://upstash.com
2. Crea una base de datos Redis (plan gratuito).
3. Copia `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` desde su panel.
4. Pégalas en las variables de entorno de Vercel con esos mismos nombres.

Sin este paso, el panel funciona en modo solo lectura: puedes ver el
catálogo y las ventas, pero para agregar plantillas nuevas tendrías que
seguir editando `data/products.json` directo en el repositorio.

## Cómo agregar una plantilla nueva

1. Sube el archivo a `private-files/`.
2. Agrega un bloque nuevo en `data/products.json` con un `id` único.
3. Vuelve a hacer deploy (o si conectaste GitHub a Vercel, con cada `git push`
   se actualiza solo).

## Qué NO incluye este sitio (y por qué)

- No promete "dinero garantizado": ningún negocio real lo garantiza. Lo que sí
  tiene es un modelo probado (venta de recursos digitales) con costo marginal
  cero y automatización real de principio a fin.
- No guarda tus credenciales de Mercado Pago ni tu Cuenta RUT en ningún
  archivo de este proyecto — esas van directo en las variables de entorno de
  Vercel, que tú controlas.
- No incluye publicidad ni tráfico: el sitio está listo para vender, pero
  conseguir visitas (redes sociales, SEO, algo de pauta paga) sigue siendo
  trabajo tuyo. Ninguna tienda vende sola sin que alguien la conozca.
