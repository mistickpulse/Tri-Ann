// Avis Google des restaurants (API Places « New »).
// La clé est publique par nature : elle doit être restreinte au nom de domaine du site dans Google Cloud.
const API_KEY = "AIzaSyD7EnTd_ASgJkjDXofEj81B2fZh129i4x0";
const FIELDS = "rating,userRatingCount,reviews.rating,reviews.text,reviews.originalText,reviews.publishTime,reviews.authorAttribution.displayName";

const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

async function fetchPlace(placeId, lang) {
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=${lang}`, {
    headers: { "X-Goog-Api-Key": API_KEY, "X-Goog-FieldMask": FIELDS },
  });
  if (!res.ok) throw new Error(`Places ${res.status}`);
  return res.json();
}

function renderQuote(review, label, lang) {
  const text = review.originalText?.text || review.text?.text || "";
  if (!text) return "";
  const stars = "★".repeat(Math.round(review.rating || 0)).padEnd(5, "☆");
  const date = review.publishTime ? new Date(review.publishTime).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { month: "long", year: "numeric" }) : "";
  return `<article class="quote">
    <span class="stars" aria-label="${review.rating}/5">${stars}</span>
    <p>${escapeHtml(text)}</p>
    <footer>${escapeHtml(review.authorAttribution?.displayName || "Google")} · ${escapeHtml(label)}${date ? ` · ${date}` : ""}</footer>
  </article>`;
}

document.querySelectorAll("[data-reviews]").forEach(async (block) => {
  const lang = block.dataset.lang || "fr";
  const cards = [...block.querySelectorAll("[data-place]")];
  const results = await Promise.allSettled(cards.map((c) => fetchPlace(c.dataset.place, lang)));
  const quotes = [];

  results.forEach((r, i) => {
    const card = cards[i];
    if (r.status !== "fulfilled") {
      card.querySelector("[data-score]").textContent = "G";
      card.querySelector("[data-count]").closest("small").textContent = lang === "en" ? "Read our reviews" : "Lire les avis";
      return;
    }
    const { rating, userRatingCount, reviews = [] } = r.value;
    card.querySelector("[data-score]").textContent = rating ? rating.toFixed(1).replace(".", lang === "fr" ? "," : ".") : "–";
    card.querySelector("[data-count]").textContent = userRatingCount ?? "";
    card.querySelector("[data-stars]").textContent = "★".repeat(Math.round(rating || 0)).padEnd(5, "☆");
    reviews.slice(0, 4).forEach((rv) => quotes.push({ rv, label: card.dataset.label }));
  });

  // Mélange les avis des différents restaurants
  quotes.sort(() => Math.random() - 0.5);
  block.querySelector("[data-quotes]").innerHTML = quotes.map(({ rv, label }) => renderQuote(rv, label, lang)).join("");
});
