// Page « La carte » : catégories, filtres rapides, panneau allergènes et mode « à emporter »

const form = document.querySelector("[data-filters]");
const panel = document.querySelector("[data-filter-panel]");
const body = document.querySelector("[data-menu]");
const menuNav = document.querySelector(".menu-nav");
const dishes = [...document.querySelectorAll(".dish")];
const categories = [...document.querySelectorAll(".menu-category")];
const chips = [...document.querySelectorAll("[data-cat]")];
const lang = document.documentElement.lang;
const T = {
  fr: { one: "Voir 1 plat", many: (n) => `Voir ${n} plats`, none: "Aucun plat", shown: (n) => `${n} plat${n > 1 ? "s" : ""} correspond${n > 1 ? "ent" : ""} à vos critères.`, empty: "Aucun plat ne correspond à ces critères.", less: "Retirer un", more: "Ajouter un" },
  en: { one: "Show 1 dish", many: (n) => `Show ${n} dishes`, none: "No dish", shown: (n) => `${n} dish${n > 1 ? "es" : ""} match${n > 1 ? "" : "es"} your filters.`, empty: "No dish matches these filters.", less: "Remove one", more: "Add one" },
}[lang] || {};
const money = (n) => (lang === "en" ? "€" + n.toFixed(2) : n.toFixed(2).replace(".", ",") + " €");

let selectedCat = ""; // "" = toute la carte

// ---------- Mode « à emporter » (?emporter=<restaurant>) ----------
const restaurants = JSON.parse(document.getElementById("takeaway-data")?.textContent || "[]");
const params = new URLSearchParams(location.search);
let takeaway = restaurants.find((r) => r.slug === params.get("emporter")) || null;

// ---------- Spécialités du moment ----------
// La question Oui / Non est posée à chaque arrivée sur la carte,
// sauf depuis le lien « Voir dans la carte » de l'accueil (?speciales) : spécialités affichées d'office.
// Spécialités affichées par défaut ; le bouton permet de les masquer
let specialsChoice = "oui"; // "oui" ou "aucune"
function setSpecials(choice) {
  specialsChoice = choice;
  renderSpecialsUi();
  applyFilters();
}
function renderSpecialsUi() {
  const btn = document.querySelector("[data-specials-toggle]");
  // Tant qu'on n'a pas répondu : la question Oui / Non ; ensuite : le bouton bascule
  // (en mode à emporter, les spécialités du restaurant sont déjà affichées : ni l'un ni l'autre)
  btn.hidden = !!takeaway;
  btn.setAttribute("aria-pressed", String(specialsChoice === "oui"));
  // En mode à emporter, le restaurant est connu : le tag de disponibilité devient inutile
  document.querySelectorAll("[data-avail]").forEach((el) => (el.hidden = !!takeaway));
}
document.querySelector("[data-specials-toggle]")?.addEventListener("click", () => setSpecials(specialsChoice === "oui" ? "aucune" : "oui"));



// ---------- Panneau allergènes ----------
document.querySelectorAll("[data-open-filters]").forEach((b) => b.addEventListener("click", () => panel.showModal()));
document.querySelectorAll("[data-close-filters]").forEach((b) => b.addEventListener("click", () => panel.close()));
panel?.addEventListener("click", (e) => { if (e.target === panel) panel.close(); });
document.querySelectorAll("[data-clear-allergens]").forEach((b) =>
  b.addEventListener("click", () => {
    form.querySelectorAll('[name="allergen"]').forEach((c) => (c.checked = false));
    applyFilters();
  })
);

function matches(li, f) {
  // Spéciale du moment : seulement pour le restaurant choisi (ou celui de la commande à emporter)
  if (li.dataset.restos) {
    const r = li.dataset.restos.split(" ");
    if (takeaway) { if (!r.includes("tous") && !r.includes(takeaway.slug)) return false; }
    else if (specialsChoice !== "oui") return false;
  }
  if (takeaway && li.closest("[data-no-takeaway]")) return false;
  const tags = li.dataset.tags.split(" ").filter(Boolean);
  if (f.vege && (tags.includes("viande") || tags.includes("poisson"))) return false;
  if (f.noPork && tags.includes("porc")) return false;
  if (f.noAlcohol && tags.includes("alcool")) return false;
  if (f.excluded.length) {
    const a = li.dataset.allergens;
    if (a === "unknown") return false; // non renseigné : masqué par prudence
    if (f.excluded.some((x) => a.split(" ").includes(x))) return false;
  }
  return true;
}

