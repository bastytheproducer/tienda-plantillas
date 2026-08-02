// Vercel Serverless Function — POST /api/create-preference
// Recibe carrito + datos de despacho, valida precios contra el catálogo
// del servidor, y crea una preferencia de pago en Mercado Pago Checkout Pro.
// Los datos de despacho quedan guardados en la preferencia (metadata) para
// que el webhook los use al avisar del pedido.

const { MercadoPagoConfig, Preference } = require("mercadopago");
const { getProducts } = require("../lib/kv");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { productIds, name, email, phone, address, comuna, lat, lng, ageConfirmed } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: "Carrito vacío" });
    }
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Correo inválido" });
    }
    if (!name || !phone || !address || !comuna) {
      return res.status(400).json({ error: "Faltan datos de despacho" });
    }
    if (!ageConfirmed) {
      return res.status(400).json({ error: "Debes confirmar que eres mayor de 18 años" });
    }

    const products = await getProducts();
    const counts = {};
    productIds.forEach((id) => (counts[id] = (counts[id] || 0) + 1));

    const items = Object.entries(counts)
      .map(([id, qty]) => {
        const p = products.find((x) => x.id === id);
        return p ? { ...p, quantity: qty } : null;
      })
      .filter(Boolean);

    if (items.length === 0) {
      return res.status(400).json({ error: "Productos no válidos" });
    }

    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const preference = new Preference(client);

    const metadata = {
      name,
      email,
      phone,
      address,
      comuna,
      age_confirmed: true,
      lat: lat != null ? String(lat) : "",
      lng: lng != null ? String(lng) : "",
    };

    const result = await preference.create({
      body: {
        items: items.map((p) => ({
          id: p.id,
          title: `${p.name} (${p.volume})`,
          quantity: p.quantity,
          unit_price: p.price,
          currency_id: "CLP",
        })),
        payer: { name, email },
        metadata,
        back_urls: {
          success: `${process.env.SITE_URL}/gracias.html`,
          failure: `${process.env.SITE_URL}/`,
          pending: `${process.env.SITE_URL}/`,
        },
        auto_return: "approved",
        notification_url: `${process.env.SITE_URL}/api/webhook`,
      },
    });

    return res.status(200).json({ init_point: result.init_point });
  } catch (err) {
    console.error("create-preference error:", err);
    return res.status(500).json({ error: "No se pudo generar el pago" });
  }
};
