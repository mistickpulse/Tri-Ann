// Transforme la carte imprimable (plats et boissons, français et anglais) en PDF,
// avec Chrome sans fenêtre. Lancé par GitHub Actions après la construction : le PDF suit toujours la carte.
//   npm run build && npm run pdf
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";

const ROOT = path.resolve("_site");
const PAGES = [
  { url: "/carte/imprimable/plats/", out: "carte-tri-ann-plats.pdf" },
  { url: "/carte/imprimable/boissons/", out: "carte-tri-ann-boissons.pdf" },
  { url: "/en/menu/printable/food/", out: "en/tri-ann-menu-food.pdf" },
  { url: "/en/menu/printable/drinks/", out: "en/tri-ann-menu-drinks.pdf" },
];
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".jpg": "image/jpeg", ".png": "image/png", ".woff2": "font/woff2", ".svg": "image/svg+xml" };

// Chrome : variable CHROME_PATH, sinon les emplacements habituels (Linux de GitHub, Windows, macOS)
const CANDIDATES = [
  process.env.CHROME_PATH,
  "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);
const chrome = CANDIDATES.find((p) => fs.existsSync(p));
if (!chrome) {
  console.log("Carte PDF : Chrome introuvable, PDF non généré (définir CHROME_PATH).");
  process.exit(0);
}

// Petit serveur local pour que les polices et images se chargent comme sur le site
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

try {
  for (const p of PAGES) {
    const out = path.join(ROOT, p.out);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const args = ["--headless=new", "--disable-gpu", "--no-sandbox", "--no-pdf-header-footer", "--virtual-time-budget=5000", `--print-to-pdf=${out}`, `http://127.0.0.1:${port}${p.url}`];
    // Chrome tourne à côté pendant que le serveur ci-dessus lui envoie les fichiers
    await new Promise((resolve, reject) => execFile(chrome, args, { timeout: 60000 }, (err) => (err ? reject(err) : resolve())));
    console.log(`Carte PDF : ${p.out} (${Math.round(fs.statSync(out).size / 1024)} Ko)`);
  }
} finally {
  server.close();
}
