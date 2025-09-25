// ====== CONFIG ======
const API_KEY = "AIzaSyD7EnTd_ASgJkjDXofEj81B2fZh129i4x0"; // <-- clé restreinte par referer
const PLACES = [
  {
    label: "Tri-Ann",
    id: "ChIJdes350U85kcR2FT72aMj_sQ",
    badge: "b1"
  },
  {
    label: "Tri-Ann 2",
    id: "ChIJOZjFiUoj5kcRIqxFP_bk3y8",
    badge: "b2"
  },
  {
    label: "Tri-Ann 3",
    id: "ChIJQWRjRCGWlxURMRmQF8xkp0A", // ID T3
    //    id: "ChIJdes350U85kcR2FT72aMj_sQ", //ID T2 TMP
    badge: "b3"
  }
];
const LANGUAGE = "fr";
const AUTOPLAY_MS = 5000; // 5s entre slides

// ====== HELPERS ======
const fieldMask = [
  "rating",
  "userRatingCount",
  "reviews.rating",
  "reviews.text",
  "reviews.publishTime",
  "reviews.authorAttribution.displayName",
  "reviews.authorAttribution.uri"
].join(",");

function starBar(n) {
  const full = Math.round(Number(n) || 0);
  return "★".repeat(full).padEnd(5, "☆");
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-FR");
  } catch {
    return "";
  }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildBadge(place, data) {
  if (!data) {
    data = {
      rating: 0.0,
      reviews: [],
      userRatingCount: 0
    };
  }
  const badge = document.getElementById(place.badge);
  if (badge) {
    const note = (data.rating ?? 0).toFixed(1) || 0;
    const count = data.userRatingCount ?? 0;
    //badge.textContent = `${note}★ (${count} avis)`;
    badge.innerHTML = `
  <span style="color: #cda45e; font-weight:600;">${note}★</span>
  (<span style="color: #cda45e;">${count}</span> avis)
`;
  }
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function fetchPlace(place) {
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(
    place.id
  )}?languageCode=${LANGUAGE}`;

  const res = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": fieldMask
    }
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");

    buildBadge(place, null);
    throw new Error(`Place ${place.label} → HTTP ${res.status} ${txt}`);
  }

  const data = await res.json();

  // badge avec note globale
  buildBadge(place, data);
  const reviewsArr = Array.isArray(data.reviews)
    ? data.reviews.slice(0, 5)
    : [];
  const reviews = reviewsArr.map((r) => ({
    place: place.label,
    rating: r?.rating || 0,
    text: r?.text?.text ? r.text.text : "",
    author: r?.authorAttribution?.displayName || "Utilisateur Google",
    authorUrl: r?.authorAttribution?.uri || null,
    date: r?.publishTime || null
  }));

  return reviews;
}

// function renderSlides(reviews) {
//   const root = document.getElementById("carousel");
//   root.innerHTML = "";
//   reviews.forEach((rv, idx) => {
//     const el = document.createElement("div");
//     el.className = "slide" + (idx === 0 ? " active" : "");
//     el.innerHTML = `
//         <div class="head">
//           <div class="stars" aria-label="${rv.rating} sur 5">${starBar(
//       rv.rating
//     )}</div>
//           <div class="place">${escapeHtml(rv.place)}</div>
//         </div>
//         <div class="text">${escapeHtml(rv.text)}</div>
//         <div class="meta">
//           <span>Auteur :</span>
//           ${
//             rv.authorUrl
//               ? `<a href="${
//                   rv.authorUrl
//                 }" target="_blank" rel="noopener">${escapeHtml(rv.author)}</a>`
//               : `<span>${escapeHtml(rv.author)}</span>`
//           }
//           ${rv.date ? `• <span>${formatDate(rv.date)}</span>` : ""}
//         </div>
//       `;
//     root.appendChild(el);
//   });
//   const counter = document.getElementById("counter");
//   if (counter) counter.textContent = `Avis affichés : ${reviews.length}`;
// }

function finalText(text) {
  const MAX_STR_LEN = 500;
  if (text.length > MAX_STR_LEN) {
    return text.slice(0, MAX_STR_LEN) + "...";
  }
  return text;
}

function renderSlides(reviews) {
  const root = document.getElementById("carousel");
  root.innerHTML = "";

  // On découpe le tableau d'avis en groupes de 3
  for (let i = 0; i < reviews.length; i += 3) {
    const group = reviews.slice(i, i + 3);

    const el = document.createElement("div");
    el.className = "slide" + (i === 0 ? " active" : "");

    el.innerHTML = `
            <div class="slide-group">
              ${group
                .map((rv) => {
                  let txt = finalText(rv.text);
                  return `
                <div class="review-card">
                  <div class="head row">
                    <div class="stars" aria-label="${
                      rv.rating
                    } sur 5">${starBar(rv.rating)}</div>
                    <div class="place ms-auto">${escapeHtml(rv.place)}</div>
                  </div>
                  <div class="text">${escapeHtml(txt)}</div>
                  <div class="meta">
                    <span>Auteur :</span>
                    ${
                      rv.authorUrl
                        ? `<a href="${
                            rv.authorUrl
                          }" target="_blank" rel="noopener">${escapeHtml(
                            rv.author
                          )}</a>`
                        : `<span>${escapeHtml(rv.author)}</span>`
                    }
                    ${rv.date ? `• <span>${formatDate(rv.date)}</span>` : ""}
                  </div>
                </div>
              `;
                })
                .join("")}
            </div>
          `;

    root.appendChild(el);
  }

  const counter = document.getElementById("counter");
  if (counter) counter.textContent = `Avis affichés : ${reviews.length}`;
}

