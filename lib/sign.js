const crypto = require("crypto");

// Enlace de descarga firmado, válido por 72 horas, para un producto y correo puntual.
function makeDownloadToken(productId, email) {
  const expires = Date.now() + 72 * 60 * 60 * 1000; // 72 horas
  const payload = `${productId}:${email}:${expires}`;
  const sig = crypto
    .createHmac("sha256", process.env.DOWNLOAD_SECRET)
    .update(payload)
    .digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

function verifyDownloadToken(token) {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [productId, email, expires, sig] = decoded.split(":");
    const expected = crypto
      .createHmac("sha256", process.env.DOWNLOAD_SECRET)
      .update(`${productId}:${email}:${expires}`)
      .digest("hex");
    if (sig !== expected) return null;
    if (Date.now() > Number(expires)) return null;
    return { productId, email };
  } catch {
    return null;
  }
}

module.exports = { makeDownloadToken, verifyDownloadToken };
