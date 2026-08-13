const money = (n) => "$" + Number(n).toLocaleString("es-CL");
const loginView = document.getElementById("login-view");
const adminView = document.getElementById("admin-view");
const pageEditorPanel = document.getElementById("page-editor-panel");

function toggleEditor(forceOpen) {
  const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : !pageEditorPanel.classList.contains("active");
  pageEditorPanel.classList.toggle("active", shouldOpen);
  pageEditorPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

document.getElementById("open-editor-btn").addEventListener("click", () => toggleEditor(true));
document.getElementById("close-editor-btn").addEventListener("click", () => toggleEditor(false));

async function loadSiteContentEditor() {
  const res = await fetch("/api/site-content");
  if (!res.ok) return;
  const content = await res.json();

  document.getElementById("site-brand").value = content.brand || "Bees and Beers";
  document.getElementById("site-email").value = content.email || "";
  document.getElementById("site-hero-eyebrow").value = content.hero?.eyebrow || "";
  document.getElementById("site-hero-title").value = content.hero?.title || "";
  document.getElementById("site-hero-tagline").value = content.hero?.tagline || "";
  document.getElementById("site-hero-modes").value = content.hero?.modes || "";
  document.getElementById("site-hero-badge").value = content.hero?.badge || "";
  document.getElementById("site-hero-primary").value = content.hero?.primaryCta || "";
  document.getElementById("site-hero-secondary").value = content.hero?.secondaryCta || "";

  const processEditor = document.getElementById("process-editor");
  processEditor.innerHTML = (content.process?.steps || []).map((step, index) => `
    <div style="padding:12px;border:1px solid rgba(43,27,18,0.12);border-radius:var(--radius);">
      <div class="field"><label>Paso ${index + 1} — título</label><input type="text" data-role="process-title" data-index="${index}" value="${escapeAttr(step.title || "")}" /></div>
      <div class="field"><label>Descripción</label><textarea data-role="process-description" data-index="${index}">${escapeHtml(step.description || "")}</textarea></div>
    </div>
  `).join("");

  const faqEditor = document.getElementById("faq-editor");
  faqEditor.innerHTML = (content.faq || []).map((item, index) => `
    <div style="padding:12px;border:1px solid rgba(43,27,18,0.12);border-radius:var(--radius);">
      <div class="field"><label>Pregunta ${index + 1}</label><input type="text" data-role="faq-question" data-index="${index}" value="${escapeAttr(item.question || "")}" /></div>
      <div class="field"><label>Respuesta</label><textarea data-role="faq-answer" data-index="${index}">${escapeHtml(item.answer || "")}</textarea></div>
    </div>
  `).join("");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function buildPreviewPayload() {
  const brand = document.getElementById("site-brand").value.trim() || "Bees and Beers";
  const heroTitle = document.getElementById("site-hero-title").value.trim() || "Cervezas, hidromiel y bebestibles fermentados varios";
  const heroTagline = document.getElementById("site-hero-tagline").value.trim() || "Elaboradas con pasión y tradición.";
  const heroModes = document.getElementById("site-hero-modes").value.trim() || "Ventas al por mayor · Retiro en tienda · Despacho a domicilio";
  const heroBadge = document.getElementById("site-hero-badge").value.trim() || "🔞 Venta exclusiva para mayores de 18 años";
  const heroPrimary = document.getElementById("site-hero-primary").value.trim() || "Ver catálogo";
  const heroSecondary = document.getElementById("site-hero-secondary").value.trim() || "Cómo funciona";
  const heroEyebrow = document.getElementById("site-hero-eyebrow").value.trim() || "Elaboración artesanal";

  const processItems = Array.from(document.querySelectorAll('[data-role="process-title"]')).map((input, index) => ({
    title: input.value.trim() || `Paso ${index + 1}`,
    description: document.querySelector(`[data-role="process-description"][data-index="${index}"]`)?.value.trim() || "",
  }));

  const faqItems = Array.from(document.querySelectorAll('[data-role="faq-question"]')).map((input, index) => ({
    question: input.value.trim() || `Pregunta ${index + 1}`,
    answer: document.querySelector(`[data-role="faq-answer"][data-index="${index}"]`)?.value.trim() || "",
  }));

  return {
    brand,
    email: document.getElementById("site-email").value.trim() || "contacto@tudominio.cl",
    footerText: `${brand} — bebidas artesanales`,
    hero: {
      eyebrow: heroEyebrow,
      title: heroTitle,
      tagline: heroTagline,
      modes: heroModes,
      badge: heroBadge,
      primaryCta: heroPrimary,
      secondaryCta: heroSecondary,
    },
    process: { steps: processItems },
    faq: faqItems,
  };
}

function renderEditorPreview() {
  const previewFrame = document.getElementById("editor-preview-frame");
  if (!previewFrame) return;

  const payload = buildPreviewPayload();
  const previewDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
  const safeBrand = payload.brand || "Bees and Beers";
  const safeHero = payload.hero;
  const safeFaq = payload.faq || [];
  const safeProcess = payload.process?.steps || [];

  previewDoc.open();
  previewDoc.write(`<!DOCTYPE html>
    <html lang="es-CL">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          :root { --bg:#241713; --bg-deep:#1A0F0C; --paper:#F4ECDD; --ink:#2B1B12; --ink-soft:#5A4433; --copper:#C97A3D; --line-soft:rgba(255,255,255,0.12); --serif:"Fraunces", Georgia, serif; --sans:"IBM Plex Sans", sans-serif; }
          * { box-sizing:border-box; }
          body { margin:0; background:#f7efe4; color:var(--ink); font-family:var(--sans); }
          .layout { padding:20px; }
          .hero { background:linear-gradient(135deg,#3b2a23,#1d110d); color:#fff; border-radius:16px; padding:32px 24px; }
          .eyebrow { font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:#f0b583; margin-bottom:10px; }
          h1 { margin:0 0 12px; font-size:32px; line-height:1.1; font-family:var(--serif); }
          .tagline { font-size:16px; opacity:0.9; margin-bottom:16px; }
          .modes { font-size:13px; margin-bottom:18px; }
          .badge { display:inline-block; border:1px solid rgba(255,255,255,0.2); padding:8px 12px; border-radius:999px; font-size:12px; }
          .cta { display:flex; gap:12px; margin-top:16px; }
          .btn { display:inline-flex; align-items:center; justify-content:center; border-radius:8px; padding:10px 16px; font-weight:700; }
          .btn.primary { background:#C97A3D; color:#1A0F0C; }
          .btn.secondary { border:1px solid rgba(255,255,255,0.25); color:#fff; }
          .section { margin-top:22px; background:#fff; border-radius:12px; padding:18px 16px; }
          .section h3 { margin:0 0 12px; font-family:var(--serif); font-size:22px; color:var(--ink); }
          .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
          .step, .faq-item { background:#f7efe4; border:1px solid rgba(43,27,18,0.08); border-radius:10px; padding:12px; }
          .step strong, .faq-item strong { display:block; margin-bottom:6px; }
          .faq-item + .faq-item { margin-top:12px; }
          .brand { font-family:var(--serif); font-size:18px; font-weight:700; margin-bottom:14px; }
        </style>
      </head>
      <body>
        <div class="layout">
          <div class="brand">${safeBrand}</div>
          <div class="hero">
            <div class="eyebrow">${safeHero.eyebrow}</div>
            <h1>${safeHero.title}</h1>
            <div class="tagline">${safeHero.tagline}</div>
            <div class="modes">${safeHero.modes}</div>
            <div class="badge">${safeHero.badge}</div>
            <div class="cta">
              <span class="btn primary">${safeHero.primaryCta}</span>
              <span class="btn secondary">${safeHero.secondaryCta}</span>
            </div>
          </div>

          <div class="section">
            <h3>Proceso</h3>
            <div class="grid">
              ${safeProcess.map((step, index) => `<div class="step"><strong>${index + 1}. ${step.title}</strong><div>${step.description || ""}</div></div>`).join("") || "<div class='step'>Sin pasos cargados</div>"}
            </div>
          </div>

          <div class="section">
            <h3>FAQ</h3>
            ${safeFaq.map((item, index) => `<div class="faq-item"><strong>${index + 1}. ${item.question}</strong><div>${item.answer || ""}</div></div>`).join("") || "<div class='faq-item'>Sin preguntas cargadas</div>"}
          </div>
        </div>
      </body>
    </html>`);
  previewDoc.close();
}

function attachPreviewEvents() {
  document.querySelectorAll("#site-editor-form input, #site-editor-form textarea").forEach((field) => {
    field.addEventListener("input", renderEditorPreview);
  });
}

function addProcessStep() {
  const processEditor = document.getElementById("process-editor");
  const index = processEditor.querySelectorAll('[data-role="process-title"]').length;
  processEditor.insertAdjacentHTML(
    "beforeend",
    `
      <div style="padding:12px;border:1px solid rgba(43,27,18,0.12);border-radius:var(--radius);">
        <div class="field"><label>Paso ${index + 1} — título</label><input type="text" data-role="process-title" data-index="${index}" value="" /></div>
        <div class="field"><label>Descripción</label><textarea data-role="process-description" data-index="${index}"></textarea></div>
      </div>
    `
  );
  attachPreviewEvents();
  renderEditorPreview();
}

function addFaqItem() {
  const faqEditor = document.getElementById("faq-editor");
  const index = faqEditor.querySelectorAll('[data-role="faq-question"]').length;
  faqEditor.insertAdjacentHTML(
    "beforeend",
    `
      <div style="padding:12px;border:1px solid rgba(43,27,18,0.12);border-radius:var(--radius);">
        <div class="field"><label>Pregunta ${index + 1}</label><input type="text" data-role="faq-question" data-index="${index}" value="" /></div>
        <div class="field"><label>Respuesta</label><textarea data-role="faq-answer" data-index="${index}"></textarea></div>
      </div>
    `
  );
  attachPreviewEvents();
  renderEditorPreview();
}

async function saveSiteContent() {
  const payload = {
    brand: document.getElementById("site-brand").value.trim() || "Bees and Beers",
    email: document.getElementById("site-email").value.trim(),
    hero: {
      eyebrow: document.getElementById("site-hero-eyebrow").value.trim(),
      title: document.getElementById("site-hero-title").value.trim(),
      tagline: document.getElementById("site-hero-tagline").value.trim(),
      modes: document.getElementById("site-hero-modes").value.trim(),
      badge: document.getElementById("site-hero-badge").value.trim(),
      primaryCta: document.getElementById("site-hero-primary").value.trim() || "Ver catálogo",
      secondaryCta: document.getElementById("site-hero-secondary").value.trim() || "Cómo funciona",
    },
    process: {
      steps: Array.from(document.querySelectorAll('[data-role="process-title"]')).map((input, index) => ({
        title: input.value.trim() || `Paso ${index + 1}`,
        description: document.querySelector(`[data-role="process-description"][data-index="${index}"]`).value.trim() || "",
      })),
    },
    faq: Array.from(document.querySelectorAll('[data-role="faq-question"]')).map((input, index) => ({
      question: input.value.trim() || `Pregunta ${index + 1}`,
      answer: document.querySelector(`[data-role="faq-answer"][data-index="${index}"]`).value.trim() || "",
    })),
  };

  const res = await fetch("/api/site-content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    alert(error.error || "No se pudo guardar el contenido");
    return;
  }

  alert("Cambios guardados. La página pública fue actualizada.");
  location.reload();
}

document.getElementById("add-process-step").addEventListener("click", addProcessStep);
document.getElementById("add-faq-item").addEventListener("click", addFaqItem);
document.getElementById("refresh-preview-btn").addEventListener("click", renderEditorPreview);

document.getElementById("site-editor-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveSiteContent();
});

attachPreviewEvents();
renderEditorPreview();

document.getElementById("login-btn").addEventListener("click", async () => {
  const user = document.getElementById("login-user").value;
  const password = document.getElementById("login-pass").value;
  const errEl = document.getElementById("login-error");
  errEl.textContent = "";

  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user, password }),
  });

  if (res.ok) showAdmin();
  else errEl.textContent = "Usuario o contraseña incorrectos.";
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  await fetch("/api/admin/logout", { method: "POST" });
  location.reload();
});

