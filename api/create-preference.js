// Vercel Serverless Function — POST /api/create-preference
// Recibe carrito + datos de despacho, valida precios contra el catálogo
// del servidor, y crea una preferencia de pago en Mercado Pago Checkout Pro.
// Los datos de despacho quedan guardados en la preferencia (metadata) para
// que el webhook los use al avisar del pedido.

const { MercadoPagoConfig, Preference } = require("mercadopago");
const { getProducts } = require("../lib/kv");

// Origen de la tienda (Barril & Miel, Puerto Montt).
// Referencia de origen: Taller Pintura y Desabolladura Fernando Olea
// (Google Maps: -41.41005, -72.874869)
const ORIGEN_LAT = -41.41005;
const ORIGEN_LNG = -72.874869;

// Zonas de envío: precios calculados para cubrir bencina ($1.478/L, ~10 km/L)
// y desgaste del vehículo. El despacho siempre se cobra; el retiro es gratis.
const SHIPPING_ZONES = [
  { maxKm: 8, price: 2990 },
  { maxKm: 20, price: 4990 },
  { maxKm: 40, price: 7990 },
  { maxKm: 100, price: 14990 },
  { maxKm: Infinity, price: 29990 },
];

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateShipping(isPickup, lat, lng) {
  if (isPickup) return 0;
  const dist = distanceKm(ORIGEN_LAT, ORIGEN_LNG, Number(lat), Number(lng));
  const zone = SHIPPING_ZONES.find((z) => dist <= z.maxKm);
  // Para distancias > 28 km se cobra el TRIPLE (x3): considera el viaje de
  // vuelta y los peajes que puede haber en la ruta.
  return dist > 28 ? zone.price * 3 : zone.price;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { productIds, name, email, phone, address, comuna, lat, lng, ageConfirmed, deliveryMode } = req.body;

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

// Costo de envío calculado SIEMPRE en el servidor (nunca se confía en el
    // navegador). Retiro en tienda = 0. Despacho: se calcula por distancia
    // real desde Puerto Montt, así nada es gratis sin justificación.
    const shipping = calculateShipping(isPickup, lat, lng);

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
