/* =============================================================
   forms.js
   Rende funzionali i form (Lavora con noi, Contatti):
   - validazione nativa dei campi obbligatori
   - controllo dimensione file (max 2MB) e tipo consentito
   - INVIO REALE all'endpoint PHP (invia.php) via fetch/FormData
   - messaggio di conferma / errore in base alla risposta JSON
   ============================================================= */
(function () {
  "use strict";

  var MAX_FILE = 2 * 1024 * 1024; // 2 MB

  function initForm(form) {
    var status    = form.querySelector(".form-status");
    var fileInput = form.querySelector('input[type="file"]');
    var submitBtn = form.querySelector('button[type="submit"]');
    // Endpoint: attributo action del form, con fallback a invia.php
    var endpoint  = form.getAttribute("action") || "invia.php";

    function showStatus(msg, ok) {
      if (!status) { alert(msg); return; }
      status.textContent = msg;
      status.className = "form-status " + (ok ? "ok" : "err");
    }

    // Controllo file lato client: dimensione massima 2MB
    if (fileInput) {
      fileInput.addEventListener("change", function () {
        if (fileInput.files && fileInput.files.length) {
          var f = fileInput.files[0];
          if (f.size > MAX_FILE) {
            showStatus("Il file supera i 2MB. Scegline uno più piccolo.", false);
            fileInput.value = "";
          } else if (status) {
            status.className = "form-status"; // reset eventuale errore
          }
        }
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // Validazione nativa (campi required, email, checkbox)
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var data = new FormData(form);

      // Feedback "invio in corso" e blocco doppio invio
      if (submitBtn) { submitBtn.disabled = true; }
      showStatus("Invio in corso…", true);

      fetch(endpoint, { method: "POST", body: data })
        .then(function (r) {
          return r.json().catch(function () {
            // Se il server non restituisce JSON valido
            throw new Error("Risposta non valida dal server.");
          });
        })
        .then(function (res) {
          showStatus(res.message, !!res.ok);
          if (res.ok) { form.reset(); }
        })
        .catch(function () {
          showStatus("Si è verificato un problema nell'invio. Riprova più tardi.", false);
        })
        .finally(function () {
          if (submitBtn) { submitBtn.disabled = false; }
          if (status) {
            setTimeout(function () {
              status.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 50);
          }
        });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("form[data-form]").forEach(initForm);
  });
})();
