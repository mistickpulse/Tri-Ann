// Copie en local les avis Google du site publié (même contenu que celui du robot),
// pour voir les avis en testant le site sur son ordinateur : npm run avis
import fs from "node:fs";

const URL = "https://tri-ann.fr/donnees/avis-google.json";
const OUT = "src/_data/googleReviews.json";

const res = await fetch(URL, { cache: "no-store" });
if (!res.ok) {
  console.log(`Avis Google : impossible de récupérer ${URL} (${res.status}). Le site a-t-il été publié ?`);
  process.exit(1);
}
const data = await res.json();
fs.writeFileSync(OUT, JSON.stringify(data, null, 2) + "\n");
const n = Object.values(data.places || {}).reduce((t, p) => t + (p.reviews?.length || 0), 0);
console.log(`Avis Google : ${n} avis copiés dans ${OUT}${data.updated ? ` (mis à jour le ${data.updated.slice(0, 10)})` : ""}. Relancer le serveur local pour les voir.`);
