const money = (n) => "$" + Number(n).toLocaleString("es-CL");
const loginView = document.getElementById("login-view");
const adminView = document.getElementById("admin-view");

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
  tbody.innerHTML = products
    .map(
      (p) => `
    <tr>
      <td>${p.name}</td>
      <td>${p.style || "-"}</td>
      <td>${p.volume || "-"}</td>
      <td>${money(p.price)}</td>
      <td class="row-actions">
        <button class="edit-btn" data-id="${p.id}">Editar</button>
        <button class="del-btn" data-id="${p.id}">Eliminar</button>
      </td>
    </tr>`
    )
    .join("");

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
