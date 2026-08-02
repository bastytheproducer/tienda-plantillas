const { requireAdmin } = require("../../lib/session");
const { testConnection } = require("../../lib/kv");

module.exports = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const status = await testConnection();
  return res.status(200).json(status);
};
