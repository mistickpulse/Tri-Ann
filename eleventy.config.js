import { readFileSync, readdirSync } from "node:fs";
import { HtmlBasePlugin } from "@11ty/eleventy";
import nunjucks from "nunjucks";

export default function (eleventyConfig) {
  // Sous-dossier GitHub Pages (ex. "/Tri-Ann/"). Avec un nom de domaine perso, mettre "/".
  eleventyConfig.addPlugin(HtmlBasePlugin);

  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  // Les contenus éditables (spéciales, événements…) ne génèrent pas de page à eux seuls
  eleventyConfig.addCollection("specials", (api) =>
    api
      .getFilteredByGlob("src/content/specials/*.md")
      .filter((s) => s.data.active !== false)
      // Ordre d'affichage : galette salée, crêpe sucrée, puis cocktail
      .sort((a, b) => ["salee", "sucree", "cocktail"].indexOf(a.data.type) - ["salee", "sucree", "cocktail"].indexOf(b.data.type))
  );
  eleventyConfig.addCollection("events", (api) =>
    api
      .getFilteredByGlob("src/content/events/*.md")
      .filter((e) => e.data.active !== false)
      .sort((a, b) => String(a.data.date || "").localeCompare(String(b.data.date || "")))
  );
  eleventyConfig.addCollection("notices", (api) =>
    api.getFilteredByGlob("src/content/notices/*.md").filter((n) => n.data.active !== false)
  );

  // Traduction : t("cle", lang) lit src/_data/i18n.json
  let dict;
  eleventyConfig.on("eleventy.before", () => {
    dict = JSON.parse(readFileSync("src/_data/i18n.json", "utf8"));
  });
  // Numéros de relecture (T1, T2…) : affichés seulement si reviewMode vaut true dans site.json
  let reviewIds = {}, reviewMode = false;
  eleventyConfig.on("eleventy.before", () => {
    reviewMode = JSON.parse(readFileSync("src/_data/site.json", "utf8")).reviewMode === true;
    const { keys } = JSON.parse(readFileSync("src/_data/reviewTags.json", "utf8"));
    reviewIds = Object.fromEntries(keys.map((k, i) => [k, "T" + (i + 1)]));
  });
  eleventyConfig.addNunjucksFilter("rtag", (key) => {
    const id = reviewIds[key];
    if (!reviewMode || !id) return "";
    return new nunjucks.runtime.SafeString(`<span class="rtag" data-rtag="${id}" title="Texte à valider : envoyez « ${id} » dans le groupe pour en discuter">${id}<small>à valider</small></span>`);
  });

  eleventyConfig.addFilter("t", (key, lang) => {
    const entry = key.split(".").reduce((o, k) => (o ? o[k] : undefined), dict);
    if (!entry) return key;
    return entry[lang] ?? entry.fr ?? key;
  });

  // Champ bilingue { fr, en } ou simple texte
  eleventyConfig.addFilter("tr", (value, lang) => {
    if (value == null) return "";
    if (typeof value === "string") return value;
    return value[lang] || value.fr || "";
  });

  // Avis Google enregistrés par scripts/fetch-reviews.mjs : 4 par restaurant, uniquement 4 et 5 étoiles
  // (un 4 étoiles quand il y en a, le reste en 5 étoiles), mélangés à chaque construction du site.
  const shuffle = (list) => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const plain = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  // Mots des avis liés aux événements (ligne « avis: » des fichiers src/content/events, ex. karaok)
  const EVENT_WORDS = readdirSync("src/content/events")
    .map((f) => readFileSync(`src/content/events/${f}`, "utf8").match(/^avis:\s*(.+)$/m)?.[1].trim())
    .filter(Boolean)
    .map(plain);
  const aboutEvent = (rv) => EVENT_WORDS.some((w) => plain(rv.text).includes(w));
  eleventyConfig.addFilter("reviewQuotes", (data, restaurants, slugs) => {
    const out = [];
    let eventQuotes = 0; // au plus 1 avis qui parle d'un événement (karaoké…) dans la liste
    for (const r of restaurants) {
      if (slugs && !slugs.includes(r.slug)) continue;
      const pool = (data?.places?.[r.placeId]?.reviews || []).map((rv) => ({ ...rv, label: r.city }));
      const fives = shuffle(pool.filter((rv) => rv.rating === 5));
      const fours = shuffle(pool.filter((rv) => rv.rating === 4));
      // Un 4 étoiles, trois 5 étoiles ; s'il en manque, on complète avec les autres
      const order = [...fours.slice(0, 1), ...fives.slice(0, 3), ...fives.slice(3), ...fours.slice(1)];
      let n = 0;
      for (const rv of order) {
        if (n === 4) break;
        if (aboutEvent(rv)) { if (eventQuotes) continue; eventQuotes++; }
        out.push(rv);
        n++;
      }
    }
    return shuffle(out);
  });
  // Avis trop longs : coupés à la fin d'un mot, avec « … »
  const excerpt = (text, max = 220) => {
    const s = String(text || "").replace(/\s+/g, " ").trim();
    if (s.length <= max) return s;
    return s.slice(0, max).replace(/[\s,;:.!?-]+\S*$/, "") + "…";
  };
  eleventyConfig.addFilter("excerpt", excerpt);
  eleventyConfig.addFilter("reviewDate", (iso, lang) =>
    iso ? new Date(iso).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { month: "long", year: "numeric" }) : "");
  eleventyConfig.addFilter("score", (n, lang) => (n ? (lang === "fr" ? n.toFixed(1).replace(".", ",") : n.toFixed(1)) : "–"));
  eleventyConfig.addFilter("stars", (n) => "★".repeat(Math.round(n || 0)).padEnd(5, "☆"));

  eleventyConfig.addFilter("price", (value, lang) => {
    if (value == null || value === "") return "";
    const n = Number(value);
    return lang === "en"
      ? "€" + n.toFixed(2)
      : n.toFixed(2).replace(".", ",") + " €";
  });

  eleventyConfig.addFilter("route", (routes, key, lang, slug) => {
    const r = routes[key];
    if (!r) return "/";
    const path = r[lang] || r.fr;
    return slug ? path.replace(":slug", slug) : path;
  });

  eleventyConfig.addFilter("forRestaurant", (items, slug) =>
    (items || []).filter((i) => {
      const r = i.data.etablissements;
      return !r || r.length === 0 || r.includes("tous") || r.includes(slug);
    })
  );

  eleventyConfig.addFilter("allergenNames", (ids, all, lang) => all.filter((a) => (ids || []).includes(a.id)).map((a) => a[lang]).join(", "));
  eleventyConfig.addFilter("allergenAttr", (a) => (a == null ? "unknown" : a.length ? a.join(" ") : "none"));
  eleventyConfig.addFilter("json", (v) => JSON.stringify(v));

  // Données du calendrier : événements datés (date) ou hebdomadaires (weekly: mon…sun)
  const ymd = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : d ? String(d) : null);
  const eventIcons = JSON.parse(readFileSync("src/_data/eventIcons.json", "utf8"));
  const eventIconSvg = (name) => (eventIcons[name] && name !== "_info" ? eventIcons[name] : null);
  eleventyConfig.addFilter("eventIcon", (name) => {
    const svg = eventIconSvg(name);
    return svg ? new nunjucks.runtime.SafeString(`<svg class="ic" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${svg}</svg>`) : "";
  });
  const eventReviews = (word, slugs, restaurants, reviews) => {
    if (!word) return [];
    const list = restaurants
      .filter((r) => slugs.includes(r.slug))
      .flatMap((r) => (reviews?.places?.[r.placeId]?.reviews || []).map((rv) => ({ ...rv, label: r.city })))
      .filter((rv) => rv.rating >= 4 && plain(rv.text).includes(plain(word)));
    return shuffle(list).slice(0, 4).map((rv) => ({ rating: rv.rating, author: rv.author, label: rv.label, text: excerpt(rv.text, 110) }));
  };
  eleventyConfig.addFilter("calendarData", (events, restaurants, reviews) => {
    const all = restaurants.map((r) => r.slug);
    const bi = (d, k) => (d[k] ? { fr: d[k], en: d[k + "_en"] || d[k] } : null);
    const list = (events || []).map(({ data: d }) => ({
      name: bi(d, "name"),
      short: bi(d, "short"),
      icon: eventIconSvg(d.icon),
      desc: bi(d, "description"),
      time: bi(d, "time"),
      date: ymd(d.date),
      weekly: d.weekly || null,
      from: ymd(d.from),
      until: ymd(d.until),
      restaurants: !d.etablissements || d.etablissements.includes("tous") ? all : d.etablissements,
    }));
    list.forEach((e, i) => (e.reviews = eventReviews(events[i].data.avis, e.restaurants, restaurants, reviews)));
    return JSON.stringify({
      restaurants: restaurants.map(({ slug, city, color, phone, phoneIntl }) => ({ slug, city, color, phone, phoneIntl })),
      events: list.filter((e) => e.date || e.weekly),
    }).replace(/</g, "\\u003c");
  });
  // Événements sans date ni jour fixe (ex. concerts annoncés sur les réseaux)
  eleventyConfig.addFilter("undatedEvents", (events, restaurants, only) =>
    (events || [])
      .filter((e) => !e.data.date && !e.data.weekly)
      .map(({ data: d }) => ({
        name: { fr: d.name, en: d.name_en || d.name },
        recurring: { fr: d.recurring || "", en: d.recurring_en || d.recurring || "" },
        icon: d.icon || null,
        restaurants: restaurants.filter((r) => (!only || r.slug === only) && (!d.etablissements || d.etablissements.includes("tous") || d.etablissements.includes(r.slug))),
      }))
      .filter((e) => e.restaurants.length)
  );
  eleventyConfig.addFilter("takeawayData", (restaurants) =>
    JSON.stringify(restaurants.map(({ slug, city, phone, phoneIntl }) => ({ slug, city, phone, phoneIntl }))).replace(/</g, "\\u003c")
  );
  // « Disponible seulement à Lagny-le-Sec et Saint-Maximin » / « Dans nos 3 restaurants »
  const availability = (slugs, restaurants) => {
    if (!slugs || !slugs.length || slugs.includes("tous") || slugs.length >= restaurants.length)
      return { fr: "Dans nos 3 restaurants", en: "In all 3 restaurants", all: true };
    const cities = restaurants.filter((r) => slugs.includes(r.slug)).map((r) => r.city);
    const list = (and) => (cities.length > 1 ? cities.slice(0, -1).join(", ") + ` ${and} ` + cities.at(-1) : cities[0]);
    return { fr: `Disponible seulement à ${list("et")}`, en: `Only available in ${list("and")}` };
  };
  // Spéciales d'un type (salee / sucree / cocktail), au format d'un plat de la carte
  eleventyConfig.addFilter("specialsOfType", (specials, type, restaurants = []) =>
    (specials || [])
      .filter((s) => s.data.type === type)
      .map((s) => {
        const r = s.data.etablissements;
        return {
          name: s.data.name,
          price: s.data.price,
          desc: { fr: s.data.description, en: s.data.description_en || s.data.description },
          tags: s.data.tags || [],
          allergens: null,
          image: s.data.image || null,
          restos: !r || !r.length || r.includes("tous") ? "tous" : r.join(" "),
          availability: availability(r, restaurants),
        };
      })
  );

  const toDate = (d) => (d instanceof Date ? d : new Date(d));
  eleventyConfig.addFilter("dateIso", (d) => toDate(d).toISOString().slice(0, 10));
  eleventyConfig.addFilter("dateShort", (d, lang) =>
    toDate(d).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Paris" })
  );

  // « Mardi – Samedi · 12h–14h / 19h–22h » à partir des horaires (jours consécutifs identiques regroupés)
  const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const DAY_NAMES = {
    fr: { mon: "lundi", tue: "mardi", wed: "mercredi", thu: "jeudi", fri: "vendredi", sat: "samedi", sun: "dimanche" },
    en: { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" },
  };
  const fmtTime = (t, lang) => (lang === "en" ? t : t.replace(":00", "h").replace(":", "h"));
  eleventyConfig.addFilter("hoursSummary", (hours, lang) => {
    const groups = [];
    for (const d of DAY_ORDER) {
      const key = JSON.stringify(hours[d] || []);
      const last = groups.at(-1);
      if (last && last.key === key) last.days.push(d);
      else groups.push({ key, days: [d], slots: hours[d] || [] });
    }
    const names = DAY_NAMES[lang] || DAY_NAMES.fr;
    return groups
      .filter((g) => g.slots.length)
      .map((g) => {
        const days = g.days.length > 1 ? `${names[g.days[0]]}–${names[g.days.at(-1)]}` : names[g.days[0]];
        const slots = g.slots.map(([a, b]) => `${fmtTime(a, lang)}–${fmtTime(b, lang)}`).join(" / ");
        return `${days.charAt(0).toUpperCase() + days.slice(1)} · ${slots}`;
      })
      .join(" · ");
  });

  eleventyConfig.addGlobalData("year", () => new Date().getFullYear());

  // Fiches « Restaurant » lisibles par Google (schema.org)
  const DAYS = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
  eleventyConfig.addFilter("restaurantsLd", (restaurants, site, lang) => {
    const route = (key, slug) => site.url + site.routes[key][lang].replace(":slug", slug || "");
    const ld = restaurants.map((r) => ({
      "@context": "https://schema.org",
      "@type": "Restaurant",
      name: `${r.name} – ${r.city}`,
      servesCuisine: ["Crêperie", "Bretonne"],
      priceRange: "€€",
      telephone: r.phoneIntl,
      url: route("restaurant", r.slug),
      hasMenu: route("menu"),
      acceptsReservations: true,
      image: `${site.url}/assets/img/galette-sarasin.jpg`,
      address: { "@type": "PostalAddress", streetAddress: r.street, postalCode: r.postalCode, addressLocality: r.city, addressCountry: "FR" },
      sameAs: [r.facebook, r.instagram],
      openingHoursSpecification: Object.entries(r.hours).flatMap(([d, slots]) =>
        slots.map(([opens, closes]) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: DAYS[d], opens, closes }))
      ),
    }));
    return JSON.stringify(ld).replace(/</g, "\\u003c");
  });

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    pathPrefix: process.env.PATH_PREFIX || "/",
    templateFormats: ["njk", "md"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
