# Parsec Solutions — Sito istituzionale

Sito vetrina multipagina di Parsec Solutions Srl, realizzato come applicazione statica e servito
direttamente da file, senza back-end né database. La scelta ricade su tre tecnologie di base —
HTML5, CSS3 e JavaScript senza framework — affiancate da three.js (caricato da CDN) per le poche
scene tridimensionali. Non esiste alcuno step di compilazione: ciò che si trova nel repository è,
byte per byte, ciò che viene pubblicato.

L'obiettivo dichiarato è duplice: una resa grafica curata, dal carattere "dark-tech", e un impianto
di manutenzione essenziale, in cui ogni elemento ricorrente vive in un unico punto del codice.

## Avvio in locale

Trattandosi di contenuto statico, è sufficiente aprire `index.html` in un browser. Per riprodurre
fedelmente il comportamento di produzione — in particolare il caricamento degli script e delle
risorse via HTTP — è però consigliabile servire la cartella con un server locale:

```
# con XAMPP: copiare la cartella in htdocs e visitare
http://localhost/parsec-refactor-black/

# in alternativa, un qualsiasi server statico
python -m http.server 8080
```

Alcune funzioni (fetch delle news, animazioni WebGL) rendono al meglio sotto `http://` o `https://`
rispetto all'apertura diretta del file tramite `file://`.

## Organizzazione del repository

```
.
├── index.html                 Home: hero cinematica 3D, sezioni ad effetto scroll, anello di soluzioni
├── solutions.html             Panoramica dell'offerta: piramide interattiva, moduli SAP, check-up guidato
├── chi-siamo.html             Profilo aziendale, filosofia, valori
├── contatti.html              Recapiti e modulo di contatto
├── lavora-con-noi.html        Candidatura spontanea con allegato del curriculum
├── news.html                  Sezione notizie (contenuti da REST API con fallback locale)
├── come-lavoriamo.html        Il metodo di lavoro, con timeline e simulazione interattiva
├── ddm.html                   Gestione documentale e fatturazione elettronica (partnership DDM Solutions)
├── sap-*.html                 Schede applicative: S/4HANA, Digital Platform, SCM, Security, on Cloud, BI
├── sap-basis.html             Hub del livello sistemistico, con le sei aree collegate
├── gs-*.html                  Schede dei servizi SAP Basis (archiving, backup, profiling, ecc.)
└── assets/
    ├── css/
    │   ├── style.css          Design system principale: variabili, tema, componenti, responsività
    │   └── *.css              Fogli di stile specifici delle pagine con componenti dedicati
    ├── js/
    │   ├── components.js      Header e footer condivisi; menu, mega-menu e innesco dell'i18n
    │   ├── i18n.js            Dizionario IT/EN e motore di traduzione lato client
    │   ├── main.js            Comparse allo scroll, micro-interazioni, effetto di ingrandimento, upload file
    │   ├── cinematic.js       Stella cromata WebGL della home (three.js)
    │   ├── piramid.js         Piramide 3D interattiva della pagina Solutions (three.js)
    │   ├── home-scenes.js     Scena "scroll-scale" e carosello ad anello della home
    │   ├── sap-assessment.js  Questionario "Quanto è sano il tuo SAP?"
    │   ├── news-engine.js     Recupero notizie con degrado controllato su contenuti locali
    │   └── *.js               Sfondo animato, timeline della migrazione, moduli di pagina
    └── img/                   Immagini e logo
```

## Impianto architetturale

Il codice è organizzato attorno a un principio ricorrente: non duplicare ciò che compare su più
pagine. La testata e il piè di pagina non sono scritti in ciascun documento, bensì generati da
`components.js` e iniettati nei segnaposto `#site-header` e `#site-footer`. Ogni pagina si limita a
dichiarare la propria identità con `<body data-page="...">`, informazione usata per evidenziare la
voce di menu attiva. Modificare una voce di navigazione o un recapito significa quindi intervenire
in un solo file, con effetto immediato sull'intero sito.

L'intero linguaggio visivo è governato da variabili CSS raccolte nel blocco `:root` di `style.css`:
colori, tipografia, spaziature, raggi e transizioni. Il tema scuro, con fondo blu notte e accenti
acquamarina-ciano, si regola da lì, senza inseguire valori sparsi nel foglio di stile.

Le componenti tridimensionali sono deliberatamente circoscritte. La stella cromata della home
(`cinematic.js`) e la piramide della pagina Solutions (`piramid.js`) sono le uniche scene WebGL, e
vengono avviate solo dove servono; le pagine di dettaglio restano leggere. Ogni scena rispetta la
preferenza `prefers-reduced-motion`, alleggerisce il carico su viewport ridotte e libera il contesto
WebGL all'uscita dalla pagina, così da non accumulare risorse grafiche.

Le comparse allo scroll si appoggiano a `IntersectionObserver`, senza librerie esterne, con un
fallback che mostra i contenuti qualora l'API non sia disponibile. Gli effetti "scroll-scale" della
home — una scheda che si rimpicciolisce e una che, all'inverso, cresce fino a riempire la sezione —
condividono lo stesso meccanismo, calibrato in `home-scenes.js` e `main.js`.

## Bilinguismo (IT/EN)

Il sito è interamente bilingue senza pagine duplicate. Un unico insieme di documenti, in italiano,
viene tradotto a runtime: `i18n.js` contiene il dizionario italiano→inglese e un motore che percorre
i nodi di testo e gli attributi rilevanti (`placeholder`, `aria-label`, `title`, la meta description
e il `<title>`), sostituendo le stringhe riconosciute. La lingua scelta è ricordata in
`localStorage` e riapplicata a ogni pagina.

Poiché alcune parti dell'interfaccia — le notizie e il questionario — vengono costruite dopo il
caricamento, un `MutationObserver` intercetta i nodi aggiunti dinamicamente e li traduce al volo. Il
selettore di lingua, con le bandiere dei due Paesi, è collocato nella testata ed è disponibile su
tutte le viste.

## Pubblicazione

Il progetto è pensato per un hosting statico. È predisposto per GitHub Pages: la presenza del file
`.nojekyll` disabilita l'elaborazione Jekyll e serve i file così come sono, mentre l'uso sistematico
di percorsi relativi consente al sito di funzionare anche quando è servito da una sottocartella
(ad esempio `utente.github.io/nome-repository/`). Per la pubblicazione è sufficiente caricare il
contenuto della cartella nella radice del ramo pubblicato e abilitare Pages sul relativo branch.

## Convenzioni e manutenzione

- La struttura delle pagine di dettaglio segue uno schema costante (hero con breadcrumb, sezioni
  descrittive, invito all'azione finale): replicarlo mantiene coerenza e prevedibilità.
- Le nuove stringhe destinate alla versione inglese vanno aggiunte al dizionario di `i18n.js` nella
  forma normalizzata, ossia senza spazi iniziali o finali e con spazi interni singoli.
- Le immagini decorative sono per lo più icone SVG in linea, per non dipendere da file esterni e
  ridurre le richieste di rete.

## Note

I moduli di contatto e candidatura sono, allo stato attuale, lato client: per renderli operativi
occorre collegarli a un endpoint di invio (servizio esterno o funzione serverless). Le notizie
provengono da una REST API con un contenuto di riserva locale, mostrato quando la sorgente remota
non è raggiungibile.
