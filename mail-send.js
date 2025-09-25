// 1) Init EmailJS
(function () {
  emailjs.init("rSyNef6BemMVhqFTu"); // ex: "p8aBcD123ABC"
})();

// 2) Table de routage établissement -> email destinataire
const ROUTING = {
  triann_moussy: {
    label: "Tri-Ann (Moussy Le Neuf)",
    email: "astridlemaux@hotmail.fr"
  },
  triann_lagny: {
    label: "Tri-Ann (Lagny-Le-Sec)",
    email: "triann2.pro@gmail.com"
  },
  triann_saintmax: {
    label: "Tri-Ann (Saint-Maximin)",
    email: "triann3.pro@gmail.com"
  }
};

// 3) Envoi
const form = document.getElementById("contact-form");
const loadingEl = form.querySelector(".loading");
const errorEl = form.querySelector(".error-message");
const sentEl = form.querySelector(".sent-message");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.style.display = "none";
  sentEl.style.display = "none";
  loadingEl.style.display = "block";

  try {
    const etabKey = document.getElementById("etablissement").value;
    const route = ROUTING[etabKey];
    console.log("1");
    if (!route) throw new Error("Établissement invalide.");

    // Injecte le destinataire dans le champ caché
    console.log("2");
    document.getElementById("to_email").value = route.email;

    // Envoi
    const SERVICE_ID = "service_yyznncj"; // ex: "service_abc123"
    const TEMPLATE_ID = "template_onjp74t"; // ex: "template_xyz789"

    await emailjs.sendForm(SERVICE_ID, TEMPLATE_ID, form);

    console.log("3");
    loadingEl.style.display = "none";
    sentEl.style.display = "block";
    //form.reset();
    console.log("REUSSI SEND");
  } catch (err) {
    console.log("BAD SEND");
    loadingEl.style.display = "none";
    errorEl.textContent =
      "Erreur d’envoi : " + (err?.text || err?.message || "inconnue");
    errorEl.style.display = "block";
  }
});
