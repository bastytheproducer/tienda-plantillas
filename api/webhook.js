// Vercel Serverless Function — POST /api/webhook
// Mercado Pago llama esta URL cuando cambia el estado de un pago.
// Se verifica el pago contra la API de Mercado Pago (nunca se confía solo
// en la notificación), y si está aprobado: se manda un correo de
// confirmación al comprador y un aviso con los datos de despacho a la
// tienda, para que se prepare y despache el pedido.
//
// Variables de entorno adicionales usadas aquí:
//   RESEND_API_KEY, FROM_EMAIL   -> igual que antes
//   STORE_NOTIFY_EMAIL           -> tu correo, donde llegan los pedidos a preparar

const { MercadoPagoConfig, Payment } = require("mercadopago");
const { Resend } = require("resend");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(200).send("ok");

  try {
    const paymentId = req.body?.data?.id || req.query["data.id"];
    if (!paymentId) return res.status(200).send("ok");

    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const payment = await new Payment(client).get({ id: paymentId });

    if (payment.status !== "approved") {
      return res.status(200).send("ok");
    }

    const meta = payment.metadata || {};
    const items = payment.additional_info?.items || [];
    const itemsList = items
      .map((i) => `<li>${i.title} × ${i.quantity} — $${Number(i.unit_price).toLocaleString("es-CL")} c/u</li>`)
      .join("");

    const wazeLink =
      meta.lat && meta.lng
        ? `https://waze.com/ul?ll=${meta.lat},${meta.lng}&navigate=yes`
        : `https://waze.com/ul?q=${encodeURIComponent(`${meta.address || ""}, ${meta.comuna || ""}`)}&navigate=yes`;

    const resend = new Resend(process.env.RESEND_API_KEY);

    // Confirmación al comprador
    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: meta.email || payment.payer?.email,
      subject: "Confirmamos tu pedido — Barril & Miel",
      html: `
        <p>Gracias por tu compra, ${meta.name || ""}.</p>
        <p>Tu pedido:</p>
        <ul>${itemsList}</ul>
        <p><strong>Total pagado:</strong> $${Number(payment.transaction_amount).toLocaleString("es-CL")}</p>
        <p>Lo vamos a despachar a: ${meta.address || ""}, ${meta.comuna || ""}. Tiempo estimado: 2 a 4 días hábiles.</p>
        <p>Cualquier duda, responde este correo.</p>
      `,
    });

    // Aviso a la tienda para preparar el despacho
    if (process.env.STORE_NOTIFY_EMAIL) {
      await resend.emails.send({
        from: process.env.FROM_EMAIL,
        to: process.env.STORE_NOTIFY_EMAIL,
        subject: `Nuevo pedido pagado — $${Number(payment.transaction_amount).toLocaleString("es-CL")}`,
        html: `
          <p><strong>Cliente:</strong> ${meta.name || ""} — ${meta.email || ""} — ${meta.phone || ""}</p>
          <p><strong>Dirección de despacho:</strong> ${meta.address || ""}, ${meta.comuna || ""}</p>
          <p><a href="${wazeLink}">Abrir en Waze →</a></p>
          <p><strong>Pedido:</strong></p>
          <ul>${itemsList}</ul>
          <p><strong>Total:</strong> $${Number(payment.transaction_amount).toLocaleString("es-CL")}</p>
          <p>ID de pago Mercado Pago: ${paymentId}</p>
        `,
      });
    }

    // Aviso por WhatsApp a la tienda (gratis, vía CallMeBot)
    if (process.env.CALLMEBOT_PHONE && process.env.CALLMEBOT_APIKEY) {
      const itemsText = items.map((i) => `${i.quantity}x ${i.title}`).join(", ");
      const waMessage =
        `🍺 Nuevo pedido pagado\n` +
        `Cliente: ${meta.name || ""} (${meta.phone || ""})\n` +
        `Pedido: ${itemsText}\n` +
        `Total: $${Number(payment.transaction_amount).toLocaleString("es-CL")}\n` +
        `Dirección: ${meta.address || ""}, ${meta.comuna || ""}\n` +
        `Waze: ${wazeLink}`;

      try {
        await fetch(
          `https://api.callmebot.com/whatsapp.php?phone=${process.env.CALLMEBOT_PHONE}&text=${encodeURIComponent(
            waMessage
          )}&apikey=${process.env.CALLMEBOT_APIKEY}`
        );
      } catch (waErr) {
        console.error("callmebot error:", waErr);
      }
    }

    return res.status(200).send("ok");
  } catch (err) {
    console.error("webhook error:", err);
    return res.status(200).send("ok");
  }
};