async function showAdmin() {
  loginView.style.display = "none";
  adminView.style.display = "block";
  await loadSiteContentEditor();
  await loadProducts();
  await loadOrders();
}

(async () => {
  const res = await fetch("/api/admin/products");
  if (res.ok) showAdmin();
})();

async function refreshKvStatus(quickEditableGuess) {
  const warning = document.getElementById("kv-warning");
  if (quickEditableGuess === false) {
    warning.style.display = "block";
    document.getElementById("kv-status-title").textContent = "Catálogo en modo solo lectura";
    document.getElementById("kv-status-detail").textContent =
      "Todavía no está conectado Upstash. Revisa el README, sección Panel admin.";
    return;
  }
  const res = await fetch("/api/admin/kv-status");
  const status = await res.json();
  if (status.connected) {
    warning.style.display = "none";
  } else {
    warning.style.display = "block";
    document.getElementById("kv-status-title").textContent = "Catálogo en modo solo lectura";
    document.getElementById("kv-status-detail").textContent =
      status.reason || "No se pudo confirmar la conexión con Upstash.";
  }
}
document.getElementById("recheck-kv").addEventListener("click", () => loadProducts());

let editingId = null;

async function loadProducts() {
  const res = await fetch("/api/admin/products");
  if (!res.ok) return;
  const { products, editable } = await res.json();

  await refreshKvStatus(editable);
  document.querySelector("#product-form button[type=submit]").disabled = !editable;

const tbody = document.getElementById("product-table");
  const avail = (p) => p.available !== false;
  tbody.innerHTML = products
    .map(
      (p) => `
    <tr>
      <td>${p.name}</td>
      <td>${p.style || "-"}</td>
      <td>${p.volume || "-"}</td>
      <td>${money(p.price)}</td>
      <td>
        <button class="avail-btn ${avail(p) ? "avail-on" : "avail-off"}" data-id="${p.id}" data-avail="${avail(p)}">
          ${avail(p) ? "Disponible" : "No disponible"}
        </button>
      </td>
      <td class="row-actions">
        <button class="edit-btn" data-id="${p.id}">Editar</button>
        <button class="del-btn" data-id="${p.id}">Eliminar</button>
      </td>
    </tr>`
    )
    .join("");

  // Toggle de disponibilidad: cambia el estado y lo guarda.
  tbody.querySelectorAll(".avail-btn").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const p = products.find((x) => x.id === id);
      if (!p) return;
      const next = !(p.available !== false);
      await setAvailability(id, next);
      loadProducts();
    })
  );

