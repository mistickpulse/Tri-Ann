// Chiffre l'outil de l'espace équipe (_site/admin/_outil.html) avec le code ADMIN_CODE
// et le place dans _site/admin/index.html. La version en clair est supprimée du site.
// Le code est lu dans la variable ADMIN_CODE (secret GitHub en ligne), il n'est écrit nulle part.
//   PowerShell : $env:ADMIN_CODE="…"; npm run build; node scripts/chiffrer-admin.mjs
import fs from "node:fs";
import { webcrypto as crypto } from "node:crypto";

const ITER = 600000; // doit rester identique à src/admin/index.njk
const APP = "_site/admin/_outil.html";
const PAGE = "_site/admin/index.html";
const CODE = process.env.ADMIN_CODE;
const b64 = (buf) => Buffer.from(buf).toString("base64");

let payload = "null";
if (!fs.existsSync(APP)) {
  console.log("Espace équipe : outil introuvable, construire le site avant.");
} else if (!CODE) {
  console.log("Espace équipe : pas de code ADMIN_CODE, l'espace reste fermé.");
} else {
  // Sel fixe : la clé tirée du code reste la même d'une mise en ligne à l'autre, donc un appareil
  // « connecté » le reste tant que le code ne change pas (le vecteur iv, lui, change à chaque fois).
  const salt = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("tri-ann.fr/admin v1"))).slice(0, 16);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(CODE), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, fs.readFileSync(APP));
  payload = JSON.stringify({ s: b64(salt), i: b64(iv), c: b64(data) });
  console.log(`Espace équipe : outil chiffré (${Math.round(payload.length / 1024)} Ko).`);
}
// Jamais de version en clair en ligne
if (fs.existsSync(APP)) fs.unlinkSync(APP);
fs.writeFileSync(PAGE, fs.readFileSync(PAGE, "utf8").replace("__ADMIN_PAYLOAD__", payload));
