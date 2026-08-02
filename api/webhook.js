// Vercel Serverless Function — POST /api/webhook
// Mercado Pago llama esta URL cada vez que cambia el estado de un pago.
// Acá se verifica el pago directamente contra la API de Mercado Pago
// (nunca se confía en el contenido de la notificación por sí solo),
// y si está aprobado, se envía el archivo por correo automáticamente.
//
// Variables de entorno adicionales requeridas aquí:
//   RESEND_API_KEY    -> API key de resend.com (plan gratuito alcanza para partir)
//   FROM_EMAIL         -> remitente verificado en Resend, ej: ventas@libromayor.cl
//   DOWNLOAD_SECRET     -> cualquier string largo y secreto, usado para firmar descargas

const { MercadoPagoConfig, Payment } = require("mercadopago");
const { Resend } = require("resend");
const { getProducts } = require("../lib/kv");

const money = (n) => "$" + Number(n).toLocaleString("es-CL");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(200).send("ok");

  try {
    const paymentId = req.body?.data?.id || req.query["data.id"];
    if (!paymentId) return res.status(200).send("ok");

    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const payment = await new Payment(client).get({ id: paymentId });

    if (payment.status !== "approved") {
      return res.status(200).send("ok"); // pendiente/rechazado: no se entrega nada
    }

    const { productIds, email } = JSON.parse(
      Buffer.from(payment.external_reference, "base64").toString("utf8")
    );

    const products = await getProducts();
    const items = productIds.map((id) => products.find((p) => p.id === id)).filter(Boolean);
    const total = items.reduce((sum, p) => sum + p.price, 0);

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: "¡Pedido confirmado — Barril y Miel!",
      html: `
        <p>¡Salud! Recibimos tu pago y tu pedido está confirmado.</p>
        <h3>Detalle de tu pedido</h3>
        <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">
          <thead>
            <tr style="text-align:left;border-bottom:1px solid #ddd;">
              <th style="padding:8px;">Cerveza</th>
              <th style="padding:8px;">Presentación</th>
              <th style="padding:8px;">Precio</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((p) => `
              <tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px;">${p.name}</td>
                <td style="padding:8px;">${p.format}</td>
                <td style="padding:8px;">${money(p.price)}</td>
              </tr>`).join("")}
          </tbody>
        </table>
        <p style="font-size:16px;font-weight:bold;margin-top:16px;">Total: ${money(total)}</p>
        <p>Pronto nos contactaremos al correo de este pedido para coordinar la entrega o el retiro de tus cervezas.</p>
        <p>Si tienes dudas, responde este correo y te ayudamos.</p>
        <p style="color:#888;font-size:12px;">Barril y Miel — Cerveza artesanal</p>
      `,
    });

    return res.status(200).send("ok");
  } catch (err) {
    console.error("webhook error:", err);
    // Igual respondemos 200: si devolvemos error, Mercado Pago reintenta
    // indefinidamente el mismo webhook. El error queda en los logs de Vercel.
    return res.status(200).send("ok");
  }
};
