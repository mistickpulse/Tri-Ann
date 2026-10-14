// Formulaire de contact via EmailJS.
// Un seul modèle EmailJS pour les trois restaurants : le restaurant choisi est envoyé dans
// « restaurant_label » et l'équipe transfère en interne. L'adresse de destination est réglée
// dans le tableau de bord EmailJS : aucune adresse e-mail n'apparaît dans le code du site.
// Objet « Menu de groupe » : nombre de personnes obligatoire, et pas d'envoi en dessous de
// GROUP_MIN (on invite à appeler le restaurant).
const GROUP_MIN = 15;
const form = document.querySelector("[data-contact-form]");
if (form) {
  const status = form.querySelector("[data-status-msg]");
  const button = form.querySelector('[type="submit"]');
  const guestsField = form.querySelector("[data-guests]");
  const warning = form.querySelector("[data-group-warning]");
  const templateId = form.dataset.template;
  window.emailjs?.init({ publicKey: form.dataset.publicKey });

  // Le menu natif du navigateur affiche les 41 choix sur toute la hauteur de l'écran :
  // sur ordinateur, on le remplace par une petite liste qui défile (sur téléphone, la roue
  // native est déjà compacte). Le vrai <select> reste dans le formulaire pour l'envoi.
  const syncGuests = compactSelect(form.guests);

  const isGroup = () => "group" in (form.subject_type.selectedOptions[0]?.dataset || {});
  const guests = () => parseInt(form.guests.value, 10); // NaN pour « Plus de 40 »
  const tooSmall = () => isGroup() && guests() > 0 && guests() < GROUP_MIN;

  function update() {
    const group = isGroup();
    guestsField.hidden = !group;
    form.guests.disabled = !group;
    form.guests.required = group;
    const blocked = tooSmall();
    warning.hidden = !blocked;
    button.disabled = blocked;
    syncGuests();
    // Numéro du restaurant choisi seulement (les trois si aucun n'est choisi)
    const slug = form.restaurant.value;
    warning.querySelectorAll("[data-slug]").forEach((li) => { li.hidden = !!slug && li.dataset.slug !== slug; });
  }
  form.addEventListener("input", update);
  form.addEventListener("change", update);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form.website.value) return; // robot
    if (tooSmall()) { update(); return; }
    const select = form.restaurant;
    form.restaurant_label.value = select.selectedOptions[0]?.dataset.label || "";
    form.subject.value = form.subject_type.value + (isGroup() ? ` – ${form.guests.value} personnes` : "");

    status.className = "form-status";
    status.textContent = form.dataset.msgSending;
    button.disabled = true;
    try {
      if (!window.emailjs || !templateId || templateId === "A_CREER") throw new Error("EmailJS non configuré");
      await window.emailjs.sendForm(form.dataset.service, templateId, form);
      status.classList.add("is-ok");
      status.textContent = form.dataset.msgSent;
      form.reset();
    } catch (err) {
      console.error(err);
      status.classList.add("is-error");
      status.textContent = form.dataset.msgError;
    } finally {
      button.disabled = false;
      update();
    }
  });
}

// Petite liste déroulante accessible (clavier, clic en dehors) branchée sur un <select>.
// Renvoie une fonction qui remet le bouton à jour après un changement fait par le code.
function compactSelect(select) {
  if (!matchMedia("(pointer: fine)").matches) return () => {};
  const wrap = document.createElement("div");
  wrap.className = "mini-select";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "mini-select-btn";
  btn.setAttribute("aria-haspopup", "listbox");
  btn.setAttribute("aria-expanded", "false");
  const list = document.createElement("ul");
  list.className = "mini-select-list";
  list.setAttribute("role", "listbox");
  list.hidden = true;
  const items = [...select.options].filter((o) => o.value).map((o) => {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    li.tabIndex = -1;
    li.dataset.value = o.value;
    li.textContent = o.textContent;
    return li;
  });
  list.append(...items);
  select.before(wrap);
  wrap.append(btn, select, list);
  select.tabIndex = -1;

  const sync = () => {
    btn.textContent = select.selectedOptions[0]?.textContent || "";
    btn.disabled = select.disabled;
    items.forEach((li) => li.setAttribute("aria-selected", String(li.dataset.value === select.value)));
    if (select.disabled) close(false);
  };
  const open = () => {
    list.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    const current = items.find((li) => li.dataset.value === select.value) || items[0];
    current.focus({ preventScroll: true });
    list.scrollTop = current.offsetTop - list.clientHeight / 2 + current.offsetHeight / 2;
  };
  function close(refocus = true) {
    if (list.hidden) return;
    list.hidden = true;
    btn.setAttribute("aria-expanded", "false");
    if (refocus) btn.focus();
  }
  const choose = (li) => {
    select.value = li.dataset.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    sync();
    close();
  };

  btn.addEventListener("click", () => (list.hidden ? open() : close()));
  btn.addEventListener("keydown", (e) => {
    if (["ArrowDown", "ArrowUp"].includes(e.key)) { e.preventDefault(); open(); }
  });
  // preventDefault : sinon le clic dans le <label> rouvre la liste
  list.addEventListener("click", (e) => {
    e.preventDefault();
    const li = e.target.closest("li");
    if (li) choose(li);
  });
  list.addEventListener("keydown", (e) => {
    const i = items.indexOf(document.activeElement);
    const move = { ArrowDown: 1, ArrowUp: -1, PageDown: 8, PageUp: -8 }[e.key];
    if (move) { e.preventDefault(); items[Math.max(0, Math.min(items.length - 1, i + move))].focus(); }
    else if (e.key === "Home" || e.key === "End") { e.preventDefault(); items[e.key === "Home" ? 0 : items.length - 1].focus(); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (items[i]) choose(items[i]); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "Tab") close(false);
  });
  document.addEventListener("click", (e) => { if (!wrap.contains(e.target)) close(false); });
  select.form?.addEventListener("reset", () => setTimeout(sync));
  // Champ obligatoire non rempli : le navigateur vise le <select> caché, on met le focus sur le bouton
  select.addEventListener("invalid", () => btn.focus());
  sync();
  return sync;
}
