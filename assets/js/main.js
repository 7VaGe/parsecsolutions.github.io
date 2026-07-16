/* =============================================================
   main.js
   Interazioni di pagina:
   - Reveal on scroll (IntersectionObserver)
   - Attivo indipendentemente dall'iniezione di header/footer
   ============================================================= */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {

    var revealEls = document.querySelectorAll(".reveal");

    // Fallback: se IntersectionObserver non è supportato, mostra tutto
    if (!("IntersectionObserver" in window)) {
      revealEls.forEach(function (el) { el.classList.add("visible"); });
      return;
    }

    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          obs.unobserve(entry.target); // anima una sola volta
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: "0px 0px -8% 0px"
    });

    revealEls.forEach(function (el) { observer.observe(el); });

    /* ---- Tilt 3D leggero sulle card (coerente col carosello) ---- */
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      document.querySelectorAll(".card").forEach(function (card) {
        // Escludi i form e le card con campi interattivi
        if (card.tagName === "FORM" || card.querySelector("input, textarea, select")) return;
        card.classList.add("tiltable");
        card.addEventListener("pointermove", function (e) {
          var r = card.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;
          var py = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform = "perspective(800px) rotateX(" + (-py * 5).toFixed(2) +
                                 "deg) rotateY(" + (px * 5).toFixed(2) + "deg) translateY(-6px)";
        });
        card.addEventListener("pointerleave", function () { card.style.transform = ""; });
      });
    }

    /* ---- ZOOM-IN: card che cresce fino a riempire la section (scroll-scale invertito) ---- */
    var zoomScene = document.querySelector(".scale-scene--in");
    var zoomCard  = zoomScene ? zoomScene.querySelector(".scale-card") : null;
    if (zoomCard) {
      var sceneProg = function (el) {
        var rect = el.getBoundingClientRect();
        var total = el.offsetHeight - window.innerHeight;
        if (total <= 0) return 0;
        return Math.min(1, Math.max(0, -rect.top / total));
      };
      if (reduce) {
        zoomCard.style.transform = "scale(1)";
        zoomCard.style.borderRadius = "0px";
        zoomCard.classList.add("framed");
      } else {
        var curZoom = 0;
        var zoomLoop = function () {
          requestAnimationFrame(zoomLoop);
          var pz = sceneProg(zoomScene);
          curZoom += (pz - curZoom) * 0.08;
          var sz = 0.7 + curZoom * 0.30;                 // 0.70 -> 1.0
          zoomCard.style.transform = "scale(" + sz.toFixed(3) + ")";
          zoomCard.style.borderRadius = Math.round((1 - curZoom) * 40) + "px";
          zoomCard.classList.toggle("framed", curZoom > 0.12);
        };
        zoomLoop();
      }
    }

    /* ---- File input personalizzato: mostra il nome del file scelto ---- */
    document.querySelectorAll(".file-input__native").forEach(function (inp) {
      var box = inp.closest(".file-input");
      var nameEl = box ? box.querySelector(".file-input__name") : null;
      if (!nameEl) return;
      inp.addEventListener("change", function () {
        nameEl.textContent = (inp.files && inp.files.length) ? inp.files[0].name : "Nessun file selezionato";
      });
    });
  });
})();
