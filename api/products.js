const { getProducts } = require("../lib/kv");

module.exports = async (req, res) => {
  const products = await getProducts();
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json(products);
};
