// Vercel Serverless Function — POST /api/create-preference
// Recibe { productIds: [...], email } desde el frontend, valida precios
// contra el catálogo del servidor (nunca confía en precios del navegador),
// y crea una preferencia de pago en Mercado Pago Checkout Pro.
//
// Variables de entorno requeridas (configurar en el panel de Vercel):
//   MP_ACCESS_TOKEN   -> access token de producción de tu cuenta Mercado Pago
//   SITE_URL          -> URL pública del sitio, ej: https://libromayor.cl

const { MercadoPagoConfig, Preference } = require("mercadopago");
const { getProducts } = require("../lib/kv");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { productIds, email } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: "Carrito vacío" });
    }
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Correo inválido" });
    }

    // Solo se aceptan IDs que existan en el catálogo real del servidor.
    const products = await getProducts();
    const items = productIds
      .map((id) => products.find((p) => p.id === id))
      .filter(Boolean);

    if (items.length === 0) {
      return res.status(400).json({ error: "Productos no válidos" });
    }

    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const preference = new Preference(client);

    // Guardamos qué se compró y a qué correo entregar, codificado en
    // external_reference. Lo fijamos nosotros al crear la preferencia,
    // así que el webhook puede confiar en este valor cuando MP lo devuelva.
    const externalReference = Buffer.from(
      JSON.stringify({ productIds: items.map((i) => i.id), email })
    ).toString("base64");

    const result = await preference.create({
      body: {
        items: items.map((p) => ({
          id: p.id,
          title: p.name,
          quantity: 1,
          unit_price: p.price,
          currency_id: "CLP",
        })),
        payer: { email },
        external_reference: externalReference,
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
