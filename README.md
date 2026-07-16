# Parsec Solutions — Refactor front-end (multipage)

Scheletro del nuovo sito **multipage statico** che sostituisce la vecchia single-page WordPress.
Stack volutamente leggero: **HTML + CSS + JavaScript vanilla + three.js** (via CDN). Nessun build step, nessun database.

## Come avviarlo

Il sito è servito da XAMPP come contenuto statico:

```
http://localhost/parsecsolution/parsec-refactor/
```

Funziona anche aprendo `index.html` direttamente nel browser, ma è consigliato servirlo via HTTP (XAMPP) per coerenza con l'ambiente reale. Quando sarà definitivo, potrai spostare la cartella `parsec-refactor/` in una sua directory dedicata dentro `htdocs` (es. `htdocs/parsec/`).

## Struttura

```
parsec-refactor/
├── index.html            Home (hero con sfondo particellare three.js)
├── chi-siamo.html        Chi Siamo + filosofia + valori
├── servizi.html          Cosa Facciamo (4 aree, con ancore)
├── lavora-con-noi.html   Candidatura + form CV
├── news.html             Sezione news (griglia, contenuti da importare)
├── contatti.html         Contatti + form + dati aziendali
├── assets/
│   ├── css/style.css     Design system unico (variabili CSS, tema dark-tech, responsive)
│   └── js/
│       ├── components.js Header + footer condivisi (iniezione DRY) + menu mobile
│       ├── particles.js  Rete di particelle 3D con three.js (solo hero della home)
│       └── main.js       Reveal on scroll (IntersectionObserver)
└── README.md
```

## Scelte architetturali

- **Header e footer centralizzati** (`components.js`): un solo punto di modifica, niente markup duplicato tra le 6 pagine. Ogni pagina dichiara `<body data-page="...">` per evidenziare la voce di menu attiva, e contiene i segnaposto `#site-header` / `#site-footer`.
- **Design system con variabili CSS** (`:root`): colori, tipografia, spaziature e raggi centralizzati → tema modificabile in un punto solo.
- **three.js isolato all'hero**: il canvas particellare gira solo dove serve (home), così le altre pagine restano leggere. Lo script rispetta `prefers-reduced-motion` e riduce i nodi su mobile.
- **Reveal on scroll** via `IntersectionObserver` (nessuna libreria esterna), con fallback che mostra tutto se non supportato.
- **Accessibilità/performance**: markup semantico, `aria-label` sulla navigazione, immagini decorative in SVG inline (nessuna dipendenza da file mancanti), animazioni disattivabili.

## Prossimi passi consigliati

1. **Contenuti reali** — importare i testi/immagini definitivi (logo brand da `2021/02/logo.png`, articoli news) in `assets/img` e nelle pagine.
2. **Form funzionanti** — collegare i form (Contatti, Lavora con noi) a un endpoint reale (PHP mail, servizio esterno o API). Attualmente sono solo front-end (`onsubmit="return false"`).
3. **SEO** — aggiungere Open Graph, `sitemap.xml`, `robots.txt` e favicon definitiva.
4. **Deploy** — pubblicare come sito statico (l'hosting attuale va bene: si carica via FTP, senza più il peso di WordPress/DB).

> Nota: questo pacchetto è indipendente dall'installazione WordPress presente nella cartella padre. Non richiede il database `wpparsec` né alcun servizio MySQL.
