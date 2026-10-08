// Prix habituel des spéciales selon leur type : pas besoin de l'écrire dans chaque fiche.
// Une fiche peut garder sa propre ligne « price: » si le prix est différent.
const DEFAULT_PRICES = { salee: 15.9, sucree: 11.9, cocktail: 9.9 };

export default {
  eleventyComputed: {
    price: (data) => data.price || DEFAULT_PRICES[data.type] || null,
  },
};
