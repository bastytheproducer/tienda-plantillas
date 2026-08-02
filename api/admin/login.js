const { makeSessionCookie, checkCredentials } = require("../../lib/session");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const { user, password } = req.body || {};

  if (!checkCredentials(user, password)) {
    return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
  }

  const cookie = makeSessionCookie();
  res.setHeader(
    "Set-Cookie",
    `admin_session=${cookie}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`
  );
  return res.status(200).json({ ok: true });
};
