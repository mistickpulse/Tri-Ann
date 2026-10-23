import { existsSync, readFileSync } from "node:fs";

// IBAN / BIC des restaurants pour l'outil de factures (espace équipe, page chiffrée).
// Jamais dans le dépôt (public) : secret GitHub ADMIN_BANQUES en ligne, fichier prive/banques.json en local.
// Format : { "saint-maximin": { "iban": "FR76 …", "bic": "…", "bank": "…" }, … }
export default function () {
  const raw = process.env.ADMIN_BANQUES || (existsSync("prive/banques.json") ? readFileSync("prive/banques.json", "utf8") : "{}");
  try { return JSON.parse(raw); } catch { console.log("Espace équipe : ADMIN_BANQUES illisible, IBAN non inclus."); return {}; }
}