tbody.querySelectorAll(".edit-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      const p = products.find((x) => x.id === btn.dataset.id);
      editingId = p.id;
      document.getElementById("p-id").value = p.id;
      document.getElementById("p-id").disabled = true;
      document.getElementById("p-name").value = p.name;
      document.getElementById("p-style").value = p.style || "";
      document.getElementById("p-abv").value = p.abv || "";
      document.getElementById("p-volume").value = p.volume || "";
      document.getElementById("p-price").value = p.price;
      document.getElementById("p-available").value = String(p.available !== false);
      document.getElementById("p-tagline").value = p.tagline || "";
      document.getElementById("cancel-edit").style.display = "inline-flex";
      window.scrollTo({ top: 0, behavior: "smooth" });
    })
  );

  tbody.querySelectorAll(".del-btn").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm("¿Eliminar esta bebida del catálogo?")) return;
      await fetch(`/api/admin/products?id=${encodeURIComponent(btn.dataset.id)}`, { method: "DELETE" });
      loadProducts();
    })
  );
}

document.getElementById("cancel-edit").addEventListener("click", resetForm);

// Cambia el estado de disponibilidad de un producto y lo guarda.
async function setAvailability(id, available) {
  const res = await fetch("/api/admin/products");
  if (!res.ok) return;
  const { products } = await res.json();
  const p = products.find((x) => x.id === id);
  if (!p) return;
  p.available = available;
  await fetch("/api/admin/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
}

function resetForm() {
  editingId = null;
  document.getElementById("product-form").reset();
  document.getElementById("p-id").disabled = false;
  document.getElementById("cancel-edit").style.display = "none";
}

document.getElementById("product-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const product = {
    id: document.getElementById("p-id").value.trim(),
    name: document.getElementById("p-name").value.trim(),
    style: document.getElementById("p-style").value.trim(),
    abv: document.getElementById("p-abv").value.trim(),
    volume: document.getElementById("p-volume").value.trim(),
    price: Number(document.getElementById("p-price").value),
    available: document.getElementById("p-available").value === "true",
    tagline: document.getElementById("p-tagline").value.trim(),
  };

  const res = await fetch("/api/admin/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });

  if (res.ok) {
    resetForm();
    loadProducts();
  } else {
    const { error } = await res.json();
    alert(error);
  }
});

