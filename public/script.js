const money = (n) => "$" + Math.round(n).toLocaleString("es-CL");

let PRODUCTS = [];
let cart = JSON.parse(localStorage.getItem("cart") || "[]");

async function applySiteContent() {
  try {
    const res = await fetch("/api/site-content");
    if (!res.ok) return;
    const content = await res.json();

    if (content.theme) {
      const root = document.documentElement;
      root.style.setProperty("--copper", content.theme.primary || "#C97A3D");
      root.style.setProperty("--copper-bright", content.theme.secondary || content.theme.primary || "#E39655");
      root.style.setProperty("--bg", content.theme.bg || "#241713");
      root.style.setProperty("--bg-deep", content.theme.bgDeep || content.theme.bg || "#1A0F0C");
      root.style.setProperty("--paper", content.theme.paper || "#F4ECDD");
      root.style.setProperty("--ink", content.theme.ink || "#2B1B12");
    }

    const brandName = document.getElementById("brand-name");
    if (brandName && content.brand) brandName.textContent = content.brand === "Bees and Beers" ? "B&B" : content.brand;

    const heroEyebrow = document.getElementById("hero-eyebrow");
    if (heroEyebrow && content.hero?.eyebrow) heroEyebrow.textContent = content.hero.eyebrow;

    const heroTitle = document.getElementById("hero-title");
    if (heroTitle && content.hero?.title) heroTitle.innerHTML = content.hero.title.replace(/\n/g, "<br>");

    const heroTagline = document.getElementById("hero-tagline");
    if (heroTagline && content.hero?.tagline) heroTagline.textContent = content.hero.tagline;

    const heroModes = document.getElementById("hero-modes");
    if (heroModes && content.hero?.modes) heroModes.textContent = content.hero.modes;

    const heroBadge = document.getElementById("hero-badge");
    if (heroBadge && content.hero?.badge) heroBadge.textContent = content.hero.badge;

    const heroPrimary = document.getElementById("hero-primary-cta");
    if (heroPrimary && content.hero?.primaryCta) heroPrimary.textContent = content.hero.primaryCta;

    const heroSecondary = document.getElementById("hero-secondary-cta");
    if (heroSecondary && content.hero?.secondaryCta) heroSecondary.textContent = content.hero.secondaryCta;

    const footerText = document.getElementById("footer-text");
    if (footerText && content.footerText) footerText.textContent = content.footerText;

    const footerEmail = document.getElementById("footer-email");
    if (footerEmail && content.email) {
      footerEmail.href = `mailto:${content.email}`;
      footerEmail.textContent = content.email;
    }

    const howGrid = document.getElementById("how-grid");
    if (howGrid && Array.isArray(content.process?.steps)) {
      howGrid.innerHTML = content.process.steps.map((step, index) => `
        <div class="how-step">
          <span class="rn">${index + 1}</span>
          <h3>${step.title}</h3>
          <p>${step.description}</p>
        </div>
      `).join("");
    }

    const faqList = document.getElementById("faq-list");
    if (faqList && Array.isArray(content.faq)) {
      faqList.innerHTML = content.faq.map((item) => `
        <details>
          <summary>${item.question}</summary>
          <p>${item.answer}</p>
        </details>
      `).join("");
    }
  } catch (error) {
    console.warn("No se pudo cargar el contenido editable del sitio", error);
  }
}

// ---- Costos de envío (Bees and Beers, origen: Puerto Montt) ----
const ORIGEN_LAT = -41.41005;
const ORIGEN_LNG = -72.874869;
const STORE_ADDRESS = "Bees and Beers";

// Precios de envío calculados para cubrir la bencina ($1.478/L, ~10 km/L)
// y el desgaste del vehículo. Retiro en tienda es gratis; el despacho
// siembre se cobra según la distancia desde Puerto Montt.
// Reglas:
//  - Dentro de 5 km: $2.500.
//  - Desde 5 km: parte en $5.000 → $7.000 (a los 15 km) → $21.000 (a los 25 km).
//  - Más de 25 km: NO se hace envío.
const LOCAL_KM = 5; // radio local donde se cobra tarifa fija
const LOCAL_PRICE = 2500; // tarifa fija dentro del radio local
const MIN_SHIPPING = 5000; // envío mínimo (desde el km 5)
const TIER1_MAX = 7000; // a los 15 km se alcanza este precio
const TIER1_KM = 15; // distancia donde el precio llega a $7.000
const TIER2_MAX = 21000; // a los 25 km se alcanza este precio
const TIER2_KM = 25; // distancia donde el precio llega a $21.000
const MAX_DELIVERY_KM = 25; // no se despacha más allá de 25 km
const DELIVERY_TIME = "una hora y media"; // entrega estimada desde el pedido

