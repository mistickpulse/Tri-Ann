// Formulaire de contact via EmailJS.
// Un seul modèle EmailJS pour les trois restaurants : le restaurant choisi est envoyé dans
// « restaurant_label » et l'équipe transfère en interne. L'adresse de destination est réglée
// dans le tableau de bord EmailJS : aucune adresse e-mail n'apparaît dans le code du site.
// Le formulaire ne sert pas à réserver : l'objet est choisi dans une liste, « Réserver une table »
// bloque l'envoi (réservation par téléphone), une réservation de groupe exige 15 personnes ou plus,
// et les autres demandes passent par une fenêtre de confirmation. L'objet choisi (avec le nombre
// de personnes et la date pour un groupe) est envoyé dans « subject » et en tête du message :
// le modèle EmailJS reste inchangé.
const MIN_GROUP = 15;
const form = document.querySelector("[data-contact-form]");
if (form) {
  const status = form.querySelector("[data-status-msg]");
  const button = form.querySelector('[type="submit"]');
  const groupFields = form.querySelector("[data-group-fields]");
  const tooSmall = form.querySelector("[data-group-too-small]");
  const bookingPhone = form.querySelector("[data-booking-phone]");
  const confirmDialog = document.querySelector("[data-contact-confirm]");
  const templateId = form.dataset.template;
  window.emailjs?.init({ publicKey: form.dataset.publicKey });

  const isGroup = () => form.request_type.value === "groupe";
  const isBooking = () => form.request_type.value === "reservation";

  const checkGuests = () => {
    const n = Number(form.guests.value);
    const small = isGroup() && form.guests.value !== "" && n < MIN_GROUP;
    tooSmall.hidden = !small;
    form.guests.setCustomValidity(small ? form.dataset.msgTooSmall : "");
    button.disabled = small || isBooking();
  };

  const syncType = () => {
    const group = isGroup();
    groupFields.hidden = !group;
    bookingPhone.hidden = !isBooking();
    for (const f of [form.guests, form.date]) {
      f.disabled = !group;
      f.required = group;
    }
    checkGuests();
  };

  form.date.min = new Date().toISOString().slice(0, 10);
  form.request_type.addEventListener("change", syncType);
  form.guests.addEventListener("input", checkGuests);
  syncType();

  const askConfirm = () => new Promise((resolve) => {
    if (!confirmDialog) return resolve(true);
    confirmDialog.returnValue = "";
    confirmDialog.addEventListener("close", () => resolve(confirmDialog.returnValue === "send"), { once: true });
    confirmDialog.showModal();
  });

  const buildParams = () => {
    const params = Object.fromEntries(new FormData(form));
    const typeLabel = form.request_type.selectedOptions[0]?.textContent.trim() || "";
    let head = typeLabel;
    if (isGroup()) {
      const date = new Date(`${form.date.value}T12:00`).toLocaleDateString(document.documentElement.lang || "fr");
      head = `${typeLabel} · ${form.guests.value} ${form.dataset.guestsLabel} · ${date}`;
    }
    params.request_label = head;
    params.subject = head;
    params.message = `${head}\n\n${params.message}`;
    return params;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form.website.value) return; // robot
    if (isBooking()) return;
    if (isGroup() && Number(form.guests.value) < MIN_GROUP) { checkGuests(); return; }
    if (!isGroup() && !(await askConfirm())) return;
    const select = form.restaurant;
    form.restaurant_label.value = select.selectedOptions[0]?.dataset.label || "";

    status.className = "form-status";
    status.textContent = form.dataset.msgSending;
    button.disabled = true;
    try {
      if (!window.emailjs || !templateId || templateId === "A_CREER") throw new Error("EmailJS non configuré");
      await window.emailjs.send(form.dataset.service, templateId, buildParams());
      status.classList.add("is-ok");
      status.textContent = form.dataset.msgSent;
      form.reset();
      syncType();
    } catch (err) {
      console.error(err);
      status.classList.add("is-error");
      status.textContent = form.dataset.msgError;
    } finally {
      button.disabled = false;
    }
  });
}