function applyFilters() {
  const data = new FormData(form);
  const f = { vege: data.has("vege"), noPork: data.has("noPork"), noAlcohol: data.has("noAlcohol"), excluded: data.getAll("allergen") };
  const active = f.vege || f.noPork || f.noAlcohol || f.excluded.length > 0;

  // Plats : critères + catégorie choisie
  let count = 0;
  const perCat = new Map(categories.map((c) => [c.id, 0]));
  dishes.forEach((li) => {
    const catId = li.closest(".menu-category").id;
    const ok = matches(li, f);
    if (ok) perCat.set(catId, perCat.get(catId) + 1);
    const visible = ok && (!selectedCat || selectedCat === catId);
    li.hidden = !visible;
    if (visible) count++;
  });

  // Rubriques et catégories vides retirées pour que les résultats restent groupés
  document.querySelectorAll(".menu-section").forEach((sec) => {
    const items = sec.querySelectorAll(".dish");
    const catId = sec.closest(".menu-category").id;
    if (items.length) sec.hidden = ![...items].some((li) => !li.hidden);
    else sec.hidden = active || (selectedCat && selectedCat !== catId); // suppléments, parfums…
  });
  let first = true;
  categories.forEach((cat) => {
    cat.hidden = (selectedCat && selectedCat !== cat.id) || !cat.querySelector(".menu-section:not([hidden])");
    // Même espace en haut pour la première catégorie affichée, quelle qu'elle soit
    cat.classList.toggle("is-first", !cat.hidden && first);
    if (!cat.hidden) first = false;
  });

  // Boutons de catégorie : ceux sans aucun plat correspondant disparaissent
  chips.forEach((b) => {
    const id = b.dataset.cat;
    b.hidden = id !== "" && perCat.get(id) === 0;
    b.setAttribute("aria-pressed", String(id === selectedCat));
  });

  // Compteurs et résumé
  const allergenCount = f.excluded.length;
  const badge = document.querySelector("[data-allergen-count]");
  badge.hidden = !allergenCount;
  badge.textContent = allergenCount;
  document.querySelector("[data-allergen-group]")?.classList.toggle("is-active", allergenCount > 0);
  document.querySelectorAll(".toggle-clear").forEach((b) => (b.hidden = !allergenCount));
  const filterCount = (f.vege ? 1 : 0) + (f.noPork ? 1 : 0) + (f.noAlcohol ? 1 : 0) + allergenCount;
  const pill = document.querySelector("[data-active-pill]");
  pill.hidden = !active;
  pill.querySelector("[data-active-count]").textContent = filterCount;
  document.querySelector("[data-result-count]").textContent = count === 0 ? T.none : count === 1 ? T.one : T.many(count);
  const summary = document.querySelector("[data-filter-summary]");
  summary.hidden = !active;
  summary.querySelector("[data-summary-text]").textContent = count ? T.shown(count) : T.empty;

  body.classList.toggle("show-allergens", data.has("showAllergens"));
  document.querySelector("[data-butter-hint]").hidden = !(f.vege || f.noPork);
  document.querySelector(".no-results")?.toggleAttribute("hidden", !(active && count === 0));
}

// Amène le titre de la première catégorie affichée juste sous la barre des rubriques
function scrollToResults(startY = window.scrollY) {
  const target = document.querySelector(".menu-category:not([hidden]) .menu-category-head") || body;
  const headerH = document.querySelector("[data-header]")?.offsetHeight || 0;
  const top = target.getBoundingClientRect().top + window.scrollY - headerH - menuNav.offsetHeight - 16;
  // Défilement doux sur une courte distance, direct si l'on était loin (évite un double mouvement)
  const far = Math.abs(startY - top) > window.innerHeight;
  window.scrollTo({ top: Math.max(0, top), behavior: far ? "instant" : "smooth" });
}

// Clic sur une catégorie : n'affiche qu'elle ; second clic : toute la carte
chips.forEach((b) =>
  b.addEventListener("click", () => {
    const id = b.dataset.cat;
    const startY = window.scrollY; // avant filtrage : la page peut raccourcir
    selectedCat = id && id !== selectedCat ? id : "";
    applyFilters();
    scrollToResults(startY);
  })
);

form?.addEventListener("change", applyFilters);
form?.addEventListener("reset", () => setTimeout(() => { selectedCat = ""; applyFilters(); }));

// En filtrant par allergène, on affiche aussi la liste sous chaque plat (désactivable)
form?.querySelectorAll('[name="allergen"]').forEach((c) => c.addEventListener("change", () => {
  const sw = form.querySelector("[data-show-allergens]");
  if (c.checked && !sw.checked) { sw.checked = true; applyFilters(); }
}));

// ---------- Commande à emporter (aide à préparer l'appel, aucun paiement en ligne) ----------
const orderBar = document.querySelector("[data-order]");
const orderPanel = document.querySelector("[data-order-panel]");
const orderToggle = document.querySelector("[data-order-toggle]");
const storeKey = () => `triann-commande-${takeaway?.slug}`;
let order = [];

