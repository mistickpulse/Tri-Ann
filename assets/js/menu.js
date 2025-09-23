document.addEventListener("DOMContentLoaded", function () {
  var grid = document.querySelector(".isotope-container");
  if (!grid) return;

  // imagesLoaded en vanilla (si tu n’as pas jQuery)
  imagesLoaded(grid, function () {
    new Isotope(grid, {
      itemSelector: ".menu-item",
      percentPosition: true,
      masonry: { columnWidth: ".grid-sizer", gutter: 0 }
    });
  });
});
