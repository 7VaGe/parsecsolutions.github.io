/* =============================================================
   news-engine.js
   Popola la Bento Grid delle News dai contenuti WordPress via
   WP REST API (sola lettura), con skeleton shimmer, fallback pulito,
   sanitizzazione anti-XSS, tilt 3D e "Frenata Tech" sul featured.
   Vanilla JS, nessuna libreria.
   ============================================================= */
(function () {
  "use strict";

  var CONFIG = {
    // Endpoint pubblico in sola lettura. Sostituisci con il dominio reale in produzione.
    url: "https://www.parsecsolutions.it/wp-json/wp/v2/posts?_embed&per_page=6",
    timeout: 6000
  };

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var bento;

  /* Contenuti di fallback (mostrati se le API sono vuote/irraggiungibili) */
  var FALLBACK = [
    { title: "Migrazione a SAP S/4HANA: la roadmap in 4 fasi senza fermare l'operatività",
      excerpt: "Come Parsec pianifica la transizione garantendo continuità: mappatura, sandbox, training e go-live assistito.",
      date: "2026-06-18", image: "../img/SAP-Hana.jpg", link: "#" },
    { title: "Fatturazione elettronica B2B: cosa cambia e come prepararsi",
      excerpt: "Le novità normative e l'integrazione diretta in SAP con DDM Solutions per un ciclo passivo senza attriti.",
      date: "2026-05-30", image: "../img/DocumentiEFatturazione.jpg", link: "#" },
    { title: "Gestione documentale in SAP: workflow approvativi e firma elettronica",
      excerpt: "Archiviazione dinamica del ciclo attivo e passivo, integrata nei processi aziendali.",
      date: "2026-05-12", image: "../img/Sap-Basis.jpg", link: "#" },
    { title: "Remote Administration: continuità 24/7 dei sistemi SAP",
      excerpt: "Monitoraggio proattivo e interventi reattivi per prevenire fermi e anomalie.",
      date: "2026-04-27", image: "../img/amministrazione-remota.jpg", link: "#" },
    { title: "Archiving SAP: prestazioni costanti al crescere del database",
      excerpt: "Strategie di archiviazione mirata per mantenere il sistema veloce e affidabile.",
      date: "2026-04-09", image: "../img/archiviazione.jpg", link: "#" },
    { title: "Infrastruttura e virtualizzazione: progettare per performance e scalabilità",
      excerpt: "Dall'analisi al completamento, un'infrastruttura dimensionata sul tuo business.",
      date: "2026-03-21", image: "../img/infrastruttura.jpg", link: "#" }
  ];

  /* ---------- Helper di sicurezza / formattazione ---------- */
  var MESI = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

  function decodeEntities(str) { var t = document.createElement("textarea"); t.innerHTML = String(str); return t.value; }
  function stripHtml(html) { return decodeEntities(String(html).replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim(); }
  function truncate(s, n) { s = s || ""; return s.length > n ? s.slice(0, n - 1).trim() + "…" : s; }
  function formatDateIt(iso) { var d = new Date(iso); if (isNaN(d.getTime())) return ""; return d.getDate() + " " + MESI[d.getMonth()] + " " + d.getFullYear(); }
  function cssSafe(u) { return String(u).replace(/["'()\\<>]/g, ""); }               // per url() CSS
  function safeUrl(u) {                                                              // per href
    if (!u) return "#"; u = String(u);
    return (/^https?:\/\//i.test(u) || /^\/[^\/]/.test(u) || u === "#") ? u : "#";
  }

  /* ---------- Mappatura sicura del post WP ---------- */
  function getImage(p) {
    try {
      var m = p._embedded && p._embedded["wp:featuredmedia"] && p._embedded["wp:featuredmedia"][0];
      if (!m) return "";
      var sizes = m.media_details && m.media_details.sizes;
      if (sizes && sizes.large) return sizes.large.source_url;
      if (sizes && sizes.medium_large) return sizes.medium_large.source_url;
      return m.source_url || "";
    } catch (e) { return ""; }
  }
  function mapPost(p) {
    return {
      title:   stripHtml(p.title && p.title.rendered),
      excerpt: truncate(stripHtml(p.excerpt && p.excerpt.rendered), 170),
      date:    p.date || "",
      image:   getImage(p),
      link:    p.link || "#"
    };
  }

  /* ---------- Costruzione card (solo DOM + textContent = anti-XSS) ---------- */
  function buildCard(post, featured) {
    var a = document.createElement("a");
    a.className = "p-card n-card" + (featured ? " n-card--featured" : "");
    a.setAttribute("href", safeUrl(post.link));

    var img = document.createElement("div"); img.className = "p-card__img";
    if (post.image) img.style.setProperty("--img", 'url("' + cssSafe(post.image) + '")');

    var grad = document.createElement("div"); grad.className = "p-card__grad";
    var glow = document.createElement("div"); glow.className = "n-glow";

    var body = document.createElement("div"); body.className = "p-card__body";
    var date = document.createElement("span"); date.className = "n-date"; date.textContent = formatDateIt(post.date);
    var h    = document.createElement("h3");   h.className = "p-card__title"; h.textContent = post.title || "Senza titolo";
    var p    = document.createElement("p");    p.className = "p-card__text";  p.textContent = post.excerpt || "";

    if (post.date) body.appendChild(date);
    body.appendChild(h);
    if (post.excerpt) body.appendChild(p);

    a.appendChild(img); a.appendChild(grad); a.appendChild(glow); a.appendChild(body);
    return a;
  }

  /* ---------- Skeleton loading ---------- */
  function renderSkeleton() {
    bento.innerHTML = "";
    bento.setAttribute("data-state", "loading");
    for (var i = 0; i < 6; i++) {
      var s = document.createElement("div");
      s.className = "n-skel" + (i === 0 ? " n-card--featured" : "");
      s.setAttribute("aria-hidden", "true");
      bento.appendChild(s);
    }
  }

  /* ---------- B. Tilt 3D + parallasse + glow (card secondarie) ---------- */
  function attachTilt(card) {
    if (reduce) return;
    var img = card.querySelector(".p-card__img");
    card.addEventListener("pointerenter", function () { card.classList.add("is-tilting"); });
    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = "rotateY(" + (px * 8).toFixed(2) + "deg) rotateX(" + (-py * 8).toFixed(2) + "deg) translateY(-4px)";
      if (img) img.style.transform = "scale(1.08) translate(" + (-px * 16).toFixed(1) + "px," + (-py * 16).toFixed(1) + "px)"; // parallasse opposta
      card.style.setProperty("--mx", ((px + 0.5) * 100).toFixed(1) + "%");
      card.style.setProperty("--my", ((py + 0.5) * 100).toFixed(1) + "%");
    });
    card.addEventListener("pointerleave", function () {
      card.classList.remove("is-tilting");
      card.style.transform = "";
      if (img) img.style.transform = "";
    });
  }

  /* ---------- A. Frenata Tech (featured) ---------- */
  function triggerFrenata(feat) {
    feat.classList.add("is-arriving");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          requestAnimationFrame(function () { feat.classList.remove("is-arriving"); });
          io.disconnect();
        }
      });
    }, { threshold: 0.2 });
    io.observe(feat);
  }

  /* ---------- Render della griglia ---------- */
  function render(posts, isFallback) {
    bento.innerHTML = "";
    bento.setAttribute("data-state", isFallback ? "fallback" : "ready");
    posts.slice(0, 6).forEach(function (post, i) {
      var featured = i === 0;
      var card = buildCard(post, featured);
      bento.appendChild(card);
      if (!featured) attachTilt(card);
    });
    var feat = bento.querySelector(".n-card--featured");
    if (feat && !reduce) triggerFrenata(feat);
    if (isFallback) {
      var note = document.createElement("p");
      /*note.className = "news-fallback-note";
      note.textContent = "Anteprima: i contenuti reali verranno caricati automaticamente dalle news di WordPress una volta pubblicati.";
      bento.appendChild(note);*/
    }
  }

  /* ---------- Fetch con timeout ---------- */
  function fetchPosts() {
    return new Promise(function (resolve, reject) {
      if (!("fetch" in window)) return reject("no-fetch");
      var ctrl = ("AbortController" in window) ? new AbortController() : null;
      var to = setTimeout(function () { if (ctrl) ctrl.abort(); reject("timeout"); }, CONFIG.timeout);
      fetch(CONFIG.url, ctrl ? { signal: ctrl.signal } : undefined)
        .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
        .then(function (data) {
          clearTimeout(to);
          if (!Array.isArray(data) || !data.length) return reject("empty");
          resolve(data.map(mapPost));
        })
        .catch(function (err) { clearTimeout(to); reject(err); });
    });
  }

  /* ---------- Avvio ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    bento = document.getElementById("newsBento");
    if (!bento) return;
    renderSkeleton();
    fetchPosts()
      .then(function (posts) { render(posts, false); })
      .catch(function () { render(FALLBACK, true); });   // fallback pulito
  });
})();
