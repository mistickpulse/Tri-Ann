// Calendrier des événements des 3 restaurants.
// Les événements ponctuels ont une date ; les événements réguliers un jour de la semaine (weekly: thu).
// Tout est calculé dans le navigateur à partir d'aujourd'hui : le calendrier ne vieillit pas entre deux mises en ligne.
(() => {
  const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const svg = (paths, size = 22) => (paths ? `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>` : "");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const GOOGLE = '<svg class="google-logo" width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>';
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const parisToday = () => {
    const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date()).split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  document.querySelectorAll("[data-calendar]").forEach((root) => {
    const lang = root.dataset.lang || "fr";
    const locale = lang === "en" ? "en-GB" : "fr-FR";
    const data = JSON.parse(root.querySelector("[data-calendar-data]").textContent);
    const restos = Object.fromEntries(data.restaurants.map((r) => [r.slug, r]));
    const t = (o) => (o ? o[lang] || o.fr : "");
    const today = parisToday();
    let month = new Date(today.getFullYear(), today.getMonth(), 1);
    let filter = root.dataset.only || "";
    let selected = null;

    const grid = root.querySelector("[data-cal-grid]");
    const title = root.querySelector("[data-cal-title]");
    const detail = root.querySelector("[data-cal-detail]");
    const upcoming = root.querySelector("[data-cal-upcoming]");
    const sideTitle = root.querySelector("[data-cal-side-title]");

    // Occurrences d'un jour donné (filtrées par restaurant)
    function eventsOn(date) {
      const key = iso(date);
      const day = DAY_KEYS[date.getDay()];
      return data.events
        .filter((e) => (e.date ? e.date === key : e.weekly === day))
        .filter((e) => (!e.from || key >= e.from) && (!e.until || key <= e.until))
        .map((e) => ({ ...e, restaurants: filter ? e.restaurants.filter((r) => r === filter) : e.restaurants }))
        .filter((e) => e.restaurants.length);
    }

    const dots = (slugs) => slugs.map((s) => `<span class="cal-dot" style="--c:${restos[s].color}" title="${esc(restos[s].city)}"></span>`).join("");
    const where = (slugs) => slugs.map((s) => `<span class="cal-tag" style="--c:${restos[s].color}">${esc(restos[s].city)}</span>`).join("");
    // Réservation par téléphone : un bouton par restaurant où a lieu l'événement
    // Bloc refermable (croix) ; il réapparaît à chaque nouveau clic sur un événement, car le détail est redessiné
    const book = (slugs) => `<div class="cal-book">
      <div class="cal-book-head">
        <p class="cal-book-title">${esc(root.dataset.bookTitle)}</p>
        <button type="button" class="cal-book-close" data-book-close aria-label="${esc(root.dataset.bookClose)}">&times;</button>
      </div>
      ${slugs.map((s) => `<a class="cal-book-row" href="tel:${restos[s].phoneIntl}" aria-label="${esc(root.dataset.bookLabel)} ${esc(restos[s].city)} : ${esc(restos[s].phone)}">
        <span class="cal-book-city"><span class="cal-dot" style="--c:${restos[s].color}"></span>${esc(restos[s].city)}</span>
        <span class="cal-book-phone"><svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>${esc(restos[s].phone)}</span></a>`).join("")}
      <p class="muted small">${esc(root.dataset.bookNote)}</p>
    </div>`;
    const longDate = (d) => cap(d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" }));

    function renderGrid() {
      title.textContent = cap(month.toLocaleDateString(locale, { month: "long", year: "numeric" }));
      const first = new Date(month);
      const offset = (first.getDay() + 6) % 7; // semaine commençant le lundi
      const cells = [];
      for (let i = 0; i < offset; i++) cells.push(`<div class="cal-cell is-empty" aria-hidden="true"></div>`);
      const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
      for (let n = 1; n <= days; n++) {
        const d = new Date(month.getFullYear(), month.getMonth(), n);
        const evs = eventsOn(d);
        const past = d < today;
        const cls = ["cal-cell", past && "is-past", iso(d) === iso(today) && "is-today", evs.length && "has-events", selected && iso(d) === iso(selected) && "is-selected"].filter(Boolean).join(" ");
        const pills = evs.map((e) => `<span class="cal-pill">${dots(e.restaurants)}<span class="cal-pill-name">${esc(t(e.short) || t(e.name))}</span></span>`).join("");
        const label = `${longDate(d)}${evs.length ? " : " + evs.map((e) => t(e.name)).join(", ") : ""}`;
        cells.push(evs.length
          ? `<button type="button" class="${cls}" data-day="${iso(d)}" aria-label="${esc(label)}"><span class="cal-num">${n}</span>${pills}</button>`
          : `<div class="${cls}"><span class="cal-num">${n}</span></div>`);
      }
      grid.innerHTML = cells.join("");
      // Pas de retour avant le mois en cours
      root.querySelector("[data-cal-prev]").disabled = month <= new Date(today.getFullYear(), today.getMonth(), 1);
    }

    // Avis Google qui parlent de l'événement (ex. karaoké), pour les restaurants affichés
    function reviews(e) {
      const list = (e.reviews || []).filter((rv) => !filter || rv.label === restos[filter]?.city);
      if (!list.length) return "";
      return `<div class="cal-reviews">
        <p class="small muted">${lang === "en" ? "What our guests say" : "Ils en parlent"}</p>
        <div class="quotes">${list.map((rv) => `
          <article class="quote">
            <div class="quote-head"><span class="stars" aria-label="${rv.rating}/5">${"★".repeat(rv.rating).padEnd(5, "☆")}</span><span class="google-tag">${GOOGLE} ${lang === "en" ? "Google review" : "Avis Google"}</span></div>
            <p>${esc(rv.text)}</p>
            <footer class="quote-author">
              ${rv.photo ? `<img class="avatar" src="${esc(rv.photo)}" alt="" width="40" height="40" loading="lazy" referrerpolicy="no-referrer">` : `<span class="avatar" aria-hidden="true">${esc(rv.author.charAt(0).toUpperCase())}</span>`}
              <span><b>${esc(rv.author)}</b><br>${esc(rv.label)}${rv.date ? " · " + esc(new Date(rv.date).toLocaleDateString(locale, { month: "long", year: "numeric" })) : ""}</span>
            </footer>
          </article>`).join("")}</div>
      </div>`;
    }

    function renderDetail() {
      if (!selected) { detail.hidden = true; return; }
      const evs = eventsOn(selected);
      detail.hidden = false;
      detail.innerHTML = `<h3>${esc(longDate(selected))}</h3>` + evs.map((e) => `
        <article class="cal-event">
          <h4>${e.icon ? `<span class="ev-ic">${svg(e.icon, 18)}</span>` : ""}${esc(t(e.name))}${e.time ? ` <span class="muted">· ${esc(t(e.time))}</span>` : ""}</h4>
          ${e.desc ? `<p class="muted">${esc(t(e.desc))}</p>` : ""}
          <p class="cal-where">${where(e.restaurants)}</p>
          ${selected >= today ? book(e.restaurants) : ""}
          ${reviews(e)}
        </article>`).join("");
    }

    // Liste de droite : uniquement les événements du mois affiché (à partir d'aujourd'hui pour le mois en cours)
    function renderUpcoming() {
      const items = [];
      const last = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
      for (let n = 1; n <= last; n++) {
        const d = new Date(month.getFullYear(), month.getMonth(), n);
        if (d < today) continue;
        eventsOn(d).forEach((e) => items.push({ d, e }));
      }
      const isCurrent = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();
      sideTitle.textContent = isCurrent ? root.dataset.titleCurrent : root.dataset.titleMonth.replace("{m}", month.toLocaleDateString(locale, { month: "long" }));
      upcoming.innerHTML = items.length
        ? items.map(({ d, e }) => `<li>
            <button type="button" class="up-item" data-goto="${iso(d)}">
              <span class="up-date"><b>${d.getDate()}</b><small>${esc(d.toLocaleDateString(locale, { month: "short" }))}</small></span>
              <span class="up-body"><b>${esc(t(e.name))}</b><small class="muted">${esc(cap(d.toLocaleDateString(locale, { weekday: "long" })))}${e.time ? " · " + esc(t(e.time)) : ""}</small><span class="cal-where">${where(e.restaurants)}</span></span>
              ${e.icon ? `<span class="up-ic">${svg(e.icon)}</span>` : ""}
            </button></li>`).join("")
        : `<li class="muted">${esc(root.dataset.empty)}</li>`;
    }

    function render() { renderGrid(); renderDetail(); renderUpcoming(); }

    detail.addEventListener("click", (e) => {
      if (e.target.closest("[data-book-close]")) e.target.closest(".cal-book").remove();
    });
    grid.addEventListener("click", (e) => {
      const b = e.target.closest("[data-day]");
      if (!b) return;
      const [y, m, d] = b.dataset.day.split("-").map(Number);
      selected = new Date(y, m - 1, d);
      renderGrid(); renderDetail();
    });
    upcoming.addEventListener("click", (e) => {
      const b = e.target.closest("[data-goto]");
      if (!b) return;
      const [y, m, d] = b.dataset.goto.split("-").map(Number);
      selected = new Date(y, m - 1, d);
      renderGrid(); renderDetail();
      detail.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    root.querySelector("[data-cal-prev]").addEventListener("click", () => { month = new Date(month.getFullYear(), month.getMonth() - 1, 1); renderGrid(); renderUpcoming(); });
    root.querySelector("[data-cal-next]").addEventListener("click", () => { month = new Date(month.getFullYear(), month.getMonth() + 1, 1); renderGrid(); renderUpcoming(); });
    root.querySelectorAll("[data-cal-filter]").forEach((b) =>
      b.addEventListener("click", () => {
        filter = b.dataset.calFilter;
        root.querySelectorAll("[data-cal-filter]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        if (selected && !eventsOn(selected).length) selected = null;
        render();
      })
    );

    // Par défaut : le prochain jour avec un événement est sélectionné
    for (let i = 0; i < 60 && !selected; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      if (eventsOn(d).length) selected = d;
    }
    if (selected && selected.getMonth() !== month.getMonth()) month = new Date(selected.getFullYear(), selected.getMonth(), 1);
    root.classList.add("is-ready");
    render();
  });
})();