function startCarousel() {
  const slides = Array.from(document.querySelectorAll(".slide"));
  if (slides.length <= 1) return;
  let i = 0;
  setInterval(() => {
    slides[i].classList.remove("active");
    i = (i + 1) % slides.length;
    slides[i].classList.add("active");
  }, AUTOPLAY_MS);
}

// ====== BOOTSTRAP ======
(async function init() {
  try {
    const all = await Promise.allSettled(PLACES.map(fetchPlace));

    let merged = [];
    for (const r of all) {
      if (r.status === "fulfilled") {
        merged = merged.concat(r.value);
      } else {
        console.warn("Fetch error:", r.reason);
      }
    }

    if (!merged.length) throw new Error("Aucun avis disponible.");

    shuffle(merged);
    renderSlides(merged);
    startCarousel();
  } catch (err) {
    console.error(err);
    const c = document.getElementById("carousel");
    c.innerHTML = `<div class="slide active"><div class="text">Impossible de charger les avis pour le moment.</div></div>`;
  }
})();

// Mesure la hauteur de la slide active et l'applique au conteneur
function resizeCarouselHeight() {
  const carousel = document.getElementById("carousel");
  const active = carousel?.querySelector(".slide.active");
  if (!carousel || !active) return;

  // On force la slide active à être "mesurable"
  // (elle est déjà visible/opacité 1, donc scrollHeight OK)
  const h = active.scrollHeight;
  carousel.style.height = h + "px";
}

// Appelle resize au bon moment
function startCarousel() {
  const slides = Array.from(document.querySelectorAll(".slide"));
  if (slides.length <= 1) {
    resizeCarouselHeight();
    return;
  }
  let i = 0;

  // Première mesure
  resizeCarouselHeight();

  setInterval(() => {
    slides[i].classList.remove("active");
    i = (i + 1) % slides.length;
    slides[i].classList.add("active");

    // Recalcule la hauteur après le changement de slide
    // petit timeout pour laisser le DOM peindre la nouvelle slide
    requestAnimationFrame(() => resizeCarouselHeight());
  }, AUTOPLAY_MS);
}

// Recalcule si la fenêtre change (responsive)
window.addEventListener("resize", () => {
  requestAnimationFrame(() => resizeCarouselHeight());
});