function wazeUrl(o) {
  if (o.lat && o.lng) return `https://waze.com/ul?ll=${o.lat},${o.lng}&navigate=yes`;
  return `https://waze.com/ul?q=${encodeURIComponent(`${o.address || ""}, ${o.comuna || ""}`)}&navigate=yes`;
}

async function loadOrders() {
  const res = await fetch("/api/admin/orders");
  const tbody = document.getElementById("orders-table");
  if (!res.ok) {
    tbody.innerHTML = `<tr><td colspan="6">No se pudo cargar Mercado Pago todavía.</td></tr>`;
    return;
  }
  const { orders } = await res.json();
  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">Todavía no hay pedidos.</td></tr>`;
    return;
  }
  tbody.innerHTML = orders
    .map(
      (o) => `
    <tr>
      <td>${new Date(o.date).toLocaleString("es-CL")}</td>
      <td>${o.name || "-"}<br><span style="color:var(--ink-soft);font-size:11px;">${o.email || ""}</span></td>
      <td>${o.phone || "-"}</td>
      <td>${o.address || "-"}${o.comuna ? ", " + o.comuna : ""}<br><a href="${wazeUrl(o)}" target="_blank" style="font-size:11px;">Abrir en Waze →</a></td>
      <td>${money(o.amount)}</td>
      <td class="status-${o.status}">${o.status}</td>
    </tr>`
    )
    .join("");
}
