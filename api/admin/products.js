const { requireAdmin } = require("../../lib/session");
const { getProducts, saveProducts, kvEnabled } = require("../../lib/kv");

function handleError(res, err) {
  const msg = err?.message || "Error interno";
  return res.status(500).json({ error: msg });
}

module.exports = async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    if (req.method === "GET") {
      const products = await getProducts();
      return res.status(200).json({ products, editable: kvEnabled });
    }

    if (!kvEnabled) {
      return res.status(400).json({
        error:
          "Falta configurar Upstash (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN) para poder guardar cambios.",
      });
    }

    const products = await getProducts();

    if (req.method === "POST") {
      // Crea o actualiza un producto (si el id ya existe, lo reemplaza).
      const product = req.body;
      if (!product?.id || !product?.name || !product?.price || !product?.file) {
        return res.status(400).json({ error: "Faltan campos: id, name, price, format y file son obligatorios" });
      }
      const idx = products.findIndex((p) => p.id === product.id);
      if (idx >= 0) products[idx] = product;
      else products.push(product);
      await saveProducts(products);
      return res.status(200).json({ products });
    }

    if (req.method === "DELETE") {
      const { id } = req.query;
      const updated = products.filter((p) => p.id !== id);
      await saveProducts(updated);
      return res.status(200).json({ products: updated });
    }

    return res.status(405).json({ error: "Método no permitido" });
  } catch (err) {
    return handleError(res, err);
  }
};
