import { readFileSync } from "node:fs";

// Une page par restaurant et par langue
export default function () {
  const restaurants = JSON.parse(readFileSync("src/_data/restaurants.json", "utf8"));
  const { langs } = JSON.parse(readFileSync("src/_data/site.json", "utf8"));
  return langs.flatMap((lang) => restaurants.map((resto) => ({ lang, resto })));
}
