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
const { makeDownloadToken } = require("../lib/sign");

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

    const links = items.map((p) => {
      const token = makeDownloadToken(p.id, email);
      return `${process.env.SITE_URL}/api/download?token=${token}`;
    });

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: "Tu plantilla está lista para descargar",
      html: `
        <p>Gracias por tu compra. Tus enlaces de descarga (válidos por 72 horas):</p>
        <ul>
          ${items.map((p, i) => `<li><a href="${links[i]}">${p.name}</a></li>`).join("")}
        </ul>
        <p>Si el enlace vence, responde este correo y se te reenvía.</p>
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
