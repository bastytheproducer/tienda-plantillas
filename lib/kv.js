// Guarda el catálogo en Upstash Redis (plan gratis) para que el admin pueda
// editar productos sin tocar código ni hacer un deploy nuevo cada vez.
// Si no configuras Upstash, el sitio sigue funcionando igual pero usando
// el catálogo fijo de /data/products.json (modo solo lectura).

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const KV_KEY = "libromayor:products";
const fallback = require("../data/products.json");

const kvEnabled = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

async function kvCall(command) {
  const res = await fetch(`${UPSTASH_URL}/${command.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Upstash error: ${res.status}`);
  const data = await res.json();
  return data.result;
}

async function getProducts() {
  if (!kvEnabled) return fallback;
  const raw = await kvCall(["GET", KV_KEY]);
  return raw ? JSON.parse(raw) : fallback;
}

async function saveProducts(products) {
  if (!kvEnabled) {
    throw new Error(
      "Upstash no está configurado: agrega UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN para poder editar el catálogo desde el admin."
    );
  }
  await kvCall(["SET", KV_KEY, JSON.stringify(products)]);
}

async function testConnection() {
  if (!kvEnabled) return { connected: false, reason: "Faltan las variables de entorno de Upstash." };
  try {
    await kvCall(["PING"]);
    return { connected: true };
  } catch (err) {
    return { connected: false, reason: "Las credenciales de Upstash no funcionan. Revísalas." };
  }
}

module.exports = { getProducts, saveProducts, kvEnabled, testConnection };
