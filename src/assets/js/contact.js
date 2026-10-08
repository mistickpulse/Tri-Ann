// Formulaire de contact via EmailJS.
// Un seul modèle EmailJS pour les trois restaurants : le restaurant choisi est envoyé dans
// « restaurant_label » et l'équipe transfère en interne. L'adresse de destination est réglée
// dans le tableau de bord EmailJS : aucune adresse e-mail n'apparaît dans le code du site.
const form = document.querySelector("[data-contact-form]");
if (form) {
  const status = form.querySelector("[data-status-msg]");
  const button = form.querySelector('[type="submit"]');
  const templateId = form.dataset.template;
  window.emailjs?.init({ publicKey: form.dataset.publicKey });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form.website.value) return; // robot
    const select = form.restaurant;
    form.restaurant_label.value = select.selectedOptions[0]?.dataset.label || "";

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
    }
  });
}
