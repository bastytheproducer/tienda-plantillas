// Tiny local server to preview "Libro Mayor" tienda (version 2).
// Serves /public as web root and emulates the Vercel API endpoints needed
// for local preview: /api/products (catalog) and the /admin panel
// (login, logout, products, kv-status, download).
// Real Mercado Pago payments / email delivery require the Vercel deploy
// with proper env vars (MP_ACCESS_TOKEN, RESEND_API_KEY, ADMIN_*, etc).
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const PRIVATE_FILES = path.join(ROOT, "private-files");
const DATA = require("./data/products.json");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain; charset=utf-8",
};

// ---- Emulated admin (single user) ----
const ADMIN_USER = process.env.ADMIN_USER || "bastian";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "7ea8e22e81d53b11c0ad1e4475951e1d";
const ADMIN_SECRET = process.env.ADMIN_SESSION_SECRET || "local-preview-secret";

function makeCookie() {
  const expires = Date.now() + 12 * 60 * 60 * 1000;
  const sig = crypto.createHmac("sha256", ADMIN_SECRET).update(String(expires)).digest("hex");
  return `admin_session=${expires}.${sig}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`;
}

function isValidCookie(req) {
  const raw = req.headers.cookie || "";
  const match = raw.split("; ").find((c) => c.startsWith("admin_session="));
  if (!match) return false;
  const value = match.split("=")[1];
  const [expires, sig] = value.split(".");
  const expected = crypto.createHmac("sha256", ADMIN_SECRET).update(String(expires)).digest("hex");
  return sig === expected && Date.now() < Number(expires);
}

const send = (res, status, obj, extraHeaders = {}) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...extraHeaders });
  res.end(JSON.stringify(obj));
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("JSON inválido"));
      }
    });
  });

// ---- Router ----
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const pathname = decodeURIComponent(url.pathname);

  // ---- API ----
  if (pathname === "/api/products") {
    return send(res, 200, DATA, { "Cache-Control": "no-store" });
  }

  if (pathname === "/api/admin/login" && req.method === "POST") {
    try {
      const { user, password } = await readBody(req);
      if (user === ADMIN_USER && password === ADMIN_PASSWORD) {
        res.writeHead(200, { "Content-Type": "application/json", "Set-Cookie": makeCookie() });
        res.end(JSON.stringify({ ok: true }));
      } else {
        send(res, 401, { error: "Usuario o contraseña incorrectos" });
      }
    } catch {
      send(res, 400, { error: "JSON inválido" });
    }
    return;
  }

  if (pathname === "/api/admin/logout" && req.method === "POST") {
    res.writeHead(200, { "Content-Type": "application/json", "Set-Cookie": "admin_session=; HttpOnly; Path=/; Max-Age=0" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (pathname === "/api/admin/products") {
    if (!isValidCookie(req)) return send(res, 401, { error: "No autenticado" });
    if (req.method === "GET") {
      return send(res, 200, { products: DATA, editable: false });
    }
    // Solo lectura en preview (Upstash no configurado localmente).
    return send(res, 400, { error: "Modo solo lectura en preview local: falta conectar Upstash para guardar cambios." });
  }

  if (pathname === "/api/admin/kv-status") {
    if (!isValidCookie(req)) return send(res, 401, { error: "No autenticado" });
    return send(res, 200, { connected: false, reason: "Faltan las variables de entorno de Upstash." });
  }

  if (pathname === "/api/admin/download") {
    if (!isValidCookie(req)) return send(res, 401, { error: "No autenticado" });
    const { id } = url.searchParams;
    const product = DATA.find((p) => p.id === id);
    if (!product) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Producto no encontrado.");
    }
    const filePath = path.join(PRIVATE_FILES, path.normalize(product.file));
    if (!filePath.startsWith(PRIVATE_FILES) || !fs.existsSync(filePath)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("El archivo aún no se ha subido a /private-files.");
    }
    res.setHeader("Content-Disposition", `attachment; filename="${product.file}"`);
    res.setHeader("Content-Type", MIME[path.extname(filePath)] || "application/octet-stream");
    return fs.createReadStream(filePath).pipe(res);
  }

  if (pathname === "/api/admin/orders") {
    if (!isValidCookie(req)) return send(res, 401, { error: "No autenticado" });
    // Sin credenciales de Mercado Pago en preview local.
    return send(res, 500, { error: "No se pudo consultar Mercado Pago" });
  }

  // ---- Static files ----
  let filePath;
  if (pathname === "/") filePath = path.join(PUBLIC, "index.html");
  else if (pathname === "/admin") filePath = path.join(PUBLIC, "admin.html");
  else filePath = path.join(PUBLIC, path.normalize(pathname));

  if (!filePath.startsWith(PUBLIC)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    return res.end("Forbidden");
  }

  fs.readFile(filePath, (err, buf) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      return res.end("<h1>404</h1><p>Archivo no encontrado</p>");
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(buf);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Tienda corriendo en http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin`);
});

