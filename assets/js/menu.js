// window.addEventListener("load", function () {
//   var grid = document.querySelector("#menu-grid");
//   console.log(grid);
//   if (!grid) return;

//   imagesLoaded(grid, function () {
//     var iso = new Isotope(grid, {
//       itemSelector: ".menu-item",
//       percentPosition: true,
//       masonry: { columnWidth: ".grid-sizer", gutter: 0 }
//     });

//     iso.arrange({ filter: ".filter-starters" });
//     iso.layout();
//   });
// });

document.addEventListener("DOMContentLoaded", function () {
  var grid =
    document.querySelector("#menu-grid") ||
    document.querySelector(".isotope-container");
  if (!grid) return;

  imagesLoaded(grid, function () {
    // si le grid-sizer a une largeur mesurable, on l'utilise, sinon fallback sur .menu-item
    var sizer = grid.querySelector(".grid-sizer");
    var useSizer = sizer && sizer.getBoundingClientRect().width > 0;
    var iso =
      Isotope.data(grid) ||
      new Isotope(grid, {
        itemSelector: ".menu-item",
        percentPosition: true,
        masonry: {
          columnWidth: useSizer ? ".grid-sizer" : ".menu-item",
          gutter: 0
        }
      });

    // filtre initial (adapte si besoin)
    iso.arrange({ filter: ".filter-galettes" });

    // forcer le premier rendu
    iso.layout();
    requestAnimationFrame(function () {
      iso.layout();
    });

    // pendant que les images se chargent, on relayout au fil de l'eau
    imagesLoaded(grid).on("end", function () {
      iso.layout();
    });
  });
});