let deliveryMode = "delivery"; // "delivery" | "pickup"

// Fórmula de Haversine para distancia en km entre dos coordenadas
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getCartSubtotal() {
  return cart.reduce((sum, id) => {
    const p = PRODUCTS.find((x) => x.id === id);
    // Solo suma productos disponibles (si un producto se desactivó, se ignora).
    return sum + (p && p.available !== false ? p.price : 0);
  }, 0);
}

function getShippingInfo() {
  if (deliveryMode === "pickup") {
return { price: 0, label: "Retiro en tienda", zone: "Retiro gratis en Bees and Beers" };
  }
if (deliveryLat == null || deliveryLng == null) {
    return null; // aún no hay ubicación
  }
const dist = distanceKm(ORIGEN_LAT, ORIGEN_LNG, deliveryLat, deliveryLng);
  // Más de 25 km: no se hace envío.
  if (dist > MAX_DELIVERY_KM) {
    return { noDelivery: true, distanceKm: Math.round(dist) };
  }
// Progresión según distancia:
  //  - Dentro de 5 km: tarifa fija $2.500.
  //  - Desde 5 km: parte en $5.000 y sube → $7.000 a los 15 km → $21.000 a los 25 km.
  // Se redondea al múltiplo de $100 más cercano para montos claros.
  const price = (() => {
    if (dist <= LOCAL_KM) {
      return LOCAL_PRICE;
    }
    if (dist <= TIER1_KM) {
      const ratio = (dist - LOCAL_KM) / (TIER1_KM - LOCAL_KM);
      return Math.round((MIN_SHIPPING + (TIER1_MAX - MIN_SHIPPING) * ratio) / 100) * 100;
    }
    const ratio = (dist - TIER1_KM) / (TIER2_KM - TIER1_KM);
    return Math.round((TIER1_MAX + (TIER2_MAX - TIER1_MAX) * ratio) / 100) * 100;
  })();
  return {
    price,
    label: "Despacho a domicilio",
    zone: `~${Math.round(dist)} km desde ${STORE_ADDRESS}`,
    distanceKm: Math.round(dist),
  };
}

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
  // Solo se muestran los productos disponibles (available !== false).
  const visible = PRODUCTS.filter((p) => p.available !== false);
  grid.innerHTML = visible
    .map(
      (p) => `
    <article class="card">
      ${p.image ? `<div class="card-img"><img src="${p.image}" alt="${p.name}" loading="lazy"></div>` : ""}
      <span class="card-style">${p.style} · ${p.volume}</span>
      <h3>${p.name}</h3>
      <span class="card-abv">${p.abv}</span>
      <p class="card-tagline">${p.tagline}</p>
      <div class="card-foot">
        <span class="card-price">${money(p.price)}</span>
        <button class="card-add" data-id="${p.id}">Agregar</button>
      </div>
    </article>`
    )
    .join("");
  if (visible.length === 0) {
    grid.innerHTML = '<p class="card-empty">Por ahora no hay productos disponibles.</p>';
  }

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
  const subtotalEl = document.getElementById("cart-subtotal-amount");
  const shippingEl = document.getElementById("cart-shipping-amount");
  const totalEl = document.getElementById("cart-total-amount");
  const checkoutBtn = document.getElementById("checkout-btn");

  countEl.textContent = cart.length;

  if (cart.length === 0) {
    itemsEl.innerHTML = '<p class="cart-empty">Tu carrito está vacío.</p>';
    if (subtotalEl) subtotalEl.textContent = money(0);
    if (shippingEl) shippingEl.textContent = money(0);
    totalEl.textContent = money(0);
    checkoutBtn.disabled = true;
    return;
  }

  const counts = {};
  cart.forEach((id) => (counts[id] = (counts[id] || 0) + 1));

