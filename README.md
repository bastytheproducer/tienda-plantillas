# Barril & Miel — Tienda de cerveza artesanal e hidromiel

Sitio completo: catálogo, carrito, checkout con Mercado Pago (tarjetas,
transferencia y otros medios) y aviso automático por correo cuando se
aprueba un pago — a ti para preparar el despacho, y al cliente para
confirmar su pedido.

## ⚠️ Antes de vender de verdad

Vender alcohol en Chile está regulado. Esto no es asesoría legal, pero
necesitas tener resuelto, como mínimo:

- **Patente de alcoholes** con la municipalidad correspondiente.
- **Inicio de actividades en el SII** que cubra la venta de bebidas
  alcohólicas.
- Cumplir la **Ley de Alcoholes**, que limita fuertemente la publicidad de
  alcohol (redes sociales, Google Ads, etc.) y exige no vender a menores de
  edad ni a personas en evidente estado de ebriedad.
- Revisar las reglas de despacho (algunas comunas exigen verificar edad al
  momento de la entrega).

El sitio ya incluye un aviso de verificación de edad (18+) y una nota legal
en el pie de página, pero eso no reemplaza tener los permisos correspondientes.

## Qué hace cada parte

- `public/` — el sitio (catálogo, carrito, checkout con formulario de despacho).
- `data/products.json` — catálogo base (fuente de respaldo si Upstash no
  está conectado).
- `api/create-preference.js` — genera el pago en Mercado Pago, guarda los
  datos de despacho en la preferencia.
- `api/webhook.js` — cuando Mercado Pago aprueba un pago, manda un correo
  de confirmación al comprador y un aviso con los datos de despacho a
  `STORE_NOTIFY_EMAIL` (tú), para que prepares el pedido.
- `api/admin/*` — panel de administración: catálogo y pedidos recientes.

A diferencia de un producto digital, aquí **no hay descarga ni entrega
automática del producto** — el despacho físico lo preparas y coordinas tú
después de recibir el aviso por correo.

## Mapa de despacho

El checkout incluye un mapa (OpenStreetMap, gratis, sin API key) donde el
cliente marca su ubicación. La dirección se completa sola con geocodificación
inversa, y las coordenadas quedan guardadas en el pedido para generar un link
directo de Waze.

## Aviso automático por WhatsApp (CallMeBot, gratis)

Además del correo, puedes recibir un WhatsApp automático por cada pedido
pagado, con los datos del cliente y el link de Waze. Es gratis para uso
personal, pero necesitas activar tu número tú mismo:

1. Agrega el número **+34 644 10 28 72** a tus contactos (es el bot oficial de CallMeBot — verificado en su web oficial el día de hoy).
2. Mándale por WhatsApp el mensaje: `I allow callmebot to send me messages`
3. Te va a responder con tu API key personal.
4. En Vercel, agrega `CALLMEBOT_PHONE` (tu número sin el +, ej: 56933489427)
   y `CALLMEBOT_APIKEY` con la key que te dieron.

### Recibir pedidos en un segundo número (opcional)

Si quieres que los pedidos lleguen también a otro número, agrega en Vercel:
`CALLMEBOT_PHONE_2` y `CALLMEBOT_APIKEY_2` (con la API key de ese segundo
número, activada de la misma forma con CallMeBot). El webhook envía el aviso
a los dos números.

Para probar con tu número +56933489427:
1. Agrega el bot **+34 644 10 28 72** a tus contactos (nómbralo "CallMeBot").
2. Desde el teléfono con la línea +56933489427, ábrele un WhatsApp y mándale exactamente: `I allow callmebot to send me messages`
3. Espera 1-2 minutos. Te responderá con tu API key.
4. En Vercel: `CALLMEBOT_PHONE=56933489427` y `CALLMEBOT_APIKEY=<la key que te dio>`.
5. Redeploy.

Si no configuras esto, el sitio sigue funcionando normal — solo no manda el
WhatsApp, y sigues recibiendo el correo a `STORE_NOTIFY_EMAIL` igual.

Para SMS no hay una opción gratuita real — servicios como Twilio funcionan,
pero requieren crear una cuenta y pagar por cada mensaje.

## Paso 1 — Mercado Pago

Ya deberías tener esto configurado de cuando armamos la primera versión del
sitio (Access Token de producción). Si no, en tu cuenta de Mercado Pago →
Developers → tu aplicación → Credenciales de producción.

## Paso 2 — Correos automáticos (Resend)

Igual que antes: cuenta en resend.com, API key, y esta vez además define
`STORE_NOTIFY_EMAIL` con tu correo real — ahí te van a llegar los pedidos
pagados con la dirección de despacho.

## Paso 3 — Panel admin

`ADMIN_USER`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` — igual que antes.
Desde `/admin` puedes:

- Agregar, editar o eliminar bebidas del catálogo (nombre, estilo, ABV,
  volumen, precio).
- Ver los pedidos recientes con nombre, contacto, dirección y estado del
  pago, para saber qué preparar y despachar.

Para que el catálogo se pueda editar de verdad (no solo ver), conecta
Upstash Redis — mismos pasos que la primera vez (`UPSTASH_REDIS_REST_URL`,
`UPSTASH_REDIS_REST_TOKEN`).

## Cómo agregar una bebida nueva

Desde el panel admin (`/admin`), con Upstash conectado, o editando
`data/products.json` directo en GitHub si todavía no conectas Upstash.

## Variables de entorno

Ver `.env.example` — se cargan todas en Vercel → Settings → Environment
Variables, igual que en la versión anterior del sitio.
