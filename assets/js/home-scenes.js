/* =============================================================
   home-scenes.js  (solo home)
   Due scene "getlayers-style", raccordate allo scroll cinematico:
   1) SCROLL-SCALE: una card parte a tutto schermo e si riduce/arrotonda
      man mano che si scorre (sezione pinnata).
   2) CAROSELLO 3D: anello di card che ruotano (auto-rotate + drag).
   ============================================================= */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. SCROLL-SCALE ---------- */
  var scaleScene = document.querySelector(".scale-scene");
  var scaleCard  = document.querySelector(".scale-card");

  function sceneProgress(el) {
    var rect = el.getBoundingClientRect();
    var total = el.offsetHeight - window.innerHeight;
    if (total <= 0) return 0;
    return Math.min(1, Math.max(0, -rect.top / total));
  }

  /* ---------- 2. CAROSELLO 3D ---------- */
  var ring = document.getElementById("ring");
  var radius = 0, rot = 0, vel = 0, dragging = false, lastX = 0;
  var downX = 0, downY = 0, moved = false;   // soglia drag vs click

  if (ring) {
    var cards = ring.querySelectorAll(".ring-card");
    var N = cards.length;
    var angle = 360 / N;
    var cw = ring.offsetWidth || 300;
    radius = Math.round((cw / 2) / Math.tan(Math.PI / N)) + 30;
    for (var i = 0; i < N; i++) {
      cards[i].style.transform = "rotateY(" + (i * angle) + "deg) translateZ(" + radius + "px)";
    }
    // Drag per far girare l'anello
    var captured = false, capId = null;
    ring.addEventListener("pointerdown", function (e) {
      dragging = true; lastX = e.clientX; vel = 0;
      downX = e.clientX; downY = e.clientY; moved = false;
      captured = false; capId = e.pointerId;
      // NB: non catturiamo subito il puntatore, altrimenti un clic su foto/CTA
      // verrebbe intercettato dall'anello e il link non naviga.
    });
    window.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastX; lastX = e.clientX;
      rot += dx * 0.35; vel = dx * 0.35;
      // supera la soglia => è un trascinamento, non un clic
      if (Math.abs(e.clientX - downX) > 6 || Math.abs(e.clientY - downY) > 6) {
        moved = true;
        if (!captured) { try { ring.setPointerCapture(capId); captured = true; } catch (err) {} }
      }
    });
    window.addEventListener("pointerup", function () {
      dragging = false;
      if (captured) { try { ring.releasePointerCapture(capId); } catch (err) {} captured = false; }
    });

    // Se l'utente ha trascinato, il clic su foto/CTA non deve navigare
    ring.addEventListener("click", function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    // Rotazione legata allo scroll (oltre a auto-rotate e drag)
    var lastScrollY = window.scrollY;
    window.addEventListener("scroll", function () {
      var y = window.scrollY;
      rot += (y - lastScrollY) * 0.06;
      lastScrollY = y;
    }, { passive: true });

    ring.style.transform = "translateZ(-" + radius + "px) rotateY(0deg)";
  }

  /* ---------- Loop condiviso ---------- */
  var curScale = 0;
  function frame() {
    requestAnimationFrame(frame);

    if (scaleCard) {
      var p = sceneProgress(scaleScene);
      curScale += (p - curScale) * 0.08;                 // smoothing inerziale
      var s = 1 - curScale * 0.30;                        // 1.0 -> 0.70
      scaleCard.style.transform = "scale(" + s.toFixed(3) + ")";
      scaleCard.style.borderRadius = Math.round(curScale * 40) + "px";
      scaleCard.classList.toggle("framed", curScale > 0.12);
    }

    if (ring) {
      if (!dragging) { vel *= 0.95; rot += vel + 0.12; } // idle: rotazione lenta + inerzia
      ring.style.transform = "translateZ(-" + radius + "px) rotateY(" + rot + "deg)";
    }
  }

  if (reduce) {
    if (scaleCard) { scaleCard.style.transform = "scale(0.78)"; scaleCard.style.borderRadius = "32px"; scaleCard.classList.add("framed"); }
    if (ring) ring.style.transform = "translateZ(-" + radius + "px) rotateY(-18deg)";
  } else {
    frame();
  }
})();