const rows = Object.entries(counts).map(([id, qty]) => {
    const p = PRODUCTS.find((x) => x.id === id);
    // Si el producto ya no está disponible, se omite del carrito.
    if (!p || p.available === false) return "";
    return `
    <div class="cart-item">
      ${p.image ? `<div class="cart-item-img"><img src="${p.image}" alt="${p.name}"></div>` : ""}
      <div class="cart-item-info">
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

const subtotal = getCartSubtotal();
  const shipping = getShippingInfo();
  const shippingPrice = shipping?.price || 0;
  const total = subtotal + shippingPrice;

  if (subtotalEl) subtotalEl.textContent = money(subtotal);
  if (shippingEl) {
    if (shipping?.noDelivery) {
      shippingEl.textContent = "No disponible";
    } else if (shipping && (shipping.price === 0 || deliveryMode === "pickup")) {
      shippingEl.textContent = "Gratis";
    } else if (shipping) {
      shippingEl.textContent = money(shippingPrice);
    } else {
      shippingEl.textContent = "—";
    }
  }
  totalEl.textContent = money(total);
  // Si la distancia supera 30 km, no se puede pagar (no hay envío).
  checkoutBtn.disabled = Boolean(shipping?.noDelivery);
  if (shipping?.noDelivery) {
    checkoutBtn.textContent = "Sin envío a tu zona";
  } else {
    checkoutBtn.textContent = "Pagar ahora";
  }
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
  renderShippingSummary();
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
      renderShippingSummary();
      renderCart();
      reverseGeocode(pos.lat, pos.lng);
    });
  }
  renderShippingSummary();
  renderCart();
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

// ---- Selector de modo de entrega (despacho / retiro) ----
function setDeliveryMode(mode) {
  deliveryMode = mode;
  const deliveryForm = document.getElementById("delivery-fields");
  const pickupNote = document.getElementById("pickup-note");
  const shipSummary = document.getElementById("shipping-summary");
  const dmDelivery = document.getElementById("dm-delivery");
  const dmPickup = document.getElementById("dm-pickup");

  if (dmDelivery) dmDelivery.classList.toggle("active", mode === "delivery");
  if (dmPickup) dmPickup.classList.toggle("active", mode === "pickup");

  if (mode === "pickup") {
    if (deliveryForm) deliveryForm.style.display = "none";
    if (pickupNote) pickupNote.style.display = "block";
    if (shipSummary) shipSummary.style.display = "none";
  } else {
    if (deliveryForm) deliveryForm.style.display = "block";
    if (pickupNote) pickupNote.style.display = "none";
    if (shipSummary) shipSummary.style.display = "block";
    renderShippingSummary();
  }
  renderCart();
}

document.getElementById("dm-delivery")?.addEventListener("click", () => setDeliveryMode("delivery"));
document.getElementById("dm-pickup")?.addEventListener("click", () => setDeliveryMode("pickup"));

// ---- Resumen de envío en el carrito ----
function renderShippingSummary() {
  const el = document.getElementById("shipping-summary");
  const infoEl = document.getElementById("shipping-info");
  if (!el) return;
  const shipping = getShippingInfo();
  if (deliveryMode === "pickup") {
    el.style.display = "none";
    return;
  }
el.style.display = "block";
  if (!shipping) {
    infoEl.innerHTML = "Selecciona tu comuna o marca tu dirección en el mapa para calcular el costo de envío.";
    return;
  }
  if (shipping.noDelivery) {
infoEl.innerHTML = `<strong style="color:#A8432F;">No hacemos envíos a más de 25 km.</strong> Puedes elegir retiro en tienda.`;
    return;
  }
  if (shipping.price === 0) {
    infoEl.innerHTML = `<strong>Retiro en tienda</strong> · sin costo`;
  } else {
    infoEl.innerHTML = `<strong>${money(shipping.price)}</strong> · ${shipping.label} (${shipping.zone})<br><span style="font-size:11.5px;color:var(--ink-soft);">Entrega estimada: ${DELIVERY_TIME}</span>`;
  }
}

// ---- Checkout ----
document.getElementById("checkout-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const note = document.getElementById("checkout-note");
  const btn = document.getElementById("checkout-btn");

  const shipping = getShippingInfo();
  const isPickup = deliveryMode === "pickup";

  const payload = {
    productIds: cart,
    name: document.getElementById("ck-name").value,
    email: document.getElementById("ck-email").value,
    phone: document.getElementById("ck-phone").value,
    address: isPickup ? STORE_ADDRESS : document.getElementById("ck-address").value,
    comuna: isPickup ? "Retiro en tienda" : document.getElementById("ck-comuna").value,
    lat: isPickup ? null : deliveryLat,
    lng: isPickup ? null : deliveryLng,
    deliveryMode,
    shippingPrice: isPickup ? 0 : shipping?.price || 0,
    ageConfirmed: document.getElementById("ck-age").checked,
  };

  if (!payload.ageConfirmed) {
    note.textContent = "Debes confirmar que eres mayor de 18 años para continuar.";
    return;
  }

if (!isPickup && !shipping) {
    note.textContent = "Selecciona tu comuna o marca tu dirección en el mapa para calcular el envío.";
    return;
  }
  if (!isPickup && shipping?.noDelivery) {
note.textContent = "No hacemos envíos a más de 25 km. Elige retiro en tienda o una dirección más cercana.";
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
  await applySiteContent();
  const res = await fetch("/api/products");
  PRODUCTS = await res.json();
  renderProducts();
  renderCart();
  renderShippingSummary();
  setDeliveryMode("delivery");
}
init();
