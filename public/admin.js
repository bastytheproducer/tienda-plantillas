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

function renderEditorPreview() {
  const preview = document.getElementById("editor-preview");
  if (!preview) return;

  const brand = document.getElementById("site-brand").value.trim() || "Bees and Beers";
  const heroTitle = document.getElementById("site-hero-title").value.trim() || "Cervezas, hidromiel y bebestibles fermentados varios";
  const heroTagline = document.getElementById("site-hero-tagline").value.trim() || "Elaboradas con pasión y tradición.";
  const heroModes = document.getElementById("site-hero-modes").value.trim() || "Ventas al por mayor · Retiro en tienda · Despacho a domicilio";
  const heroBadge = document.getElementById("site-hero-badge").value.trim() || "🔞 Venta exclusiva para mayores de 18 años";

  const processItems = Array.from(document.querySelectorAll('[data-role="process-title"]')).map((input, index) => ({
    title: input.value.trim() || `Paso ${index + 1}`,
    description: document.querySelector(`[data-role="process-description"][data-index="${index}"]`)?.value.trim() || "",
  }));

  const faqItems = Array.from(document.querySelectorAll('[data-role="faq-question"]')).map((input, index) => ({
    question: input.value.trim() || `Pregunta ${index + 1}`,
    answer: document.querySelector(`[data-role="faq-answer"][data-index="${index}"]`)?.value.trim() || "",
  }));

  preview.innerHTML = `
    <div class="preview-block preview-hero">
      <h4>Hero</h4>
      <h3>${heroTitle}</h3>
      <p>${heroTagline}</p>
      <p>${heroModes}</p>
      <span>${heroBadge}</span>
    </div>
    <div class="preview-block">
      <h4>Marca</h4>
      <p>${brand}</p>
    </div>
    <div class="preview-block">
      <h4>Proceso</h4>
      ${processItems.map((item, idx) => `<div style="margin-top:8px;"><strong>${idx + 1}. ${item.title}</strong><div>${item.description}</div></div>`).join("")}
    </div>
    <div class="preview-block">
      <h4>FAQ</h4>
      ${faqItems.map((item, idx) => `<div style="margin-top:8px;"><strong>${idx + 1}. ${item.question}</strong><div>${item.answer}</div></div>`).join("")}
    </div>
  `;
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
