const { requireAdmin } = require("../../lib/session");
const { readSiteContent, saveSiteContent } = require("../../lib/site-content");

module.exports = async (req, res) => {
  if (!requireAdmin(req, res)) return;

  if (req.method === "GET") {
    return res.status(200).json(readSiteContent());
  }

  if (req.method === "POST") {
    try {
      const incoming = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const updated = saveSiteContent(incoming || {});
      return res.status(200).json({ ok: true, content: updated });
    } catch (error) {
      return res.status(500).json({ error: "No se pudo guardar el contenido del sitio" });
    }
  }

  return res.status(405).json({ error: "Método no permitido" });
};