function loadOrder() {
  try { order = JSON.parse(sessionStorage.getItem(storeKey()) || "[]"); } catch { order = []; }
}
function saveOrder() {
  try { sessionStorage.setItem(storeKey(), JSON.stringify(order)); } catch { /* navigation privée */ }
}
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function renderOrder() {
  const qty = order.reduce((n, o) => n + o.qty, 0);
  const total = order.reduce((n, o) => n + o.qty * o.price, 0);
  orderBar.hidden = !takeaway || qty === 0;
  document.querySelector("[data-order-count]").textContent = qty;
  document.querySelector("[data-order-total]").textContent = money(total);
  document.querySelector("[data-order-list]").innerHTML = order
    .map((o, i) => `<li>
      <span class="qty">
        <button type="button" data-qty="${i}" data-delta="-1" aria-label="${T.less} : ${escapeHtml(o.name)}">−</button>
        <b>${o.qty}</b>
        <button type="button" data-qty="${i}" data-delta="1" aria-label="${T.more} : ${escapeHtml(o.name)}">+</button>
      </span>
      <span class="order-name">${escapeHtml(o.name)}</span>
      <span class="order-price">${money(o.qty * o.price)}</span>
    </li>`)
    .join("");
  document.querySelectorAll(".dish[data-name]").forEach((li) => {
    const line = order.find((o) => o.name === li.dataset.name);
    li.classList.toggle("in-order", !!line);
    li.querySelector(".add-btn")?.setAttribute("data-count", line ? line.qty : "");
  });
}

function addToOrder(li) {
  const name = li.dataset.name;
  const price = Number(li.dataset.price);
  const line = order.find((o) => o.name === name);
  if (line) line.qty++;
  else order.push({ name, price, qty: 1 });
  saveOrder();
  renderOrder();
}

document.querySelectorAll("[data-add]").forEach((btn) => btn.addEventListener("click", () => addToOrder(btn.closest(".dish"))));
document.querySelector("[data-order-list]")?.addEventListener("click", (e) => {
  const b = e.target.closest("[data-qty]");
  if (!b) return;
  const line = order[Number(b.dataset.qty)];
  line.qty += Number(b.dataset.delta);
  if (line.qty <= 0) order.splice(Number(b.dataset.qty), 1);
  saveOrder();
  renderOrder();
});
document.querySelector("[data-order-clear]")?.addEventListener("click", () => {
  order = [];
  saveOrder();
  renderOrder();
  setOrderOpen(false);
});
// Ouvre / réduit le détail de la commande (flèche du bandeau, croix du panneau)
function setOrderOpen(open) {
  orderPanel.hidden = !open;
  orderToggle.setAttribute("aria-expanded", String(open));
  orderBar.classList.toggle("is-open", open);
  document.querySelector("[data-order-label-open]").hidden = !open;
  document.querySelector("[data-order-label-closed]").hidden = open;
}
document.querySelector("[data-order-collapse]")?.addEventListener("click", () => setOrderOpen(false));
orderToggle?.addEventListener("click", () => {
  setOrderOpen(orderPanel.hidden);
});

function setupTakeaway() {
  document.body.classList.toggle("is-takeaway", !!takeaway);
  document.querySelector("[data-takeaway-banner]").hidden = !takeaway;
  document.querySelector("[data-takeaway-cta]").hidden = !!takeaway;
  if (takeaway) {
    document.querySelector("[data-takeaway-city]").textContent = takeaway.city;
    document.querySelector("[data-takeaway-phone]").textContent = takeaway.phone;
    document.querySelector("[data-takeaway-call]").href = `tel:${takeaway.phoneIntl}`;
    document.querySelector("[data-order-call]").href = `tel:${takeaway.phoneIntl}`;
    loadOrder();
  }
  renderOrder();
}

document.querySelector("[data-takeaway-exit]")?.addEventListener("click", () => {
  takeaway = null;
  history.replaceState(null, "", location.pathname);
  selectedCat = "";
  setupTakeaway();
  renderSpecialsUi();
  applyFilters();
});

// ---------- Démarrage ----------
// Lien direct vers une catégorie (ex. /carte/#salades) : on la sélectionne
const fromHash = location.hash.slice(1);
if (categories.some((c) => c.id === fromHash)) selectedCat = fromHash;
setupTakeaway();
renderSpecialsUi();
applyFilters();
if (selectedCat) requestAnimationFrame(scrollToResults);
if (params.has("speciales") && !selectedCat) {
  requestAnimationFrame(() => {
    const target = document.querySelector("[data-special-section]:not([hidden])");
    if (!target) return;
    const headerH = document.querySelector("[data-header]")?.offsetHeight || 0;
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - headerH - menuNav.offsetHeight - 16, behavior: "smooth" });
  });
}
window.addEventListener("hashchange", () => {
  const id = location.hash.slice(1);
  if (!categories.some((c) => c.id === id)) return;
  const startY = window.scrollY;
  selectedCat = id;
  applyFilters();
  scrollToResults(startY);
});
