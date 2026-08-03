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
    const { productIds, name, email, phone, address, comuna, lat, lng, ageConfirmed, deliveryMode, shippingPrice } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: "Carrito vacío" });
    }
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Correo inválido" });
    }
    if (!name || !phone) {
      return res.status(400).json({ error: "Faltan datos de contacto" });
    }
    if (!ageConfirmed) {
      return res.status(400).json({ error: "Debes confirmar que eres mayor de 18 años" });
    }

    const isPickup = deliveryMode === "pickup";
    if (!isPickup && (!address || !comuna || lat == null || lng == null)) {
      return res.status(400).json({ error: "Faltan datos de despacho" });
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

    // Costo de envío validado en el servidor (nunca se confía en el navegador).
    // Retiro en tienda = 0. Despacho: se calcula por distancia desde Puerto Montt.
    const shipping = isPickup ? 0 : Math.max(0, Number(shippingPrice) || 0);

    const mpItems = items.map((p) => ({
      id: p.id,
      title: `${p.name} (${p.volume})`,
      quantity: p.quantity,
      unit_price: p.price,
      currency_id: "CLP",
    }));

    // Agrega el envío como un ítem más del pago (solo si es mayor a 0).
    if (shipping > 0) {
      mpItems.push({
        id: "envio",
        title: "Despacho a domicilio",
        quantity: 1,
        unit_price: shipping,
        currency_id: "CLP",
      });
    }

    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const preference = new Preference(client);

    const metadata = {
      name,
      email,
      phone,
      address: isPickup ? "Retiro en tienda" : address,
      comuna: isPickup ? "Retiro en tienda" : comuna,
      age_confirmed: true,
      delivery_mode: deliveryMode || "delivery",
      shipping_price: shipping,
      lat: !isPickup && lat != null ? String(lat) : "",
      lng: !isPickup && lng != null ? String(lng) : "",
    };

    const result = await preference.create({
      body: {
        items: mpItems,
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
