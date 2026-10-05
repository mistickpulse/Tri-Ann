// Calendrier des événements des 3 restaurants.
// Les événements ponctuels ont une date ; les événements réguliers un jour de la semaine (weekly: thu).
// Tout est calculé dans le navigateur à partir d'aujourd'hui : le calendrier ne vieillit pas entre deux mises en ligne.
(() => {
  const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
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

    function renderDetail() {
      if (!selected) { detail.hidden = true; return; }
      const evs = eventsOn(selected);
      detail.hidden = false;
      detail.innerHTML = `<h3>${esc(longDate(selected))}</h3>` + evs.map((e) => `
        <article class="cal-event">
          <h4>${esc(t(e.name))}${e.time ? ` <span class="muted">· ${esc(t(e.time))}</span>` : ""}</h4>
          ${e.desc ? `<p class="muted">${esc(t(e.desc))}</p>` : ""}
          <p class="cal-where">${where(e.restaurants)}</p>
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
            </button></li>`).join("")
        : `<li class="muted">${esc(root.dataset.empty)}</li>`;
    }

    function render() { renderGrid(); renderDetail(); renderUpcoming(); }

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
