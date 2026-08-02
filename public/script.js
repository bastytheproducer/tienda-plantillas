const money = (n) => "$" + n.toLocaleString("es-CL");

let PRODUCTS = [];

// ---- Estado del carrito (persistido en localStorage del navegador) ----
let cart = JSON.parse(localStorage.getItem("cart") || "[]");

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCart();
}

function addToCart(id) {
  if (!cart.includes(id)) cart.push(id);
  saveCart();
}

function removeFromCart(id) {
  cart = cart.filter((x) => x !== id);
  saveCart();
}

// ---- Render catálogo ----
function renderProducts() {
  const grid = document.getElementById("product-grid");
  grid.innerHTML = PRODUCTS.map(
    (p) => `
    <article class="card">
      <span class="card-format">${p.format}</span>
      <h3>${p.name}</h3>
      <p class="card-tagline">${p.tagline}</p>
      <div class="card-foot">
        <span class="card-price">${money(p.price)}</span>
        <button class="card-add" data-id="${p.id}">Agregar</button>
      </div>
    </article>`
  ).join("");

  grid.querySelectorAll(".card-add").forEach((btn) => {
    btn.addEventListener("click", () => {
      addToCart(btn.dataset.id);
      btn.textContent = "Agregado";
      btn.classList.add("added");
      setTimeout(() => {
        btn.textContent = "Agregar";
        btn.classList.remove("added");
      }, 1200);
    });
  });
}

// ---- Render carrito ----
function renderCart() {
  const itemsEl = document.getElementById("cart-items");
  const countEl = document.getElementById("cart-count");
  const totalEl = document.getElementById("cart-total-amount");
  const checkoutBtn = document.getElementById("checkout-btn");

  countEl.textContent = cart.length;

  if (cart.length === 0) {
    itemsEl.innerHTML = '<p class="cart-empty">Tu carrito está vacío.</p>';
    totalEl.textContent = money(0);
    checkoutBtn.disabled = true;
    return;
  }

  const items = cart.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean);
  const total = items.reduce((sum, p) => sum + p.price, 0);

  itemsEl.innerHTML = items
    .map(
      (p) => `
    <div class="cart-item">
      <div>
        <div class="cart-item-name">${p.name}</div>
        <div class="cart-item-meta">${p.format} · ${money(p.price)}</div>
      </div>
      <button class="cart-item-remove" data-id="${p.id}">Quitar</button>
    </div>`
    )
    .join("");

  itemsEl.querySelectorAll(".cart-item-remove").forEach((btn) => {
    btn.addEventListener("click", () => removeFromCart(btn.dataset.id));
  });

  totalEl.textContent = money(total);
  checkoutBtn.disabled = false;
}

// ---- Drawer del carrito ----
const drawer = document.getElementById("cart-drawer");
const overlay = document.getElementById("cart-overlay");

function openCart() {
  drawer.classList.add("open");
  overlay.classList.add("open");
}
function closeCart() {
  drawer.classList.remove("open");
  overlay.classList.remove("open");
}

document.getElementById("cart-toggle").addEventListener("click", openCart);
document.getElementById("cart-close").addEventListener("click", closeCart);
overlay.addEventListener("click", closeCart);

// ---- Checkout: pide email y crea la preferencia de pago en el backend ----
document.getElementById("checkout-btn").addEventListener("click", async () => {
  const note = document.getElementById("checkout-note");
  const email = prompt("Ingresa tu correo para coordinar la entrega tras el pago:");
  if (!email || !email.includes("@")) {
    note.textContent = "Necesitamos un correo válido para coordinar tu pedido.";
    return;
  }

  const btn = document.getElementById("checkout-btn");
  btn.disabled = true;
  btn.textContent = "Generando pago...";

  try {
    const res = await fetch("/api/create-preference", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: cart, email }),
    });
    if (!res.ok) throw new Error("No se pudo generar el pago");
    const data = await res.json();
    // Redirige a Mercado Pago (Checkout Pro): ahí el comprador elige
    // tarjeta, transferencia u otro medio disponible.
    window.location.href = data.init_point;
  } catch (err) {
    note.textContent = "Hubo un problema generando el pago. Intenta de nuevo en unos segundos.";
    btn.disabled = false;
    btn.textContent = "Pagar ahora";
  }
});

async function init() {
  const res = await fetch("/api/products");
  PRODUCTS = await res.json();
  renderProducts();
  renderCart();
}
init();
