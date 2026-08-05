// Guarda el catálogo en Upstash Redis (plan gratis) para que el admin pueda
// editar productos sin tocar código ni hacer un deploy nuevo cada vez.
// Si no configuras Upstash, el sitio sigue funcionando igual pero usando
// el catálogo fijo de /data/products.json (modo solo lectura).

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const KV_KEY = "beesandbeers:products:v2";
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
  // El catálogo del repositorio (/data/products.json) es la fuente de verdad
  // de la estructura del producto (nombre, estilo, ABV, volumen, imagen, etc.).
  // Upstash solo guarda ajustes hechos desde el panel admin (ej. precio).
  // Al hacer merge, garantizamos que los campos nuevos del repo (como la
  // imagen) aparezcan en producción aunque Upstash tenga una copia anterior
  // sin esos campos.
  const local = fallback;
  if (!kvEnabled) return local;

  let remote = [];
  try {
    const raw = await kvCall(["GET", KV_KEY]);
    if (raw) remote = JSON.parse(raw);
  } catch (err) {
    console.error("kv get error:", err.message);
  }
  if (!Array.isArray(remote)) return local;

const localIds = new Set(local.map((p) => p.id));
  // Nombres locales normalizados para detectar duplicados (ej. "IPA Lupulada").
  const localNames = new Set(local.map((p) => (p.name || "").toLowerCase().trim()));
  const overridesById = {};
  remote.forEach((p) => {
    if (!p || !p.id) return;
    const o = {};
    // El admin puede ajustar precio y disponibilidad; esos ajustes se
    // conservan por encima del catálogo del repositorio.
    if (typeof p.price === "number") o.price = p.price;
    if (typeof p.available === "boolean") o.available = p.available;
    overridesById[p.id] = o;
  });

  const merged = local.map((p) => {
    const o = overridesById[p.id];
    return o && Object.keys(o).length ? { ...p, ...o } : p;
  });

  // Conserva productos nuevos que se hayan creado desde el panel admin
  // y que todavía no estén en el repositorio. Se descartan los "extras"
  // que dupliquen un producto local por nombre (ej. una IPA vieja sin foto
  // guardada en Upstash con un id distinto) para evitar repeticiones.
  const extras = remote.filter(
    (p) =>
      p &&
      p.id &&
      !localIds.has(p.id) &&
      !localNames.has((p.name || "").toLowerCase().trim())
  );
  return [...merged, ...extras];
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
