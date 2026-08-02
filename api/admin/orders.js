const { requireAdmin } = require("../../lib/session");
const { MercadoPagoConfig, Payment } = require("mercadopago");

module.exports = async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const search = await new Payment(client).search({
      options: { criteria: "desc", sort: "date_created", limit: 30 },
    });

    const orders = (search.results || []).map((p) => {
      const meta = p.metadata || {};
      return {
        id: p.id,
        status: p.status,
        amount: p.transaction_amount,
        email: meta.email || p.payer?.email,
        name: meta.name || "",
        phone: meta.phone || "",
        address: meta.address || "",
        comuna: meta.comuna || "",
        date: p.date_created,
      };
    });

    return res.status(200).json({ orders });
  } catch (err) {
    console.error("orders error:", err);
    return res.status(500).json({ error: "No se pudo consultar Mercado Pago" });
  }
};
