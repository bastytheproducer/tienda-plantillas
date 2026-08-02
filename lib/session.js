const crypto = require("crypto");

// Sesión simple de un solo usuario admin, basada en las variables de entorno
// ADMIN_USER / ADMIN_PASSWORD. No hay base de datos de usuarios: es un solo
// acceso, el tuyo. La cookie es una firma HMAC con expiración, no un token
// que se pueda falsificar sin conocer ADMIN_SESSION_SECRET.

function makeSessionCookie() {
  const expires = Date.now() + 12 * 60 * 60 * 1000; // 12 horas
  const sig = crypto
    .createHmac("sha256", process.env.ADMIN_SESSION_SECRET)
    .update(String(expires))
    .digest("hex");
  return `${expires}.${sig}`;
}

function isValidSession(cookieValue) {
  if (!cookieValue) return false;
  const [expires, sig] = cookieValue.split(".");
  if (!expires || !sig) return false;
  const expected = crypto
    .createHmac("sha256", process.env.ADMIN_SESSION_SECRET)
    .update(String(expires))
    .digest("hex");
  return sig === expected && Date.now() < Number(expires);
}

function checkCredentials(user, password) {
  return (
    user === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASSWORD
  );
}

function getCookie(req, name) {
  const raw = req.headers.cookie || "";
  const match = raw.split("; ").find((c) => c.startsWith(`${name}=`));
  return match ? match.split("=")[1] : null;
}

function requireAdmin(req, res) {
  const session = getCookie(req, "admin_session");
  if (!isValidSession(session)) {
    res.status(401).json({ error: "No autenticado" });
    return false;
  }
  return true;
}

module.exports = { makeSessionCookie, isValidSession, checkCredentials, getCookie, requireAdmin };
