// Guarda el catálogo en Upstash Redis (plan gratis) para que el admin pueda
// editar productos sin tocar código ni hacer un deploy nuevo cada vez.
// Si no configuras Upstash, el sitio sigue funcionando igual pero usando
// el catálogo fijo de /data/products.json (modo solo lectura).

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const KV_KEY = "barrilymiel:products";
const fallback = require("../data/products.json");

const kvEnabled = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

// Envía el comando por POST con el JSON en el body.
// Este es el método recomendado por la REST API de Upstash: evita el límite
// de largo de la URL (que rompía el SET del catálogo completo con acentos).
async function kvCall(command) {
  const res = await fetch(`${UPSTASH_URL}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upstash error: ${res.status} ${text}`);
  }
  const data = await res.json();
  if (data.error) {
    throw new Error(`Upstash error: ${data.error}`);
  }
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
