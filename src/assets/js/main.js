// Menu mobile
const toggle = document.querySelector("[data-nav-toggle]");
const nav = document.getElementById("main-nav");
toggle?.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  toggle.setAttribute("aria-expanded", String(open));
});
nav?.addEventListener("click", (e) => {
  if (e.target.closest("a")) {
    nav.classList.remove("is-open");
    toggle?.setAttribute("aria-expanded", "false");
  }
});

// En-tête transparent au-dessus de la vidéo, opaque au défilement
const header = document.querySelector("[data-header]");
if (header?.classList.contains("is-over-hero")) {
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 40);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

// Fenêtres « Appeler » / « Y aller »
document.querySelectorAll("[data-open-dialog]").forEach((btn) => {
  btn.addEventListener("click", () => document.getElementById(btn.dataset.openDialog)?.showModal());
});
document.querySelectorAll("dialog").forEach((d) =>
  d.addEventListener("click", (e) => { if (e.target === d) d.close(); })
);

// Onglets accessibles (flèches gauche/droite)
document.querySelectorAll("[data-tabs]").forEach((list) => {
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const select = (tab) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute("aria-controls"));
      const wasHidden = panel.hidden;
      panel.hidden = !on;
      // Petite animation d'apparition quand on change de restaurant
      if (on && wasHidden) {
        panel.classList.remove("is-entering");
        void panel.offsetWidth;
        panel.classList.add("is-entering");
      }
    });
  };
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => select(t));
    t.addEventListener("keydown", (e) => {
      const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!dir) return;
      const next = tabs[(i + dir + tabs.length) % tabs.length];
      next.focus();
      select(next);
    });
  });
});

// Ouvert / fermé en ce moment (heure de Paris)
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const LABELS = {
  fr: { open: "Ouvert", closed: "Fermé", closes: "ferme à", opens: "ouvre", today: "", tomorrow: "demain", at: "à" },
  en: { open: "Open", closed: "Closed", closes: "closes at", opens: "opens", today: "", tomorrow: "tomorrow", at: "at" },
};
const DAY_NAMES = {
  fr: { mon: "lundi", tue: "mardi", wed: "mercredi", thu: "jeudi", fri: "vendredi", sat: "samedi", sun: "dimanche" },
  en: { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" },
};

function parisNow() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  return { day: get("weekday").slice(0, 3).toLowerCase(), minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}
const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const fmt = (t, lang) => (lang === "fr" ? t.replace(":00", "h").replace(":", "h") : t);

function openingStatus(hours, lang) {
  const L = LABELS[lang] || LABELS.fr;
  const now = parisNow();
  const today = hours[now.day] || [];
  const current = today.find(([a, b]) => now.minutes >= toMin(a) && now.minutes < toMin(b));
  if (current) return { open: true, text: `${L.open} · ${L.closes} ${fmt(current[1], lang)}` };
  const laterToday = today.find(([a]) => toMin(a) > now.minutes);
  if (laterToday) return { open: false, text: `${L.closed} · ${L.opens} ${L.at} ${fmt(laterToday[0], lang)}` };
  const start = DAYS.indexOf(now.day);
  for (let i = 1; i <= 7; i++) {
    const d = DAYS[(start + i) % 7];
    if (hours[d]?.length) {
      const when = i === 1 ? L.tomorrow : DAY_NAMES[lang][d];
      return { open: false, text: `${L.closed} · ${L.opens} ${when} ${L.at} ${fmt(hours[d][0][0], lang)}` };
    }
  }
  return { open: false, text: L.closed };
}

function refreshStatus() {
  document.querySelectorAll("[data-hours]").forEach((card) => {
    const el = card.querySelector("[data-status]");
    if (!el) return;
    const s = openingStatus(JSON.parse(card.dataset.hours), el.dataset.lang || "fr");
    el.textContent = s.text;
    el.classList.toggle("is-open", s.open);
    el.classList.toggle("is-closed", !s.open);
  });
}
refreshStatus();
setInterval(refreshStatus, 60_000);

// Bandeaux d'info expirés : masqués côté navigateur en attendant la prochaine mise en ligne
document.querySelectorAll(".notice[data-until]").forEach((n) => {
  const until = n.dataset.until && new Date(n.dataset.until);
  if (until && !isNaN(until) && until < new Date()) n.remove();
});
document.querySelectorAll(".notices").forEach((box) => { if (!box.children.length) box.remove(); });

// Jour courant surligné dans le tableau des horaires
const today = parisNow().day;
document.querySelectorAll(`.hours tr[data-day="${today}"]`).forEach((tr) => tr.classList.add("is-today"));

// Plan Google chargé seulement au clic (pas de cookies Google sans action du visiteur)
document.querySelectorAll("[data-load-map]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const box = btn.closest("[data-map-src]");
    const iframe = document.createElement("iframe");
    iframe.src = box.dataset.mapSrc;
    iframe.loading = "lazy";
    iframe.title = btn.textContent.trim();
    iframe.referrerPolicy = "no-referrer-when-downgrade";
    box.replaceChildren(iframe);
  });
});

// Inscription à la newsletter (Brevo)
document.querySelectorAll("[data-close-dialog]").forEach((b) => b.addEventListener("click", () => b.closest("dialog")?.close()));
document.querySelectorAll("[data-newsletter]").forEach((form) => {
  const status = form.querySelector("[data-newsletter-status]");
  form.addEventListener("submit", async (e) => {
    if (form.email_address_check.value) { e.preventDefault(); return; } // robot
    e.preventDefault();
    status.className = "form-status";
    status.textContent = form.dataset.msgSending;
    try {
      const res = await fetch(form.action + (form.action.includes("?") ? "&" : "?") + "isAjax=1", { method: "POST", body: new FormData(form) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || res.status);
      status.classList.add("is-ok");
      status.textContent = form.dataset.msgOk;
      form.reset();
    } catch (err) {
      console.error(err);
      status.classList.add("is-error");
      status.textContent = form.dataset.msgError;
    }
  });
});

// Version de relecture : un clic sur un numéro (T1, T2…) le copie
document.addEventListener("click", (e) => {
  const tag = e.target.closest("[data-rtag]");
  if (!tag) return;
  e.preventDefault();
  navigator.clipboard?.writeText(tag.dataset.rtag).then(() => {
    tag.classList.add("is-copied");
    setTimeout(() => tag.classList.remove("is-copied"), 1200);
  });
});

// Bandeau de relecture : fermé avec la croix, il reste masqué le temps de la visite
const reviewBar = document.querySelector("[data-review-bar]");
if (reviewBar) {
  try { if (sessionStorage.getItem("triann-relecture-fermee")) reviewBar.remove(); } catch { /* navigation privée */ }
  reviewBar.querySelector("[data-review-close]")?.addEventListener("click", () => {
    reviewBar.remove();
    try { sessionStorage.setItem("triann-relecture-fermee", "1"); } catch { /* navigation privée */ }
  });
}
