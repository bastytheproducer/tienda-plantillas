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
