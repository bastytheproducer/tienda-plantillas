// Vercel Serverless Function — GET /api/download?token=...
// Los archivos reales viven en /private-files (fuera de /public), así que
// nadie puede descargarlos con solo adivinar la URL: hace falta un token
// válido, generado únicamente por el webhook después de un pago aprobado.

const fs = require("fs");
const path = require("path");
const { getProducts } = require("../lib/kv");
const { verifyDownloadToken } = require("../lib/sign");

module.exports = async (req, res) => {
  const { token } = req.query;
  const data = token && verifyDownloadToken(token);

  if (!data) {
    return res.status(403).send("Enlace inválido o vencido. Escríbenos y te lo reenviamos.");
  }

  const products = await getProducts();
  const product = products.find((p) => p.id === data.productId);
  if (!product) return res.status(404).send("Producto no encontrado.");

  const filePath = path.join(process.cwd(), "private-files", product.file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Archivo no disponible por ahora, escríbenos.");
  }

  res.setHeader("Content-Disposition", `attachment; filename="${product.file}"`);
  fs.createReadStream(filePath).pipe(res);
};
