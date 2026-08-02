const money = (n) => "$" + n.toLocaleString("es-CL");

let PRODUCTS = [];
let cart = JSON.parse(localStorage.getItem("cart") || "[]");

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCart();
}
function addToCart(id) {
  cart.push(id); // permite repetir (varias unidades del mismo producto)
  saveCart();
}
function removeOneFromCart(id) {
  const idx = cart.indexOf(id);
  if (idx !== -1) cart.splice(idx, 1);
  saveCart();
}

// ---- Age gate ----
// Se usa sessionStorage: la confirmación dura solo mientras dura la sesión
// del navegador. Al abrir el sitio de nuevo (nueva sesión, incógnito o
// celular) el aviso de edad vuelve a aparecer, como exige la ley para la
// venta de alcohol.
const ageGate = document.getElementById("age-gate");
if (sessionStorage.getItem("age_confirmed") === "yes") {
  ageGate.classList.add("hidden");
}
document.getElementById("age-yes").addEventListener("click", () => {
  sessionStorage.setItem("age_confirmed", "yes");
  ageGate.classList.add("hidden");
});

// ---- Render catálogo ----
function renderProducts() {
  const grid = document.getElementById("product-grid");
  grid.innerHTML = PRODUCTS.map(
    (p) => `
    <article class="card">
      <span class="card-style">${p.style} · ${p.volume}</span>
      <h3>${p.name}</h3>
      <span class="card-abv">${p.abv}</span>
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
      }, 1000);
    });
  });
}

// ---- Render carrito (agrupado por cantidad) ----
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

  const counts = {};
  cart.forEach((id) => (counts[id] = (counts[id] || 0) + 1));

  const rows = Object.entries(counts).map(([id, qty]) => {
    const p = PRODUCTS.find((x) => x.id === id);
    if (!p) return "";
    return `
    <div class="cart-item">
      <div>
        <div class="cart-item-name">${p.name} ${qty > 1 ? `× ${qty}` : ""}</div>
        <div class="cart-item-meta">${p.volume} · ${money(p.price)} c/u</div>
      </div>
      <button class="cart-item-remove" data-id="${id}">Quitar 1</button>
    </div>`;
  });
  itemsEl.innerHTML = rows.join("");

  itemsEl.querySelectorAll(".cart-item-remove").forEach((btn) => {
    btn.addEventListener("click", () => removeOneFromCart(btn.dataset.id));
  });

  const total = cart.reduce((sum, id) => {
    const p = PRODUCTS.find((x) => x.id === id);
    return sum + (p ? p.price : 0);
  }, 0);
  totalEl.textContent = money(total);
  checkoutBtn.disabled = false;
}

// ---- Drawer ----
const drawer = document.getElementById("cart-drawer");
const overlay = document.getElementById("cart-overlay");
function openCart() {
  drawer.classList.add("open");
  overlay.classList.add("open");
  document.body.classList.add("cart-open");
}
function closeCart() {
  drawer.classList.remove("open");
  overlay.classList.remove("open");
  document.body.classList.remove("cart-open");
}
document.getElementById("cart-toggle").addEventListener("click", openCart);
document.getElementById("cart-close").addEventListener("click", closeCart);
overlay.addEventListener("click", closeCart);

// ---- Autocompletado de comunas de Chile ----
const comunaInput = document.getElementById("ck-comuna");
const comunaSuggestions = document.getElementById("comuna-suggestions");
let activeSuggestionIndex = -1;

function normalizeStr(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getSuggestionItems() {
  return Array.from(comunaSuggestions.querySelectorAll(".comuna-suggestion"));
}

function updateActiveSuggestion() {
  const items = getSuggestionItems();
  items.forEach((el, i) => {
    el.classList.toggle("active", i === activeSuggestionIndex);
  });
  const active = items[activeSuggestionIndex];
  if (active && active.scrollIntoView) {
    active.scrollIntoView({ block: "nearest" });
  }
}

function selectSuggestion(el) {
  const lat = parseFloat(el.dataset.lat);
  const lng = parseFloat(el.dataset.lng);
  const name = el.querySelector(".cs-name").textContent;
  comunaInput.value = name;
  comunaSuggestions.innerHTML = "";
  comunaSuggestions.classList.remove("open");
  activeSuggestionIndex = -1;

  // Mueve el mapa a la comuna seleccionada
  initDeliveryMap();
  if (deliveryMap) {
    deliveryMap.setView([lat, lng], 14);
    placeMarker(lat, lng);
  }
  document.getElementById("ck-address").focus();
}

function renderComunaSuggestions(matches) {
  comunaSuggestions.innerHTML = matches
    .map(
      (c) => `
    <div class="comuna-suggestion" data-lat="${c.lat}" data-lng="${c.lng}">
      <span class="cs-name">${c.n}</span>
      <span class="cs-region">${c.r}</span>
    </div>`
    )
    .join("");
  comunaSuggestions.classList.add("open");
  activeSuggestionIndex = 0;

  getSuggestionItems().forEach((el) => {
    el.addEventListener("click", () => selectSuggestion(el));
  });
  updateActiveSuggestion();
}

function searchComunas(q) {
  if (q.length < 2) {
    comunaSuggestions.innerHTML = "";
    comunaSuggestions.classList.remove("open");
    activeSuggestionIndex = -1;
    return;
  }
  const matches = COMUNAS_CHILE.filter(
    (c) => normalizeStr(c.n).includes(q) || normalizeStr(c.r).includes(q)
  ).slice(0, 8);

  if (matches.length === 0) {
    comunaSuggestions.innerHTML = "";
    comunaSuggestions.classList.remove("open");
    activeSuggestionIndex = -1;
    return;
  }
  renderComunaSuggestions(matches);
}

comunaInput.addEventListener("input", () => {
  searchComunas(normalizeStr(comunaInput.value.trim()));
});

// Navegación con teclado: flechas + Enter para seleccionar, Esc para cerrar
comunaInput.addEventListener("keydown", (e) => {
  const items = getSuggestionItems();
  const isOpen = comunaSuggestions.classList.contains("open");

  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (!isOpen || items.length === 0) return;
    activeSuggestionIndex = (activeSuggestionIndex + 1) % items.length;
    updateActiveSuggestion();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (!isOpen || items.length === 0) return;
    activeSuggestionIndex =
      (activeSuggestionIndex - 1 + items.length) % items.length;
    updateActiveSuggestion();
  } else if (e.key === "Enter") {
    if (isOpen && items.length > 0 && activeSuggestionIndex >= 0) {
      e.preventDefault();
      selectSuggestion(items[activeSuggestionIndex]);
    }
  } else if (e.key === "Escape") {
    comunaSuggestions.innerHTML = "";
    comunaSuggestions.classList.remove("open");
    activeSuggestionIndex = -1;
  }
});

// Cierra las sugerencias al hacer clic fuera
document.addEventListener("click", (e) => {
  if (!e.target.closest(".comuna-search")) {
    comunaSuggestions.innerHTML = "";
    comunaSuggestions.classList.remove("open");
    activeSuggestionIndex = -1;
  }
});

// ---- Mapa de despacho (Leaflet + OpenStreetMap, sin costo ni API key) ----
let deliveryMap, deliveryMarker;
let deliveryLat = null;
let deliveryLng = null;

function initDeliveryMap() {
  if (deliveryMap) return; // ya inicializado
  const defaultCenter = [-33.4489, -70.6693]; // Santiago, se ajusta si hay geolocalización
  deliveryMap = L.map("delivery-map", { scrollWheelZoom: false }).setView(defaultCenter, 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
    maxZoom: 19,
  }).addTo(deliveryMap);

  // Permitir zoom con la rueda solo si el cursor está sobre el mapa,
  // pero no dejar que "robe" el scroll del carrito al pasar por encima.
  deliveryMap.on("wheel", (e) => {
    if (e.originalEvent.ctrlKey) {
      deliveryMap.scrollWheelZoom.enable();
      deliveryMap.scrollWheelZoom.onWheelScroll(e);
    }
  });
  deliveryMap.on("click", (e) => placeMarker(e.latlng.lat, e.latlng.lng));

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        deliveryMap.setView([pos.coords.latitude, pos.coords.longitude], 15);
      },
      () => {}, // si el usuario no da permiso, se queda en Santiago
      { timeout: 4000 }
    );
  }
}

function placeMarker(lat, lng) {
  deliveryLat = lat;
  deliveryLng = lng;
  if (deliveryMarker) {
    deliveryMarker.setLatLng([lat, lng]);
  } else {
    deliveryMarker = L.marker([lat, lng], { draggable: true }).addTo(deliveryMap);
    deliveryMarker.on("dragend", () => {
      const pos = deliveryMarker.getLatLng();
      deliveryLat = pos.lat;
      deliveryLng = pos.lng;
      reverseGeocode(pos.lat, pos.lng);
    });
  }
  reverseGeocode(lat, lng);
}

async function reverseGeocode(lat, lng) {
  const hint = document.getElementById("map-hint");
  hint.textContent = "Buscando la dirección...";
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { headers: { Accept: "application/json" } }
    );
    const data = await res.json();
    const a = data.address || {};
    const calle = [a.road, a.house_number].filter(Boolean).join(" ");
    const comuna = a.city_district || a.suburb || a.municipality || a.city || a.town || "";
    if (calle) document.getElementById("ck-address").value = calle;
    if (comuna) document.getElementById("ck-comuna").value = comuna;
    hint.textContent = "Dirección detectada. Puedes corregirla si no es exacta.";
  } catch {
    hint.textContent = "No se pudo detectar la dirección automáticamente, escríbela abajo.";
  }
}

// El mapa necesita el contenedor visible para dibujarse bien, así que se
// inicializa cuando se abre el carrito, no al cargar la página.
document.getElementById("cart-toggle").addEventListener("click", () => {
  setTimeout(() => {
    initDeliveryMap();
    if (deliveryMap) deliveryMap.invalidateSize();
  }, 200);
});

// ---- Checkout ----
document.getElementById("checkout-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const note = document.getElementById("checkout-note");
  const btn = document.getElementById("checkout-btn");

  const payload = {
    productIds: cart,
    name: document.getElementById("ck-name").value,
    email: document.getElementById("ck-email").value,
    phone: document.getElementById("ck-phone").value,
    address: document.getElementById("ck-address").value,
    comuna: document.getElementById("ck-comuna").value,
    lat: deliveryLat,
    lng: deliveryLng,
    ageConfirmed: document.getElementById("ck-age").checked,
  };

  if (!payload.ageConfirmed) {
    note.textContent = "Debes confirmar que eres mayor de 18 años para continuar.";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Generando pago...";

  try {
    const res = await fetch("/api/create-preference", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("No se pudo generar el pago");
    const data = await res.json();
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
