// Récupère la note et les derniers avis Google des restaurants (API Places « New »)
// et les enregistre dans src/_data/googleReviews.json, lu par Eleventy à la construction.
// Lancé par GitHub Actions avec la clé GOOGLE_PLACES_KEY (secret du dépôt) : la clé n'est jamais publiée.
// Si la clé manque ou si Google ne répond pas, on garde les avis déjà enregistrés.
import fs from "node:fs";

const KEY = process.env.GOOGLE_PLACES_KEY;
const OUT = "src/_data/googleReviews.json";
const FIELDS = "rating,userRatingCount,reviews.rating,reviews.originalText,reviews.text,reviews.publishTime,reviews.authorAttribution.displayName";

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
    places[r.placeId] = {
      rating: d.rating ?? null,
      count: d.userRatingCount ?? null,
      reviews: (d.reviews || [])
        .map((rv) => ({
          rating: rv.rating,
          text: rv.originalText?.text || rv.text?.text || "",
          author: rv.authorAttribution?.displayName || "Google",
          date: rv.publishTime || null,
        }))
        .filter((rv) => rv.text),
    };
    console.log(`Avis Google : ${r.city} ${d.rating} (${d.userRatingCount} avis, ${places[r.placeId].reviews.length} textes)`);
  } catch (e) {
    console.log(`Avis Google : échec pour ${r.city} (${e.message}), avis précédents conservés.`);
  }
}
fs.writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString(), places }, null, 2) + "\n");
