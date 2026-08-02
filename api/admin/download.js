const fs = require("fs");
const path = require("path");
const { requireAdmin } = require("../../lib/session");
const { getProducts } = require("../../lib/kv");

module.exports = async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.query;
  const products = await getProducts();
  const product = products.find((p) => p.id === id);

  if (!product) return res.status(404).send("Producto no encontrado.");

  const filePath = path.join(process.cwd(), "private-files", product.file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("El archivo aún no se ha subido a /private-files.");
  }

  res.setHeader("Content-Disposition", `attachment; filename="${product.file}"`);
  fs.createReadStream(filePath).pipe(res);
};
