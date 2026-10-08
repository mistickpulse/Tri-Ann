// Cherche des avis Google qui parlent d'un événement (ex. karaoké) et les ajoute à src/_data/avisManuels.json.
// Google ne renvoie que 5 avis par demande : on demande dans plusieurs langues pour en voir d'autres.
// La clé est lue dans la variable GOOGLE_PLACES_KEY au lancement, elle n'est enregistrée nulle part.
//
//   PowerShell : $env:GOOGLE_PLACES_KEY="la-clé"; node scripts/chercher-avis.mjs; Remove-Item Env:GOOGLE_PLACES_KEY
//
// Quota : 1 demande par restaurant et par langue (2 restaurants x 4 langues = 8 demandes, limite fixée à 15 par jour).
import fs from "node:fs";

const KEY = process.env.GOOGLE_PLACES_KEY;
const LANGS = ["fr", "en", "de", "es"];
const MAX_CALLS = 8;
const OUT = "src/_data/avisManuels.json";
const FIELDS = "reviews.rating,reviews.originalText,reviews.publishTime,reviews.authorAttribution.displayName,reviews.authorAttribution.photoUri";

if (!KEY) {
  console.log("Il manque la clé : $env:GOOGLE_PLACES_KEY=\"la-clé\" avant de lancer le script.");
  process.exit(1);
}

const plain = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const restaurants = JSON.parse(fs.readFileSync("src/_data/restaurants.json", "utf8"));
const manual = JSON.parse(fs.readFileSync(OUT, "utf8"));

// Restaurants et mots-clés tirés des événements (ligne « avis: » des fichiers src/content/events)
const targets = new Map();
for (const f of fs.readdirSync("src/content/events")) {
  const src = fs.readFileSync(`src/content/events/${f}`, "utf8");
  const word = src.match(/^avis:\s*(.+)$/m)?.[1].trim();
  if (!word || /^active:\s*false/m.test(src)) continue;
  const slugs = src.match(/^etablissements:\s*\[(.*)\]/m)?.[1].split(",").map((s) => s.trim()) || restaurants.map((r) => r.slug);
  for (const s of slugs) targets.set(s, [...(targets.get(s) || []), plain(word)]);
}

let calls = 0;
for (const [slug, words] of targets) {
  const r = restaurants.find((x) => x.slug === slug);
  if (!r?.placeId) continue;
  const seen = new Map();
  for (const lang of LANGS) {
    if (calls >= MAX_CALLS) break;
    calls++;
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(r.placeId)}?languageCode=${lang}`, {
      headers: { "X-Goog-Api-Key": KEY, "X-Goog-FieldMask": FIELDS },
    });
    if (!res.ok) { console.log(`${r.city} (${lang}) : erreur ${res.status}`); continue; }
    for (const rv of (await res.json()).reviews || []) {
      const author = rv.authorAttribution?.displayName || "Google";
      seen.set(author + rv.publishTime, rv);
    }
  }
  const list = (manual[slug] ||= []);
  let added = 0;
  for (const rv of seen.values()) {
    const text = rv.originalText?.text || "";
    if (!words.some((w) => plain(text).includes(w))) continue;
    const author = rv.authorAttribution?.displayName || "Google";
    const entry = { auteur: author, date: rv.publishTime?.slice(0, 7) || null, note: rv.rating, texte: text, photo: rv.authorAttribution?.photoUri || null };
    const i = list.findIndex((m) => m.auteur === author);
    if (i >= 0) list[i] = { ...list[i], ...entry, traduction: undefined }; else list.push(entry);
    added++;
  }
  console.log(`${r.city} : ${seen.size} avis différents vus, ${added} parlent de ${words.join("/")}`);
}
fs.writeFileSync(OUT, JSON.stringify(manual, null, 2) + "\n");
console.log(`${calls} demandes faites. Réserve mise à jour : ${OUT}`);
