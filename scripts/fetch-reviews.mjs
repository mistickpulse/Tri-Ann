// Récupère la note et les derniers avis Google des restaurants (API Places « New »)
// et les enregistre dans src/_data/googleReviews.json, lu par Eleventy à la construction.
// Lancé par GitHub Actions avec la clé GOOGLE_PLACES_KEY (secret du dépôt) : la clé n'est jamais publiée.
// Si la clé manque ou si Google ne répond pas, on garde les avis déjà enregistrés.
import fs from "node:fs";

const KEY = process.env.GOOGLE_PLACES_KEY;
const OUT = "src/_data/googleReviews.json";
const FIELDS = "rating,userRatingCount,reviews.rating,reviews.originalText,reviews.text,reviews.publishTime,reviews.authorAttribution.displayName,reviews.authorAttribution.photoUri";
// Google ne renvoie que 5 avis par restaurant : on garde ceux déjà vus pour avoir plus de choix (30 max, les plus récents)
const KEEP = 30;

const restaurants = JSON.parse(fs.readFileSync("src/_data/restaurants.json", "utf8"));
const previous = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : { places: {} };

if (!KEY) {
  console.log("Avis Google : pas de clé GOOGLE_PLACES_KEY, avis précédents conservés.");
  if (!fs.existsSync(OUT)) fs.writeFileSync(OUT, JSON.stringify(previous, null, 2) + "\n");
  process.exit(0);
}

const places = { ...previous.places };
for (const r of restaurants) {
  if (!r.placeId) continue;
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(r.placeId)}?languageCode=fr`, {
      headers: { "X-Goog-Api-Key": KEY, "X-Goog-FieldMask": FIELDS },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
    const d = await res.json();
    const fresh = (d.reviews || [])
      .map((rv) => ({
        rating: rv.rating,
        text: rv.originalText?.text || rv.text?.text || "",
        author: rv.authorAttribution?.displayName || "Google",
        photo: rv.authorAttribution?.photoUri || null,
        date: rv.publishTime || null,
      }))
      .filter((rv) => rv.text);
    // Fusion avec la réserve : un avis = un auteur + une date (le plus récent remplace l'ancien)
    const pool = new Map((places[r.placeId]?.reviews || []).map((rv) => [rv.author + rv.date, rv]));
    fresh.forEach((rv) => pool.set(rv.author + rv.date, rv));
    places[r.placeId] = {
      rating: d.rating ?? null,
      count: d.userRatingCount ?? null,
      reviews: [...pool.values()].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, KEEP),
    };
    console.log(`Avis Google : ${r.city} ${d.rating} (${d.userRatingCount} avis, ${fresh.length} nouveaux, ${places[r.placeId].reviews.length} en réserve)`);
  } catch (e) {
    console.log(`Avis Google : échec pour ${r.city} (${e.message}), avis précédents conservés.`);
  }
}
fs.writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString(), places }, null, 2) + "\n");
