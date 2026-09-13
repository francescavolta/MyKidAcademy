require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const PgStore = require('connect-pg-simple')(session);
const bcrypt = require('bcryptjs');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const { pool, initDb } = require('./db');
const { invia, avvisaAdmin } = require('./mail');

const app = express();
const PORT = process.env.PORT || 3000;
const PROD = process.env.NODE_ENV === 'production';
// Cambia a ogni pacchetto: serve a capire dal sito quale versione è davvero online.
const VERSIONE = '13 settembre 2026 · tariffe a range, referenze corrette';
const INDIRIZZO = (process.env.INDIRIZZO_SITO || '').replace(/\/$/, '');
const urlAssoluto = (req, percorso) => (INDIRIZZO || `${req.protocol}://${req.get('host')}`) + percorso;

const FILE_ATTESI = [
  'db.js', 'mail.js', 'package.json', 'render.yaml',
  'public/carica-immagine.js', 'public/editor.js', 'public/modifica-home.js', 'public/style.css',
  'views/accedi.ejs', 'views/admin-agenda.ejs', 'views/admin-articolo.ejs', 'views/admin-aspetto.ejs',
  'views/admin-blog.ejs', 'views/admin-home.ejs', 'views/admin-immagini.ejs', 'views/admin-pagina.ejs',
  'views/admin-pagine.ejs', 'views/admin-sezione.ejs', 'views/admin-tutor.ejs', 'views/area-admin.ejs',
  'views/area-tutor.ejs', 'views/articolo.ejs', 'views/blog.ejs', 'views/candidatura.ejs', 'views/chat.ejs',
  'views/elenco.ejs', 'views/errore.ejs', 'views/home.ejs', 'views/messaggi-elenco.ejs', 'views/pagina.ejs',
  'views/password-chiedi.ejs', 'views/password-nuova.ejs', 'views/privacy.ejs', 'views/profilo-tutor.ejs',
  'views/partials/calendario.ejs', 'views/partials/campi-tutor.ejs', 'views/partials/consenso.ejs',
  'views/partials/faccia.ejs', 'views/partials/piede.ejs', 'views/partials/referenze.ejs',
  'views/partials/sezione.ejs', 'views/partials/testa.ejs'
];

function fileMancanti() {
  return FILE_ATTESI.filter((f) => !fs.existsSync(path.join(__dirname, f)));
}

const MANSIONI = [
  { id: 'ripetizioni', label: 'Ripetizioni', desc: 'Lezioni su una materia, a casa o online.' },
  { id: 'compiti', label: 'Aiuto compiti', desc: 'Accompagnamento quotidiano nei compiti.' },
  { id: 'babysitter', label: 'Babysitter', desc: 'Qualcuno con i bambini quando non ci sei.' },
  { id: 'cucina', label: 'Cucina', desc: 'Pranzo o cena preparati in casa.' },
  { id: 'pulizia', label: 'Pulizia casa', desc: 'Riordino e pulizie degli ambienti.' }
];
const ID_MANSIONI = MANSIONI.map((m) => m.id);
const labelMansione = (id) => (MANSIONI.find((m) => m.id === id) || {}).label || id;


const FONT = {
  'fraunces-karla': {
    nome: 'Fraunces + Karla — morbido (quello attuale)',
    query: 'family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Karla:wght@400;700',
    titoli: "'Fraunces', Georgia, serif",
    testo: "'Karla', system-ui, sans-serif"
  },
  'dm': {
    nome: 'DM Serif + DM Sans — pulito',
    query: 'family=DM+Serif+Display&family=DM+Sans:wght@400;700',
    titoli: "'DM Serif Display', Georgia, serif",
    testo: "'DM Sans', system-ui, sans-serif"
  },
  'playfair': {
    nome: 'Playfair + Lato — classico',
    query: 'family=Playfair+Display:wght@500;700&family=Lato:wght@400;700',
    titoli: "'Playfair Display', Georgia, serif",
    testo: "'Lato', system-ui, sans-serif"
  },
  'quicksand': {
    nome: 'Quicksand — tondo e amichevole',
    query: 'family=Quicksand:wght@500;700',
    titoli: "'Quicksand', system-ui, sans-serif",
    testo: "'Quicksand', system-ui, sans-serif"
  },
  'nunito': {
    nome: 'Nunito — morbido e leggibile',
    query: 'family=Nunito:wght@400;600;800',
    titoli: "'Nunito', system-ui, sans-serif",
    testo: "'Nunito', system-ui, sans-serif"
  },
  'lora-inter': {
    nome: 'Lora + Inter — sobrio da rivista',
    query: 'family=Lora:wght@500;600&family=Inter:wght@400;600',
    titoli: "'Lora', Georgia, serif",
    testo: "'Inter', system-ui, sans-serif"
  },
  'baskerville-worksans': {
    nome: 'Libre Baskerville + Work Sans — tradizionale',
    query: 'family=Libre+Baskerville:wght@400;700&family=Work+Sans:wght@400;600',
    titoli: "'Libre Baskerville', Georgia, serif",
    testo: "'Work Sans', system-ui, sans-serif"
  },
  'poppins-inter': {
    nome: 'Poppins + Inter — moderno e geometrico',
    query: 'family=Poppins:wght@500;600&family=Inter:wght@400;600',
    titoli: "'Poppins', system-ui, sans-serif",
    testo: "'Inter', system-ui, sans-serif"
  },
  'comfortaa-rubik': {
    nome: 'Comfortaa + Rubik — infanzia',
    query: 'family=Comfortaa:wght@500;700&family=Rubik:wght@400;600',
    titoli: "'Comfortaa', system-ui, sans-serif",
    testo: "'Rubik', system-ui, sans-serif"
  }
};

const COLORI_TESTO = {
  tema: { nome: 'Colore del sito', css: 'var(--prugna)' },
  rosa: { nome: 'Rosa', css: '#d16a92' },
  rosso: { nome: 'Rosso', css: '#b3261e' },
  arancio: { nome: 'Arancio', css: '#b4610f' },
  giallo: { nome: 'Giallo scuro', css: '#96780c' },
  verde: { nome: 'Verde', css: '#3f7a52' },
  blu: { nome: 'Blu', css: '#2a5d9f' },
  viola: { nome: 'Viola', css: '#6c3f96' },
  grigio: { nome: 'Grigio', css: '#7c6670' }
};

// Larghezze in dodicesimi: i blocchi consecutivi si affiancano finché entrano in 12.
const LARGHEZZE = {
  piena: { nome: 'Tutta la larghezza', col: 12 },
  tre_quarti: { nome: 'Tre quarti', col: 9 },
  due_terzi: { nome: 'Due terzi', col: 8 },
  meta: { nome: 'Metà', col: 6 },
  terzo: { nome: 'Un terzo', col: 4 },
  quarto: { nome: 'Un quarto', col: 3 }
};
const VERTICALI = { alto: 'In alto', centro: 'Al centro', basso: 'In basso' };

const POSIZIONI_FOTO = {
  destra: 'A destra del testo',
  sinistra: 'A sinistra del testo',
  sopra: 'Sopra il testo',
  sotto: 'Sotto il testo'
};
const DIMENSIONI_FOTO = { piccola: 'Piccola', media: 'Media', grande: 'Grande', piena: 'Tutta la larghezza' };
const ALLINEAMENTI = { sinistra: 'A sinistra', centro: 'Centrato', destra: 'A destra' };
const DIMENSIONI_TITOLO = { piccolo: 'Piccolo', normale: 'Normale', grande: 'Grande' };

const TIPI_SEZIONE = {
  testo: { nome: 'Testo', spiega: 'Un titolo e del testo, con immagine se vuoi.', campi: ['titolo', 'dimensione_titolo', 'corpo', 'allineamento', 'immagine', 'posizione', 'dimensione', 'larghezza'] },
  immagine: { nome: 'Immagine', spiega: 'Una foto con didascalia facoltativa.', campi: ['immagine', 'dimensione', 'allineamento', 'titolo', 'larghezza'] },
  mansioni: { nome: 'Tessere dei servizi', spiega: 'I cinque riquadri: ripetizioni, compiti, babysitter, cucina, pulizia.', campi: ['titolo', 'dimensione_titolo', 'allineamento', 'larghezza'] },
  tutor: { nome: 'Schede delle tutor', spiega: 'Le prime sei ragazze approvate, con il link a tutte.', campi: ['titolo', 'dimensione_titolo', 'allineamento', 'larghezza'] },
  articoli: { nome: 'Ultimi articoli del blog', spiega: 'I tre articoli pubblicati più recenti.', campi: ['titolo', 'dimensione_titolo', 'allineamento', 'larghezza'] },
  cta: { nome: 'Invito con pulsante', spiega: 'Titolo, testo e un pulsante che porta dove vuoi.', campi: ['titolo', 'dimensione_titolo', 'corpo', 'allineamento', 'testo_bottone', 'link_bottone', 'larghezza'] }
};

const RAGGI = { morbido: '18px', tondo: '28px', netto: '3px' };
const SCALE = { normale: '17px', grande: '19px' };
const IMPAGINAZIONI_BLOG = { elenco: 'Elenco semplice', schede: 'Schede con immagine', griglia: 'Griglia di riquadri' };

const CAMPI_ASPETTO = [
  { chiave: 'nome_sito', gruppo: 'Testi', label: 'Nome del sito', tipo: 'testo', def: 'MyKidAcademy' },
  { chiave: 'titolo_home', gruppo: 'Home', label: 'Titolo grande in home', tipo: 'area', def: 'Una persona di fiducia\nper quello che serve a casa.', aiuto: 'Dove vai a capo tu, va a capo anche il sito.' },
  { chiave: 'sottotitolo_home', gruppo: 'Home', label: 'Frase sotto il titolo', tipo: 'area', def: 'Selezioniamo noi le ragazze che collaborano con noi, una per una. Tu scegli di cosa hai bisogno, guardi chi è libera e ci pensiamo noi a organizzare.' },
  { chiave: 'email_contatto', gruppo: 'Testi', label: 'Email di contatto', tipo: 'testo', def: 'ciao@esempio.it' },
  { chiave: 'whatsapp', gruppo: 'Testi', label: 'Numero WhatsApp', tipo: 'testo', def: '', aiuto: 'Con prefisso e senza spazi, es. 393331234567. Lascia vuoto per non mostrare il pulsante.' },
  { chiave: 'testo_piede', gruppo: 'Testi', label: 'Riga in fondo alle pagine', tipo: 'testo', def: 'ripetizioni, aiuto compiti, babysitter e aiuto in casa.' },

  { chiave: 'home_immagine', gruppo: 'Home', label: 'Immagine principale', tipo: 'immagine', def: '', aiuto: 'Si carica da Immagini. Lascia "Nessuna" per la home senza foto.' },
  { chiave: 'home_immagine_stile', gruppo: 'Home', label: 'Come si vede', tipo: 'scelta', opzioni: { accanto: 'Accanto al titolo', sotto: 'Larga sotto al titolo', sfondo: 'Come sfondo, col titolo sopra' }, def: 'accanto' },
  { chiave: 'home_immagine_altezza', gruppo: 'Home', label: 'Grandezza dell\'immagine in cima', tipo: 'scelta', opzioni: { bassa: 'Bassa', media: 'Media', alta: 'Alta' }, def: 'media' },
  { chiave: 'home_allineamento', gruppo: 'Home', label: 'Titolo in cima', tipo: 'scelta', opzioni: { sinistra: 'A sinistra', centro: 'Centrato' }, def: 'sinistra' },
  { chiave: 'home_titolo_articoli', gruppo: 'Home', label: 'Come chiamare il link al blog nei blocchi', tipo: 'testo', def: 'Leggi tutti gli articoli' },

  { chiave: 'font', gruppo: 'Caratteri', label: 'Coppia di caratteri', tipo: 'font', def: 'fraunces-karla' },
  { chiave: 'scala', gruppo: 'Caratteri', label: 'Dimensione del testo', tipo: 'scelta', opzioni: { normale: 'Normale', grande: 'Grande (più leggibile)' }, def: 'normale' },

  { chiave: 'colore_carta', gruppo: 'Colori', label: 'Sfondo delle pagine', tipo: 'colore', def: '#fff8fa' },
  { chiave: 'colore_barra', gruppo: 'Colori', label: 'Sfondo della barra in alto', tipo: 'colore', def: '#fff8fa' },
  { chiave: 'colore_velo', gruppo: 'Colori', label: 'Riquadri e riempimenti', tipo: 'colore', def: '#fbe7ee' },
  { chiave: 'colore_rosa', gruppo: 'Colori', label: 'Bordi e etichette', tipo: 'colore', def: '#f0bfd0' },
  { chiave: 'colore_titolo', gruppo: 'Colori', label: 'Titoli', tipo: 'colore', def: '#8e3a5c' },
  { chiave: 'colore_prugna', gruppo: 'Colori', label: 'Pulsanti e link', tipo: 'colore', def: '#8e3a5c' },
  { chiave: 'colore_inchiostro', gruppo: 'Colori', label: 'Testo normale', tipo: 'colore', def: '#34222b' },
  { chiave: 'colore_grigio', gruppo: 'Colori', label: 'Testo secondario e date', tipo: 'colore', def: '#7c6670' },

  { chiave: 'raggio', gruppo: 'Forme', label: 'Angoli dei riquadri', tipo: 'scelta', opzioni: { morbido: 'Morbidi', tondo: 'Molto tondi', netto: 'Netti' }, def: 'morbido' },
  { chiave: 'ombre', gruppo: 'Forme', label: 'Ombre sotto i riquadri', tipo: 'scelta', opzioni: { si: 'Sì', no: 'No' }, def: 'si' },

  { chiave: 'og_descrizione', gruppo: 'Condivisione', label: 'Descrizione quando condividi il link', tipo: 'area', def: 'Ripetizioni, aiuto compiti, babysitter e aiuto in casa. Persone selezionate una per una.', aiuto: 'È il testo che compare nel riquadro su WhatsApp e sui social.' },
  { chiave: 'og_immagine', gruppo: 'Condivisione', label: 'Immagine di condivisione', tipo: 'immagine', def: '', aiuto: 'Meglio orizzontale. Se non la metti uso quella in cima alla home.' },
  { chiave: 'privacy_testo', gruppo: 'Privacy', label: 'Testo della pagina privacy', tipo: 'area', def: 'Questa pagina spiega come trattiamo i dati che ci lasci sul sito.\n\n## Chi tratta i dati\nI dati sono trattati da MyKidAcademy. Per qualsiasi richiesta puoi scriverci all\'indirizzo che trovi in fondo al sito.\n\n## Quali dati raccogliamo\nQuando mandi una richiesta: nome, email, telefono e quello che scrivi nel messaggio. Quando lasci una referenza: la firma che scegli, il voto, il commento e l\'email se la indichi. Quando ti candidi per lavorare con noi: i dati della tua scheda.\n\n## Perché\nPer ricontattarti e organizzare il servizio che ci hai chiesto. Non li usiamo per altro e non li vendiamo a nessuno.\n\n## Per quanto tempo\nFinché servono a gestire il rapporto con te. Puoi chiederci di cancellarli quando vuoi.\n\n## I tuoi diritti\nPuoi chiederci di vedere, correggere o cancellare i tuoi dati, oppure di non usarli più: basta scriverci.\n\n## Cookie\nUsiamo solo un cookie tecnico che tiene aperto l\'accesso di chi entra nella propria area. Non facciamo profilazione e non usiamo cookie di terze parti.', aiuto: 'Compila con i tuoi dati veri: nome dell\'attività, P.IVA e indirizzo. Questo è un punto di partenza, non un testo legale garantito.' },
  { chiave: 'titolo_blog', gruppo: 'Blog', label: 'Titolo della pagina blog', tipo: 'testo', def: 'Blog' },
  { chiave: 'sottotitolo_blog', gruppo: 'Blog', label: 'Frase sotto il titolo', tipo: 'area', def: 'Consigli, avvisi e cose che vale la pena raccontare ai genitori.' },
  { chiave: 'blog_impaginazione', gruppo: 'Blog', label: 'Come si vede l\'elenco', tipo: 'scelta', opzioni: IMPAGINAZIONI_BLOG, def: 'elenco' },
  { chiave: 'blog_data', gruppo: 'Blog', label: 'Mostrare la data', tipo: 'scelta', opzioni: { si: 'Sì', no: 'No' }, def: 'si' },
  { chiave: 'blog_copertina_grande', gruppo: 'Blog', label: 'Copertina a tutta larghezza nell\'articolo', tipo: 'scelta', opzioni: { si: 'Sì', no: 'No, piccola' }, def: 'si' },
  { chiave: 'colore_blog_sfondo', gruppo: 'Blog', label: 'Sfondo delle pagine del blog', tipo: 'colore', def: '#fff8fa' }
];

const GRUPPI_ASPETTO = ['Testi', 'Home', 'Caratteri', 'Colori', 'Forme', 'Blog', 'Condivisione', 'Privacy'];

function luminanza(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return 1;
  const n = parseInt(m[1], 16);
  const canali = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * canali[0] + 0.7152 * canali[1] + 0.0722 * canali[2];
}

// Rapporto di contrasto WCAG: sotto 4.5 il testo piccolo diventa faticoso.
function contrasto(a, b) {
  const x = luminanza(a);
  const y = luminanza(b);
  return Math.round(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 10) / 10;
}

function scurisci(hex, quanto = 0.22) {
  const m = /^#([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return '#6f2a46';
  const n = parseInt(m[1], 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.round(v * (1 - quanto))));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

let cacheCfg = null;
let cacheCfgOra = 0;
let cacheMenu = null;
let cacheMenuOra = 0;

async function menuPagine(forza = false) {
  if (!forza && cacheMenu && Date.now() - cacheMenuOra < 60000) return cacheMenu;
  try {
    const { rows } = await pool.query(
      'select slug, titolo from pagine where attiva = true and nel_menu = true order by ordine asc, id asc'
    );
    cacheMenu = rows;
  } catch (e) {
    cacheMenu = [];
  }
  cacheMenuOra = Date.now();
  return cacheMenu;
}

async function impostazioni(forza = false) {
  if (!forza && cacheCfg && Date.now() - cacheCfgOra < 60000) return cacheCfg;
  const cfg = {};
  for (const c of CAMPI_ASPETTO) cfg[c.chiave] = c.def;
  try {
    const { rows } = await pool.query('select chiave, valore from impostazioni');
    for (const r of rows) if (r.chiave in cfg && r.valore !== '') cfg[r.chiave] = r.valore;
  } catch (e) {
    console.error('Impostazioni non leggibili, uso i valori di default:', e.message);
  }
  if (!FONT[cfg.font]) cfg.font = 'fraunces-karla';
  cacheCfg = cfg;
  cacheCfgOra = Date.now();
  return cfg;
}

function esc(t) {
  return String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function inLinea(t) {
  return esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\s)\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener">$1</a>')
    .replace(/\{(\w+):([^{}]*)\}/g, (tutto, nome, dentro) =>
      COLORI_TESTO[nome] ? '<span style="color:' + COLORI_TESTO[nome].css + '">' + dentro + '</span>' : tutto
    );
}

// Da testo semplice a HTML. Ogni riga è valutata da sola: "## " sottotitolo,
// "### " sotto-sottotitolo, "- " elenco, "[img:N]" immagine, riga vuota nuovo paragrafo.
function corpoHtml(testo) {
  const righe = String(testo || '').replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let paragrafo = [];
  let elenco = [];

  const chiudiParagrafo = () => {
    if (paragrafo.length) out.push('<p>' + paragrafo.join('<br>') + '</p>');
    paragrafo = [];
  };
  const chiudiElenco = () => {
    if (elenco.length) out.push('<ul>' + elenco.map((v) => '<li>' + v + '</li>').join('') + '</ul>');
    elenco = [];
  };
  const chiudiTutto = () => {
    chiudiParagrafo();
    chiudiElenco();
  };

  for (const riga of righe) {
    const r = riga.trim();

    if (!r) {
      chiudiTutto();
      continue;
    }

    const titolo = /^(#{2,3})\s+(.*)$/.exec(r);
    if (titolo) {
      chiudiTutto();
      const tag = titolo[1].length === 2 ? 'h2' : 'h3';
      out.push('<' + tag + '>' + inLinea(titolo[2]) + '</' + tag + '>');
      continue;
    }

    const img = /^\[img:(\d+)(?:\|([^\]]*))?\]$/.exec(r);
    if (img) {
      chiudiTutto();
      out.push(
        '<figure><img src="/immagini/' + img[1] + '" alt="' + esc(img[2] || '') + '" loading="lazy">' +
          (img[2] ? '<figcaption>' + esc(img[2]) + '</figcaption>' : '') +
          '</figure>'
      );
      continue;
    }

    const voce = /^[-*]\s+(.*)$/.exec(r);
    if (voce) {
      chiudiParagrafo();
      elenco.push(inLinea(voce[1]));
      continue;
    }

    chiudiElenco();
    paragrafo.push(inLinea(r));
  }

  chiudiTutto();
  return out.join('\n');
}

function slugify(s) {
  const base = String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
  return base || 'articolo';
}

async function slugLibero(titolo, idEscluso) {
  const base = slugify(titolo);
  for (let i = 0; i < 50; i++) {
    const tentativo = i === 0 ? base : `${base}-${i + 1}`;
    const { rows } = await pool.query('select id from articoli where slug = $1', [tentativo]);
    if (!rows[0] || String(rows[0].id) === String(idEscluso)) return tentativo;
  }
  return `${base}-${Date.now()}`;
}

const STATI_RICHIESTA = ['nuova', 'in_corso', 'confermata', 'chiusa'];
const STATI_UTENTE = ['in_attesa', 'approvato', 'rifiutato', 'sospeso'];

/* ---------- setup ---------- */

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));
if (PROD) app.set('trust proxy', 1);

app.use(
  session({
    store: new PgStore({ pool, tableName: 'sessioni', createTableIfMissing: true }),
    name: 'mykidacademy.sid',
    secret: process.env.SESSION_SECRET || 'cambiami-in-produzione',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: PROD,
      maxAge: 1000 * 60 * 60 * 24 * 14
    }
  })
);

const TIPI_IMMAGINE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMMAGINE = 12 * 1024 * 1024;

const caricaFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMMAGINE, files: 1 }
}).single('file');

// Racchiude multer per non far crollare la pagina quando il file è troppo grande.
function riceviImmagine(req, res, next) {
  caricaFile(req, res, (err) => {
    if (err) {
      req.erroreFile = err.code === 'LIMIT_FILE_SIZE' ? 'L\'immagine supera i 12 MB, troppo anche dopo il ridimensionamento.' : 'Caricamento non riuscito.';
    }
    next();
  });
}

// Trappola per i robot: un campo che gli umani non vedono e non compilano.
function robot(req) {
  if (String(req.body.sito_web || '').trim() !== '') return true;
  const aperto = parseInt(req.body.aperto_il, 10);
  if (aperto && Date.now() - aperto < 3000) return true; // compilato in meno di 3 secondi
  return false;
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function avvisa(req, testo, tipo = 'ok') {
  req.session.avviso = { testo, tipo };
}

app.use(
  wrap(async (req, res, next) => {
    const cfg = await impostazioni();
    res.locals.cfg = cfg;
    res.locals.menuPagine = await menuPagine();
    res.locals.font = FONT[cfg.font];
    res.locals.FONT = FONT;
    res.locals.scurisci = scurisci;
    res.locals.contrasto = contrasto;
    res.locals.tariffaTesto = tariffaTesto;
    res.locals.VERSIONE = VERSIONE;
    res.locals.RAGGI = RAGGI;
    res.locals.COLORI_TESTO = COLORI_TESTO;
    res.locals.stelline = (n) => '★'.repeat(Math.round(Number(n) || 0)) + '☆'.repeat(5 - Math.round(Number(n) || 0));
    res.locals.LARGHEZZE = LARGHEZZE;
    res.locals.TIPI_SEZIONE = TIPI_SEZIONE;
    res.locals.GIORNI_SETT = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
    res.locals.SCALE = SCALE;
    res.locals.corpoHtml = corpoHtml;
    res.locals.aCapo = (t) => esc(t).replace(/\n/g, '<br>');
    res.locals.titolo = cfg.nome_sito;
    res.locals.MANSIONI = MANSIONI;
    res.locals.labelMansione = labelMansione;
    res.locals.iniziali = (nome) =>
      (nome || '?')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0] || '')
        .join('')
        .toUpperCase();
    res.locals.dataIt = (d) =>
      new Date(d).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
    res.locals.ora = (t) => String(t).slice(0, 5);
    res.locals.indirizzo = INDIRIZZO || `${req.protocol}://${req.get('host')}`;
    res.locals.percorso = req.path;
    res.locals.modifica = false;
    res.locals.avviso = req.session.avviso || null;
    delete req.session.avviso;
    res.locals.utente = null;

    if (req.session.userId) {
      const { rows } = await pool.query('select * from users where id = $1', [req.session.userId]);
      if (rows[0]) {
        req.utente = rows[0];
        res.locals.utente = rows[0];
        res.locals.modifica = rows[0].role === 'admin' && req.query.modifica === '1';
      } else {
        req.session.destroy(() => {});
      }
    }
    next();
  })
);

function soloAdmin(req, res, next) {
  if (!req.utente) return res.redirect('/accedi');
  if (req.utente.role !== 'admin') return res.status(403).render('errore', { titolo: 'Accesso negato', messaggio: 'Questa area è riservata al coordinamento.' });
  next();
}

function soloTutor(req, res, next) {
  if (!req.utente) return res.redirect('/accedi');
  if (req.utente.role !== 'tutor') return res.redirect('/area/coordinamento');
  next();
}

/* ---------- query riutilizzabili ---------- */

const SELECT_TUTOR = `
  select u.*,
    coalesce(array_agg(distinct m.mansione) filter (where m.mansione is not null), '{}') as mansioni,
    coalesce(array_agg(distinct t.nome) filter (where t.nome is not null), '{}') as materie,
    (select count(*)::int from referenze r where r.tutor_id = u.id and r.stato = 'pubblicata') as referenze_n,
    (select round(avg(r.stelle)::numeric, 1) from referenze r where r.tutor_id = u.id and r.stato = 'pubblicata') as stelle_media
  from users u
  left join mansioni m on m.user_id = u.id
  left join materie t on t.user_id = u.id
`;

async function sezioniHome({ soloAttive = true } = {}) {
  const { rows } = await pool.query(
    `select * from sezioni ${soloAttive ? 'where attiva = true' : ''} order by ordine asc, id asc`
  );
  return rows;
}

// Metto in fila i blocchi consecutivi finché le loro larghezze stanno in 12 dodicesimi.
function colonne(sezione) {
  return (LARGHEZZE[sezione.larghezza] || LARGHEZZE.piena).col;
}

function raggruppaSezioni(sezioni) {
  const file = [];
  let fila = [];
  let somma = 0;

  for (const s of sezioni) {
    const c = colonne(s);
    if (c >= 12) {
      if (fila.length) file.push(fila);
      file.push([s]);
      fila = [];
      somma = 0;
      continue;
    }
    if (somma + c > 12) {
      file.push(fila);
      fila = [];
      somma = 0;
    }
    fila.push(s);
    somma += c;
    if (somma === 12) {
      file.push(fila);
      fila = [];
      somma = 0;
    }
  }
  if (fila.length) file.push(fila);

  // Il totale della riga diventa il numero di colonne della griglia: così una riga
  // incompleta riempie comunque la larghezza mantenendo le proporzioni fra i blocchi.
  return file.map((blocchi) => ({
    blocchi,
    totale: blocchi.reduce((t, b) => t + colonne(b), 0),
    colonne: blocchi.map(colonne)
  }));
}

async function tutorPubblici({ mansione, zona, giorno } = {}) {
  const cond = ["u.role = 'tutor'", "u.status = 'approvato'"];
  const vals = [];
  if (giorno !== undefined && giorno !== '' && !Number.isNaN(Number(giorno))) {
    vals.push(Number(giorno));
    cond.push(`exists (
      select 1 from disponibilita d
      where d.user_id = u.id and d.stato = 'libero' and d.data >= current_date
        and extract(isodow from d.data) = $${vals.length}
    )`);
  }
  if (mansione && ID_MANSIONI.includes(mansione)) {
    vals.push(mansione);
    cond.push(`exists (select 1 from mansioni x where x.user_id = u.id and x.mansione = $${vals.length})`);
  }
  if (zona) {
    vals.push(`%${zona}%`);
    cond.push(`u.zona ilike $${vals.length}`);
  }
  const { rows } = await pool.query(
    `${SELECT_TUTOR} where ${cond.join(' and ')} group by u.id order by u.nome asc`,
    vals
  );
  return rows;
}

async function tutorSingolo(id) {
  const { rows } = await pool.query(`${SELECT_TUTOR} where u.id = $1 group by u.id`, [id]);
  return rows[0] || null;
}

async function disponibilitaFuture(userId) {
  const { rows } = await pool.query(
    `select * from disponibilita
     where user_id = $1 and data >= current_date
     order by data asc, ora_inizio asc`,
    [userId]
  );
  return rows;
}

const MESE_OK = /^\d{4}-(0[1-9]|1[0-2])$/;

function meseCorrente() {
  const o = new Date();
  return `${o.getFullYear()}-${String(o.getMonth() + 1).padStart(2, '0')}`;
}

function spostaMese(chiave, passi) {
  const [a, m] = chiave.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + passi, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function chiaveData(d) {
  return new Date(d).toISOString().slice(0, 10);
}

// Griglia del mese, settimane da lunedì a domenica, con le fasce appese al giorno giusto.
function costruisciMese(chiave, slots) {
  const [anno, mese] = chiave.split('-').map(Number);
  const perGiorno = {};
  for (const s of slots) {
    const k = chiaveData(s.data);
    (perGiorno[k] = perGiorno[k] || []).push(s);
  }

  const primo = new Date(Date.UTC(anno, mese - 1, 1));
  const vuotiIniziali = (primo.getUTCDay() + 6) % 7; // lunedì = 0
  const quanti = new Date(Date.UTC(anno, mese, 0)).getUTCDate();
  const oggi = chiaveData(new Date());

  const celle = [];
  for (let i = 0; i < vuotiIniziali; i++) celle.push(null);
  for (let g = 1; g <= quanti; g++) {
    const k = `${anno}-${String(mese).padStart(2, '0')}-${String(g).padStart(2, '0')}`;
    celle.push({ giorno: g, chiave: k, oggi: k === oggi, slots: perGiorno[k] || [] });
  }
  while (celle.length % 7 !== 0) celle.push(null);

  const settimane = [];
  for (let i = 0; i < celle.length; i += 7) settimane.push(celle.slice(i, i + 7));

  return {
    chiave,
    nome: primo.toLocaleDateString('it-IT', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    precedente: spostaMese(chiave, -1),
    successivo: spostaMese(chiave, 1),
    settimane
  };
}

async function meseDi(userId, chiave) {
  const { rows } = await pool.query(
    `select * from disponibilita
     where user_id = $1 and data >= $2::date and data < ($2::date + interval '1 month')
     order by data asc, ora_inizio asc`,
    [userId, chiave + '-01']
  );
  return costruisciMese(chiave, rows);
}

async function conversazione(dove, valore) {
  const { rows } = await pool.query(
    `select c.*, u.nome as tutor_nome, u.email as tutor_email, u.immagine_id as tutor_immagine
     from conversazioni c join users u on u.id = c.tutor_id
     where c.${dove} = $1`,
    [valore]
  );
  return rows[0] || null;
}

async function messaggiDi(conversazioneId) {
  const { rows } = await pool.query(
    'select * from messaggi where conversazione_id = $1 order by created_at asc',
    [conversazioneId]
  );
  return rows;
}

async function scriviMessaggio(c, autore, nome, testo) {
  const pulito = String(testo || '').trim().slice(0, 2000);
  if (!pulito) return null;
  const { rows } = await pool.query(
    'insert into messaggi (conversazione_id, autore, nome, testo) values ($1,$2,$3,$4) returning *',
    [c.id, autore, nome, pulito]
  );
  const campo = { genitore: 'visto_genitore', tutor: 'visto_tutor', coordinamento: 'visto_admin' }[autore];
  await pool.query(
    `update conversazioni set ultimo_messaggio = now(), ${campo} = now() where id = $1`,
    [c.id]
  );
  return rows[0];
}

async function segnaVisto(c, campo) {
  await pool.query(`update conversazioni set ${campo} = now() where id = $1`, [c.id]);
}

// Conversazioni con almeno un messaggio non ancora letto da chi guarda.
async function conversazioniPer({ tutorId, campoVisto }) {
  const cond = tutorId ? 'where c.tutor_id = $1' : '';
  const { rows } = await pool.query(
    `select c.*, u.nome as tutor_nome,
            (c.${campoVisto} is null or c.ultimo_messaggio > c.${campoVisto}) as da_leggere,
            (select testo from messaggi m where m.conversazione_id = c.id order by created_at desc limit 1) as ultimo_testo
     from conversazioni c join users u on u.id = c.tutor_id
     ${cond}
     order by c.ultimo_messaggio desc`,
    tutorId ? [tutorId] : []
  );
  return rows;
}

// Dopo un'azione torno dove chiede il modulo; se punta alla scheda di una tutor
// che non esiste più, torno al coordinamento invece di mostrare un errore.
async function ritornoSicuro(ritorno, tutorId) {
  if (ritorno === 'coordinamento') return '/area/coordinamento';
  if (tutorId) {
    const { rows } = await pool.query("select 1 from users where id = $1 and role = 'tutor'", [tutorId]);
    if (rows[0]) return `/area/coordinamento/tutor/${tutorId}`;
  }
  return '/area/coordinamento';
}

async function referenzeDi(tutorId, { tutte = false } = {}) {
  const { rows } = await pool.query(
    `select * from referenze
     where tutor_id = $1 ${tutte ? '' : "and stato = 'pubblicata'"}
     order by (stato = 'in_attesa') desc, created_at desc`,
    [tutorId]
  );
  const pubblicate = rows.filter((r) => r.stato === 'pubblicata');
  const media = pubblicate.length ? pubblicate.reduce((t, r) => t + r.stelle, 0) / pubblicate.length : 0;
  return {
    elenco: rows,
    pubblicate: pubblicate.length,
    inAttesa: rows.filter((r) => r.stato === 'in_attesa').length,
    media: Math.round(media * 10) / 10
  };
}

function dataBreve(d) {
  return new Date(d).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
}

function raggruppaPerData(slots) {
  const gruppi = [];
  for (const s of slots) {
    const chiave = s.data.toISOString().slice(0, 10);
    let g = gruppi.find((x) => x.chiave === chiave);
    if (!g) {
      g = { chiave, data: s.data, slots: [] };
      gruppi.push(g);
    }
    g.slots.push(s);
  }
  return gruppi;
}

async function salvaMansioni(userId, scelte) {
  const valide = [].concat(scelte || []).filter((m) => ID_MANSIONI.includes(m));
  await pool.query('delete from mansioni where user_id = $1', [userId]);
  for (const m of valide) {
    await pool.query('insert into mansioni (user_id, mansione) values ($1, $2) on conflict do nothing', [userId, m]);
  }
}

async function salvaMaterie(userId, testo) {
  const lista = String(testo || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
  await pool.query('delete from materie where user_id = $1', [userId]);
  for (const nome of lista) {
    await pool.query('insert into materie (user_id, nome) values ($1, $2)', [userId, nome]);
  }
}

// "15 €" se c'è solo il minimo, "15-20 €" se c'è anche il massimo.
function tariffaTesto(t) {
  if (t.tariffa === null || t.tariffa === undefined) return null;
  const da = Number(t.tariffa);
  const a = t.tariffa_max === null || t.tariffa_max === undefined ? null : Number(t.tariffa_max);
  const n = (x) => String(Math.round(x * 100) / 100).replace('.', ',');
  return a && a > da ? `${n(da)}–${n(a)} € l'ora` : `${n(da)} € l'ora`;
}

function tariffaValida(v) {
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 && n <= 999 ? n : null;
}

function tariffaMassima(min, max) {
  const a = tariffaValida(min);
  const b = tariffaValida(max);
  return a !== null && b !== null && b > a ? b : null;
}

/* ---------- pagine pubbliche ---------- */

app.get(
  '/',
  wrap(async (req, res) => {
    const sezioni = await sezioniHome({ soloAttive: !res.locals.modifica });
    const tutor = sezioni.some((s) => s.tipo === 'tutor') ? (await tutorPubblici()).slice(0, 6) : [];
    let articoli = [];
    if (sezioni.some((s) => s.tipo === 'articoli')) {
      const r = await pool.query('select * from articoli where pubblicato = true order by created_at desc limit 3');
      articoli = r.rows;
    }
    res.render('home', {
      titolo: res.locals.cfg.nome_sito,
      gruppi: raggruppaSezioni(sezioni),
      tutor,
      articoli
    });
  })
);

app.get(
  '/tutor',
  wrap(async (req, res) => {
    const mansione = req.query.mansione || '';
    const zona = (req.query.zona || '').trim();
    const giorno = req.query.giorno || '';
    const tutor = await tutorPubblici({ mansione, zona, giorno });
    res.render('elenco', { titolo: 'Le nostre tutor', tutor, mansione, zona, giorno });
  })
);

app.get(
  '/tutor/:id',
  wrap(async (req, res) => {
    const t = await tutorSingolo(req.params.id);
    if (!t || t.role !== 'tutor' || t.status !== 'approvato') {
      return res.status(404).render('errore', { titolo: 'Pagina non trovata', messaggio: 'Questa tutor non è disponibile.' });
    }
    const slots = (await disponibilitaFuture(t.id)).filter((s) => s.stato === 'libero');
    res.render('profilo-tutor', {
      titolo: t.nome,
      t,
      giorni: raggruppaPerData(slots),
      referenze: await referenzeDi(t.id),
      mansionePre: req.query.mansione || ''
    });
  })
);

app.post(
  '/tutor/:id/richiesta',
  wrap(async (req, res) => {
    const t = await tutorSingolo(req.params.id);
    if (!t || t.status !== 'approvato') return res.redirect('/tutor');
    if (robot(req)) return res.redirect(`/tutor/${t.id}`);

    const { genitore_nome, genitore_email, genitore_telefono, mansione, quando, messaggio } = req.body;
    if (!genitore_nome || !genitore_email || !ID_MANSIONI.includes(mansione)) {
      avvisa(req, 'Compila nome, email e tipo di aiuto per inviare la richiesta.', 'errore');
      return res.redirect(`/tutor/${t.id}`);
    }
    if (req.body.consenso !== 'si') {
      avvisa(req, 'Per mandare la richiesta serve il consenso al trattamento dei dati.', 'errore');
      return res.redirect(`/tutor/${t.id}`);
    }

    const email = genitore_email.trim().toLowerCase();
    const { rows } = await pool.query(
      `insert into richieste (tutor_id, genitore_nome, genitore_email, genitore_telefono, mansione, quando, messaggio, disponibilita_id)
       values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
      [
        t.id,
        genitore_nome.trim(),
        email,
        (genitore_telefono || '').trim(),
        mansione,
        (quando || '').trim(),
        (messaggio || '').trim(),
        /^\d+$/.test(String(req.body.disponibilita_id || '')) ? req.body.disponibilita_id : null
      ]
    );

    const token = crypto.randomBytes(24).toString('hex');
    const { rows: conv } = await pool.query(
      `insert into conversazioni (tutor_id, richiesta_id, genitore_nome, genitore_email, token)
       values ($1,$2,$3,$4,$5) returning id`,
      [t.id, rows[0].id, genitore_nome.trim(), email, token]
    );
    await pool.query(
      `insert into messaggi (conversazione_id, autore, nome, testo) values ($1,'genitore',$2,$3)`,
      [
        conv[0].id,
        genitore_nome.trim(),
        `Richiesta di ${labelMansione(mansione)}.` +
          ((quando || '').trim() ? `\nQuando: ${quando.trim()}` : '') +
          ((messaggio || '').trim() ? `\n\n${messaggio.trim()}` : '')
      ]
    );

    const cfg = await impostazioni();
    await invia({
      a: email,
      oggetto: `Abbiamo ricevuto la tua richiesta — ${cfg.nome_sito}`,
      titolo: 'Richiesta ricevuta',
      testo: `Ciao ${genitore_nome.trim()},\n\nabbiamo ricevuto la tua richiesta per ${labelMansione(mansione)} con ${t.nome}.\n\nDa questo link puoi scrivere direttamente a ${t.nome.split(' ')[0]} e vedere le sue risposte: tienilo da parte, è il tuo accesso alla conversazione. Anche il coordinamento la legge.`,
      azione: { testo: 'Apri la conversazione', link: urlAssoluto(req, `/chat/${token}`) },
      rispondiA: cfg.email_contatto
    });
    await avvisaAdmin({
      oggetto: `Nuova richiesta per ${t.nome}`,
      titolo: 'Nuova richiesta dal sito',
      testo: `${genitore_nome.trim()} (${email}${genitore_telefono ? ', ' + genitore_telefono.trim() : ''}) ha chiesto ${labelMansione(mansione)} con ${t.nome}.\n\nQuando: ${(quando || '—').trim()}\n\n${(messaggio || '').trim()}`,
      azione: { testo: 'Apri la conversazione', link: urlAssoluto(req, '/area/coordinamento/messaggi') },
      rispondiA: email
    });
    await invia({
      a: t.email,
      oggetto: `Nuova richiesta da ${genitore_nome.trim()}`,
      titolo: 'Ti hanno cercata',
      testo: `Ciao ${t.nome},\n\n${genitore_nome.trim()} ti ha chiesto ${labelMansione(mansione)}. Puoi risponderle dalla tua area, nella sezione Messaggi.\n\nIl coordinamento legge la conversazione.`,
      azione: { testo: 'Apri i messaggi', link: urlAssoluto(req, '/area/tutor/messaggi') }
    });

    req.session.mieChat = req.session.mieChat || [];
    if (!req.session.mieChat.includes(token)) req.session.mieChat.push(token);
    avvisa(req, `Richiesta inviata a ${t.nome}. Questa è la vostra conversazione: salva il link di questa pagina per tornarci.`);
    res.redirect(`/chat/${token}`);
  })
);

app.post(
  '/tutor/:id/referenza',
  wrap(async (req, res) => {
    const t = await tutorSingolo(req.params.id);
    if (!t || t.status !== 'approvato') return res.redirect('/tutor');

    if (robot(req)) return res.redirect(`/tutor/${t.id}`);

    const stelle = Math.min(5, Math.max(1, parseInt(req.body.stelle, 10) || 0));
    const commento = String(req.body.commento || '').trim().slice(0, 800);
    const autore = String(req.body.autore || '').trim().slice(0, 120);

    if (req.body.consenso !== 'si') {
      avvisa(req, 'Per lasciare una referenza serve il consenso al trattamento dei dati.', 'errore');
      return res.redirect(`/tutor/${t.id}#referenze`);
    }
    if (!autore || commento.length < 15) {
      avvisa(req, 'Serve il tuo nome e qualche parola in più nel commento.', 'errore');
      return res.redirect(`/tutor/${t.id}#referenze`);
    }

    // Una referenza per tutor a testa, per non riempire la pagina di doppioni.
    req.session.referenzeLasciate = req.session.referenzeLasciate || [];
    if (req.session.referenzeLasciate.includes(String(t.id))) {
      avvisa(req, 'Hai già lasciato una referenza per questa persona. Grazie!', 'errore');
      return res.redirect(`/tutor/${t.id}`);
    }

    await pool.query(
      `insert into referenze (tutor_id, autore, email, stelle, commento, stato, inserita_da)
       values ($1,$2,$3,$4,$5,'in_attesa','genitore')`,
      [t.id, autore, String(req.body.email || '').trim().toLowerCase().slice(0, 160), stelle, commento]
    );
    req.session.referenzeLasciate.push(String(t.id));
    await avvisaAdmin({
      oggetto: `Nuova referenza per ${t.nome}`,
      titolo: 'Referenza da approvare',
      testo: `${autore} ha lasciato ${stelle} stelle a ${t.nome}:\n\n"${commento}"`,
      azione: { testo: 'Approva o elimina', link: urlAssoluto(req, '/area/coordinamento') }
    });
    avvisa(req, 'Grazie! La referenza viene letta dal coordinamento e poi pubblicata sulla pagina.');
    res.redirect(`/tutor/${t.id}`);
  })
);

/* ---------- chat famiglia / tutor ---------- */

app.get(
  '/chat/:token',
  wrap(async (req, res) => {
    const c = await conversazione('token', req.params.token);
    if (!c) {
      return res.status(404).render('errore', {
        titolo: 'Conversazione non trovata',
        messaggio: 'Questo link non è valido. Controlla di aver copiato tutto l\'indirizzo dall\'email.'
      });
    }
    await segnaVisto(c, 'visto_genitore');
    res.render('chat', {
      titolo: `Conversazione con ${c.tutor_nome}`,
      linkGenitore: urlAssoluto(req, `/chat/${c.token}`),
      c,
      messaggi: await messaggiDi(c.id),
      chi: 'genitore'
    });
  })
);

app.post(
  '/chat/:token',
  wrap(async (req, res) => {
    const c = await conversazione('token', req.params.token);
    if (!c) return res.redirect('/');
    if (!c.aperta) {
      avvisa(req, 'Questa conversazione è stata chiusa dal coordinamento.', 'errore');
      return res.redirect(`/chat/${c.token}`);
    }
    const m = await scriviMessaggio(c, 'genitore', c.genitore_nome, req.body.testo);
    if (m) {
      await invia({
        a: c.tutor_email,
        oggetto: `Nuovo messaggio da ${c.genitore_nome}`,
        titolo: 'Nuovo messaggio',
        testo: `${c.genitore_nome} ti ha scritto:\n\n"${m.testo}"`,
        azione: { testo: 'Rispondi', link: urlAssoluto(req, `/area/tutor/messaggi/${c.id}`) }
      });
      await avvisaAdmin({
        oggetto: `Messaggio di ${c.genitore_nome} a ${c.tutor_nome}`,
        titolo: 'Nuovo messaggio nella chat',
        testo: `"${m.testo}"`,
        azione: { testo: 'Apri la conversazione', link: urlAssoluto(req, `/area/coordinamento/messaggi/${c.id}`) }
      });
    }
    res.redirect(`/chat/${c.token}`);
  })
);

/* ---------- candidatura tutor ---------- */

app.get('/lavora-con-noi', (req, res) => {
  res.render('candidatura', { titolo: 'Lavora con noi' });
});

app.post(
  '/lavora-con-noi',
  wrap(async (req, res) => {
    if (robot(req)) return res.redirect('/lavora-con-noi');

    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const nome = String(req.body.nome || '').trim();

    if (req.body.consenso !== 'si') {
      avvisa(req, 'Per candidarti serve il consenso al trattamento dei dati.', 'errore');
      return res.redirect('/lavora-con-noi');
    }
    if (!nome || !email.includes('@') || password.length < 8) {
      avvisa(req, 'Serve nome, email valida e una password di almeno 8 caratteri.', 'errore');
      return res.redirect('/lavora-con-noi');
    }
    const esiste = await pool.query('select 1 from users where email = $1', [email]);
    if (esiste.rowCount) {
      avvisa(req, 'Questa email è già registrata. Accedi con la tua password.', 'errore');
      return res.redirect('/accedi');
    }

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `insert into users (email, password_hash, role, status, nome, telefono, zona, bio, tariffa, tariffa_max)
       values ($1,$2,'tutor','in_attesa',$3,$4,$5,$6,$7,$8) returning id`,
      [
        email,
        hash,
        nome,
        String(req.body.telefono || '').trim(),
        String(req.body.zona || '').trim(),
        String(req.body.bio || '').trim().slice(0, 1200),
        tariffaValida(req.body.tariffa),
        tariffaMassima(req.body.tariffa, req.body.tariffa_max)
      ]
    );
    await salvaMansioni(rows[0].id, req.body.mansioni);
    await salvaMaterie(rows[0].id, req.body.materie);

    await avvisaAdmin({
      oggetto: `Nuova candidatura: ${nome}`,
      titolo: 'Nuova candidatura',
      testo: `${nome} (${email}) si è candidata dal sito.`,
      azione: { testo: 'Vedi la candidatura', link: urlAssoluto(req, `/area/coordinamento/tutor/${rows[0].id}`) },
      rispondiA: email
    });
    await invia({
      a: email,
      oggetto: 'Candidatura ricevuta',
      titolo: 'Grazie, ci siamo!',
      testo: `Ciao ${nome},\n\nabbiamo ricevuto la tua candidatura. La leggiamo e ti facciamo sapere: quando ti approviamo, la tua pagina diventa visibile alle famiglie.\n\nNel frattempo puoi completarla con materie, tariffa e disponibilità.`,
      azione: { testo: 'Entra nella tua pagina', link: urlAssoluto(req, '/accedi') }
    });

    req.session.userId = rows[0].id;
    avvisa(req, 'Candidatura ricevuta. Puoi già completare la tua pagina: sarà visibile dopo l\'approvazione.');
    res.redirect('/area/tutor');
  })
);

/* ---------- accesso ---------- */

app.get('/accedi', (req, res) => {
  if (req.utente) return res.redirect('/area');
  res.render('accedi', { titolo: 'Accedi' });
});

app.post(
  '/accedi',
  wrap(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const { rows } = await pool.query('select * from users where email = $1', [email]);
    const u = rows[0];
    if (!u || !(await bcrypt.compare(password, u.password_hash))) {
      avvisa(req, 'Email o password non corrispondono.', 'errore');
      return res.redirect('/accedi');
    }
    if (u.status === 'rifiutato') {
      avvisa(req, 'Questa candidatura non è stata accolta.', 'errore');
      return res.redirect('/accedi');
    }
    req.session.userId = u.id;
    res.redirect('/area');
  })
);

app.post('/esci', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

app.get('/password', (req, res) => {
  res.render('password-chiedi', { titolo: 'Password dimenticata' });
});

app.post(
  '/password',
  wrap(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const { rows } = await pool.query("select * from users where email = $1 and role = 'tutor'", [email]);
    // Rispondo sempre allo stesso modo: così non si scopre chi è registrata e chi no.
    if (rows[0]) {
      const token = crypto.randomBytes(32).toString('hex');
      await pool.query(
        "insert into reimposta (token, user_id, scadenza) values ($1, $2, now() + interval '2 hours')",
        [token, rows[0].id]
      );
      await invia({
        a: email,
        oggetto: 'Reimposta la tua password',
        titolo: 'Nuova password',
        testo: `Ciao ${rows[0].nome},\n\nhai chiesto di reimpostare la password. Il link vale due ore e si può usare una volta sola.\n\nSe non sei stata tu, ignora questa email: non cambia niente.`,
        azione: { testo: 'Scegli una nuova password', link: urlAssoluto(req, `/password/${token}`) }
      });
    }
    avvisa(req, 'Se quell\'email è registrata, ti è arrivato un link per reimpostare la password. Controlla anche lo spam.');
    res.redirect('/accedi');
  })
);

app.get(
  '/password/:token',
  wrap(async (req, res) => {
    const { rows } = await pool.query(
      'select * from reimposta where token = $1 and usato = false and scadenza > now()',
      [req.params.token]
    );
    if (!rows[0]) {
      return res.status(410).render('errore', {
        titolo: 'Link scaduto',
        messaggio: 'Questo link non è più valido. Chiedine un altro dalla pagina di accesso.'
      });
    }
    res.render('password-nuova', { titolo: 'Nuova password', token: req.params.token });
  })
);

app.post(
  '/password/:token',
  wrap(async (req, res) => {
    const password = String(req.body.password || '');
    const { rows } = await pool.query(
      'select * from reimposta where token = $1 and usato = false and scadenza > now()',
      [req.params.token]
    );
    if (!rows[0]) {
      avvisa(req, 'Link scaduto. Chiedine un altro.', 'errore');
      return res.redirect('/password');
    }
    if (password.length < 8) {
      avvisa(req, 'La password deve avere almeno 8 caratteri.', 'errore');
      return res.redirect(`/password/${req.params.token}`);
    }
    const hash = await bcrypt.hash(password, 12);
    await pool.query('update users set password_hash = $1 where id = $2', [hash, rows[0].user_id]);
    await pool.query('update reimposta set usato = true where token = $1', [req.params.token]);
    req.session.userId = rows[0].user_id;
    avvisa(req, 'Password aggiornata.');
    res.redirect('/area');
  })
);

app.get('/area', (req, res) => {
  if (!req.utente) return res.redirect('/accedi');
  res.redirect(req.utente.role === 'admin' ? '/area/coordinamento' : '/area/tutor');
});

/* ---------- area tutor ---------- */

app.get(
  '/area/tutor',
  soloTutor,
  wrap(async (req, res) => {
    const t = await tutorSingolo(req.utente.id);
    const slots = await disponibilitaFuture(t.id);
    const { rows: richieste } = await pool.query(
      `select * from richieste where tutor_id = $1 and stato <> 'chiusa' order by created_at desc`,
      [t.id]
    );
    const { rows: nonLetti } = await pool.query(
      `select count(*)::int as n from conversazioni
       where tutor_id = $1 and (visto_tutor is null or ultimo_messaggio > visto_tutor)`,
      [t.id]
    );
    const chiave = MESE_OK.test(req.query.mese || '') ? req.query.mese : meseCorrente();
    res.render('area-tutor', {
      messaggiNuovi: nonLetti[0].n,
      titolo: 'La mia pagina',
      t,
      giorni: raggruppaPerData(slots),
      mese: await meseDi(t.id, chiave),
      referenze: await referenzeDi(t.id, { tutte: true }),
      richieste
    });
  })
);

app.get(
  '/area/tutor/messaggi',
  soloTutor,
  wrap(async (req, res) => {
    res.render('messaggi-elenco', {
      titolo: 'Messaggi',
      conversazioni: await conversazioniPer({ tutorId: req.utente.id, campoVisto: 'visto_tutor' }),
      base: '/area/tutor/messaggi'
    });
  })
);

app.get(
  '/area/tutor/messaggi/:id',
  soloTutor,
  wrap(async (req, res) => {
    const c = await conversazione('id', req.params.id);
    if (!c || c.tutor_id !== req.utente.id) {
      return res.status(404).render('errore', { titolo: 'Non trovata', messaggio: 'Questa conversazione non è tua.' });
    }
    await segnaVisto(c, 'visto_tutor');
    res.render('chat', { titolo: `Conversazione con ${c.genitore_nome}`, linkGenitore: null, c, messaggi: await messaggiDi(c.id), chi: 'tutor' });
  })
);

app.post(
  '/area/tutor/messaggi/:id',
  soloTutor,
  wrap(async (req, res) => {
    const c = await conversazione('id', req.params.id);
    if (!c || c.tutor_id !== req.utente.id) return res.redirect('/area/tutor/messaggi');
    if (!c.aperta) {
      avvisa(req, 'Questa conversazione è chiusa.', 'errore');
      return res.redirect(`/area/tutor/messaggi/${c.id}`);
    }
    const m = await scriviMessaggio(c, 'tutor', req.utente.nome, req.body.testo);
    if (m && c.genitore_email) {
      await invia({
        a: c.genitore_email,
        oggetto: `${req.utente.nome} ti ha risposto`,
        titolo: 'Nuovo messaggio',
        testo: `"${m.testo}"`,
        azione: { testo: 'Apri la conversazione', link: urlAssoluto(req, `/chat/${c.token}`) }
      });
    }
    res.redirect(`/area/tutor/messaggi/${c.id}`);
  })
);

app.post(
  '/area/tutor/profilo',
  soloTutor,
  wrap(async (req, res) => {
    await pool.query(
      `update users set nome=$1, telefono=$2, zona=$3, bio=$4, tariffa=$5, tariffa_max=$6 where id=$7`,
      [
        String(req.body.nome || '').trim() || req.utente.nome,
        String(req.body.telefono || '').trim(),
        String(req.body.zona || '').trim(),
        String(req.body.bio || '').trim().slice(0, 1200),
        tariffaValida(req.body.tariffa),
        tariffaMassima(req.body.tariffa, req.body.tariffa_max),
        req.utente.id
      ]
    );
    await salvaMansioni(req.utente.id, req.body.mansioni);
    await salvaMaterie(req.utente.id, req.body.materie);
    avvisa(req, 'Pagina aggiornata.');
    res.redirect('/area/tutor');
  })
);

app.post(
  '/area/tutor/foto',
  soloTutor,
  riceviImmagine,
  wrap(async (req, res) => {
    if (req.erroreFile || !req.file) {
      avvisa(req, req.erroreFile || 'Scegli una foto prima di caricare.', 'errore');
      return res.redirect('/area/tutor');
    }
    if (!TIPI_IMMAGINE.includes(req.file.mimetype)) {
      avvisa(req, 'Vanno bene solo JPG, PNG, WEBP e GIF.', 'errore');
      return res.redirect('/area/tutor');
    }
    const { rows } = await pool.query(
      'insert into immagini (nome, tipo, peso, dati, alt) values ($1,$2,$3,$4,$5) returning id',
      [`foto di ${req.utente.nome}`, req.file.mimetype, req.file.size, req.file.buffer, `Foto di ${req.utente.nome}`]
    );
    await pool.query('update users set immagine_id = $1 where id = $2', [rows[0].id, req.utente.id]);
    avvisa(req, 'Foto aggiornata.');
    res.redirect('/area/tutor');
  })
);

app.post(
  '/area/tutor/foto/togli',
  soloTutor,
  wrap(async (req, res) => {
    await pool.query('update users set immagine_id = null where id = $1', [req.utente.id]);
    avvisa(req, 'Foto rimossa: torna il monogramma con le iniziali.');
    res.redirect('/area/tutor');
  })
);

app.post(
  '/area/tutor/disponibilita',
  soloTutor,
  wrap(async (req, res) => {
    const { data, ora_inizio, ora_fine, nota } = req.body;
    if (!data || !ora_inizio || !ora_fine || ora_fine <= ora_inizio) {
      avvisa(req, 'Indica giorno, ora di inizio e una fine successiva all\'inizio.', 'errore');
      return res.redirect('/area/tutor');
    }
    await pool.query(
      `insert into disponibilita (user_id, data, ora_inizio, ora_fine, nota, creata_da)
       values ($1,$2,$3,$4,$5,'tutor')`,
      [req.utente.id, data, ora_inizio, ora_fine, String(nota || '').trim().slice(0, 140)]
    );
    avvisa(req, 'Disponibilità aggiunta al calendario.');
    res.redirect('/area/tutor');
  })
);

app.post(
  '/area/tutor/disponibilita/:id/elimina',
  soloTutor,
  wrap(async (req, res) => {
    await pool.query('delete from disponibilita where id=$1 and user_id=$2', [req.params.id, req.utente.id]);
    avvisa(req, 'Disponibilità rimossa.');
    res.redirect('/area/tutor');
  })
);

/* ---------- area coordinamento (solo admin) ---------- */

app.get(
  '/area/coordinamento',
  soloAdmin,
  wrap(async (req, res) => {
    const { rows: tutte } = await pool.query(
      `${SELECT_TUTOR} where u.role = 'tutor' group by u.id order by u.created_at desc`
    );
    const { rows: richieste } = await pool.query(
      `select r.*, u.nome as tutor_nome,
              (select c.id from conversazioni c where c.richiesta_id = r.id) as conversazione_id
       from richieste r
       left join users u on u.id = r.tutor_id
       order by (r.stato = 'nuova') desc, r.created_at desc
       limit 100`
    );
    const { rows: refAttesa } = await pool.query(
      `select r.*, u.nome as tutor_nome from referenze r
       join users u on u.id = r.tutor_id
       where r.stato = 'in_attesa'
       order by r.created_at desc`
    );
    const { rows: fasceLibere } = await pool.query(
      `select id, user_id, data, ora_inizio, ora_fine
       from disponibilita
       where stato = 'libero' and data >= current_date
       order by data asc, ora_inizio asc`
    );
    const { rows: chatNuove } = await pool.query(
      `select count(*)::int as n from conversazioni
       where visto_admin is null or ultimo_messaggio > visto_admin`
    );
    res.render('area-admin', {
      titolo: 'Coordinamento',
      messaggiNuovi: chatNuove[0].n,
      fasceLibere,
      refAttesa,
      inAttesa: tutte.filter((t) => t.status === 'in_attesa'),
      attive: tutte.filter((t) => t.status === 'approvato'),
      altre: tutte.filter((t) => ['rifiutato', 'sospeso'].includes(t.status)),
      richieste,
      STATI_RICHIESTA
    });
  })
);

app.post(
  '/area/coordinamento/tutor/:id/stato',
  soloAdmin,
  wrap(async (req, res) => {
    const stato = req.body.stato;
    if (!STATI_UTENTE.includes(stato)) return res.redirect('/area/coordinamento');
    const { rows } = await pool.query(
      `update users set status=$1 where id=$2 and role='tutor' returning email, nome, status`,
      [stato, req.params.id]
    );
    if (rows[0] && stato === 'approvato') {
      await invia({
        a: rows[0].email,
        oggetto: 'La tua pagina è online',
        titolo: 'Sei stata approvata',
        testo: `Ciao ${rows[0].nome},\n\nla tua pagina è stata approvata: da ora le famiglie possono vederti e chiederti lezioni.\n\nControlla che materie, tariffa e disponibilità siano aggiornate, così ricevi richieste giuste.`,
        azione: { testo: 'Apri la tua pagina', link: urlAssoluto(req, '/area/tutor') }
      });
    }
    avvisa(req, stato === 'approvato' ? 'Tutor approvata: ora è visibile ai genitori (le è arrivata l\'email).' : `Stato aggiornato: ${stato.replace('_', ' ')}.`);
    res.redirect(req.body.ritorno || '/area/coordinamento');
  })
);

app.get(
  '/area/coordinamento/tutor/:id',
  soloAdmin,
  wrap(async (req, res) => {
    const t = await tutorSingolo(req.params.id);
    if (!t || t.role !== 'tutor') {
      return res.status(404).render('errore', { titolo: 'Non trovata', messaggio: 'Questa tutor non esiste.' });
    }
    const slots = await disponibilitaFuture(t.id);
    const { rows: richieste } = await pool.query(
      'select * from richieste where tutor_id=$1 order by created_at desc limit 30',
      [t.id]
    );
    const chiave = MESE_OK.test(req.query.mese || '') ? req.query.mese : meseCorrente();
    const { rows: ore } = await pool.query(
      `select coalesce(sum(extract(epoch from (ora_fine - ora_inizio)) / 3600), 0) as ore
       from disponibilita
       where user_id = $1 and stato = 'occupato'
         and data >= $2::date and data < ($2::date + interval '1 month')`,
      [t.id, chiave + '-01']
    );
    res.render('admin-tutor', {
      oreMese: Math.round(Number(ore[0].ore) * 10) / 10,
      titolo: `Scheda di ${t.nome}`,
      t,
      giorni: raggruppaPerData(slots),
      mese: await meseDi(t.id, chiave),
      referenze: await referenzeDi(t.id, { tutte: true }),
      richieste,
      STATI_UTENTE
    });
  })
);

app.post(
  '/area/coordinamento/tutor/:id',
  soloAdmin,
  wrap(async (req, res) => {
    const id = req.params.id;
    await pool.query(
      `update users set nome=$1, telefono=$2, zona=$3, bio=$4, tariffa=$5, tariffa_max=$6, nota_interna=$7
       where id=$8 and role='tutor'`,
      [
        String(req.body.nome || '').trim(),
        String(req.body.telefono || '').trim(),
        String(req.body.zona || '').trim(),
        String(req.body.bio || '').trim().slice(0, 1200),
        tariffaValida(req.body.tariffa),
        tariffaMassima(req.body.tariffa, req.body.tariffa_max),
        String(req.body.nota_interna || '').trim().slice(0, 600),
        id
      ]
    );
    await salvaMansioni(id, req.body.mansioni);
    await salvaMaterie(id, req.body.materie);
    avvisa(req, 'Scheda salvata.');
    res.redirect(`/area/coordinamento/tutor/${id}`);
  })
);

app.post(
  '/area/coordinamento/tutor/:id/disponibilita',
  soloAdmin,
  wrap(async (req, res) => {
    const { data, ora_inizio, ora_fine, nota, stato } = req.body;
    if (!data || !ora_inizio || !ora_fine || ora_fine <= ora_inizio) {
      avvisa(req, 'Indica giorno, ora di inizio e una fine successiva all\'inizio.', 'errore');
      return res.redirect(`/area/coordinamento/tutor/${req.params.id}`);
    }
    await pool.query(
      `insert into disponibilita (user_id, data, ora_inizio, ora_fine, nota, stato, creata_da)
       values ($1,$2,$3,$4,$5,$6,'coordinamento')`,
      [req.params.id, data, ora_inizio, ora_fine, String(nota || '').trim().slice(0, 140), stato === 'occupato' ? 'occupato' : 'libero']
    );
    avvisa(req, 'Calendario aggiornato.');
    res.redirect(`/area/coordinamento/tutor/${req.params.id}`);
  })
);

app.post(
  '/area/coordinamento/disponibilita/:id/stato',
  soloAdmin,
  wrap(async (req, res) => {
    const { rows } = await pool.query(
      `update disponibilita
       set stato = case when stato = 'libero' then 'occupato' else 'libero' end
       where id = $1 returning user_id`,
      [req.params.id]
    );
    res.redirect(rows[0] ? `/area/coordinamento/tutor/${rows[0].user_id}` : '/area/coordinamento');
  })
);

app.post(
  '/area/coordinamento/disponibilita/:id/elimina',
  soloAdmin,
  wrap(async (req, res) => {
    const { rows } = await pool.query('delete from disponibilita where id=$1 returning user_id', [req.params.id]);
    avvisa(req, 'Fascia rimossa dal calendario.');
    res.redirect(rows[0] ? `/area/coordinamento/tutor/${rows[0].user_id}` : '/area/coordinamento');
  })
);

app.post(
  '/area/coordinamento/richieste/:id/stato',
  soloAdmin,
  wrap(async (req, res) => {
    const stato = req.body.stato;
    if (!STATI_RICHIESTA.includes(stato)) return res.redirect('/area/coordinamento');

    const { rows } = await pool.query('select * from richieste where id = $1', [req.params.id]);
    const r = rows[0];
    if (!r) return res.redirect('/area/coordinamento');

    await pool.query('update richieste set stato = $1 where id = $2', [stato, r.id]);

    // La fascia scelta segue lo stato della richiesta: confermata = occupata.
    if (r.disponibilita_id) {
      const { rows: fasce } = await pool.query('select * from disponibilita where id = $1', [r.disponibilita_id]);
      const f = fasce[0];
      if (f) {
        const etichetta = `Famiglia ${r.genitore_nome}`;
        if (stato === 'confermata') {
          if (f.stato === 'occupato' && f.nota && f.nota !== etichetta) {
            avvisa(req, `Attenzione: quella fascia risulta già occupata da "${f.nota}". Controlla prima di confermare a tutte e due.`, 'errore');
          } else {
            await pool.query("update disponibilita set stato = 'occupato', nota = $1 where id = $2", [etichetta, f.id]);
            avvisa(req, `Confermata. Il ${dataBreve(f.data)} dalle ${String(f.ora_inizio).slice(0, 5)} è ora segnato occupato nel calendario di ${(await tutorSingolo(r.tutor_id) || {}).nome || 'lei'}.`);
          }
        } else if (f.nota === etichetta) {
          // Torno indietro solo sulle fasce che avevo occupato io per questa richiesta.
          await pool.query("update disponibilita set stato = 'libero', nota = '' where id = $1", [f.id]);
          avvisa(req, 'Fascia liberata nel calendario.');
        }
      }
    }

    if (stato === 'confermata') {
      const t = await tutorSingolo(r.tutor_id);
      const quando = r.disponibilita_id
        ? (await pool.query('select * from disponibilita where id = $1', [r.disponibilita_id])).rows[0]
        : null;
      const dettaglio = quando
        ? `${dataBreve(quando.data)} dalle ${String(quando.ora_inizio).slice(0, 5)} alle ${String(quando.ora_fine).slice(0, 5)}`
        : (r.quando || 'da concordare');
      if (r.genitore_email) {
        await invia({
          a: r.genitore_email,
          oggetto: 'Confermato',
          titolo: 'È confermato',
          testo: `Ciao ${r.genitore_nome},\n\n${labelMansione(r.mansione)} con ${t ? t.nome : 'la nostra collaboratrice'}: ${dettaglio}.\n\nSe qualcosa cambia scrivici, meglio con un po' di anticipo.`
        });
      }
      if (t) {
        await invia({
          a: t.email,
          oggetto: `Confermato con ${r.genitore_nome}`,
          titolo: 'Appuntamento confermato',
          testo: `Ciao ${t.nome},\n\nabbiamo confermato ${labelMansione(r.mansione)} con ${r.genitore_nome}: ${dettaglio}.\n\nL'ho già segnato come occupato nel tuo calendario.`,
          azione: { testo: 'Apri la tua pagina', link: urlAssoluto(req, '/area/tutor') }
        });
      }
    }

    if (!req.session.avviso) avvisa(req, 'Stato aggiornato.');
    res.redirect(req.body.ritorno || '/area/coordinamento');
  })
);

app.post(
  '/area/coordinamento/richieste/:id/fascia',
  soloAdmin,
  wrap(async (req, res) => {
    const valore = /^\d+$/.test(String(req.body.disponibilita_id || '')) ? req.body.disponibilita_id : null;
    await pool.query('update richieste set disponibilita_id = $1 where id = $2', [valore, req.params.id]);
    avvisa(req, valore ? 'Fascia collegata alla richiesta. Quando confermi, diventa occupata da sola.' : 'Fascia scollegata.');
    res.redirect('/area/coordinamento');
  })
);

/* ---------- pagine pubbliche: blog, pagine libere, privacy, immagini ---------- */

app.get(
  '/blog',
  wrap(async (req, res) => {
    const { rows } = await pool.query(
      'select * from articoli where pubblicato = true order by created_at desc limit 50'
    );
    res.render('blog', { titolo: res.locals.cfg.titolo_blog || 'Blog', articoli: rows });
  })
);

app.get(
  '/blog/:slug',
  wrap(async (req, res) => {
    const { rows } = await pool.query('select * from articoli where slug = $1', [req.params.slug]);
    const a = rows[0];
    const suo = req.utente && req.utente.role === 'admin';
    if (!a || (!a.pubblicato && !suo)) {
      return res.status(404).render('errore', { titolo: 'Articolo non trovato', messaggio: 'Questo articolo non esiste o non è ancora pubblicato.' });
    }
    res.render('articolo', { titolo: a.titolo, a });
  })
);

app.get('/privacy', (req, res) => {
  res.render('privacy', { titolo: 'Privacy' });
});

app.get(
  '/pagina/:slug',
  wrap(async (req, res) => {
    const { rows } = await pool.query('select * from pagine where slug = $1', [req.params.slug]);
    const p = rows[0];
    const suo = req.utente && req.utente.role === 'admin';
    if (!p || (!p.attiva && !suo)) {
      return res.status(404).render('errore', { titolo: 'Pagina non trovata', messaggio: 'Questa pagina non esiste o non è ancora pubblicata.' });
    }
    res.render('pagina', { titolo: p.titolo, p });
  })
);

app.get(
  '/immagini/:id',
  wrap(async (req, res) => {
    const { rows } = await pool.query('select tipo, dati from immagini where id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).end();
    res.set('Content-Type', rows[0].tipo);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(rows[0].dati);
  })
);

/* ---------- immagini (solo admin) ---------- */

app.get(
  '/area/coordinamento/immagini.json',
  soloAdmin,
  wrap(async (req, res) => {
    const { rows } = await pool.query('select id, nome from immagini order by created_at desc');
    res.json(rows);
  })
);

app.get(
  '/area/coordinamento/immagini',
  soloAdmin,
  wrap(async (req, res) => {
    const { rows } = await pool.query('select id, nome, tipo, peso, alt, created_at from immagini order by created_at desc');
    const { rows: spazio } = await pool.query('select coalesce(sum(peso), 0) as totale from immagini');
    res.render('admin-immagini', { titolo: 'Immagini', immagini: rows, totale: Number(spazio[0].totale) });
  })
);

app.post(
  '/area/coordinamento/immagini',
  soloAdmin,
  riceviImmagine,
  wrap(async (req, res) => {
    if (req.erroreFile) {
      avvisa(req, req.erroreFile, 'errore');
      return res.redirect('/area/coordinamento/immagini');
    }
    if (!req.file) {
      avvisa(req, 'Scegli un file prima di caricare.', 'errore');
      return res.redirect('/area/coordinamento/immagini');
    }
    if (!TIPI_IMMAGINE.includes(req.file.mimetype)) {
      avvisa(req, 'Vanno bene solo JPG, PNG, WEBP e GIF.', 'errore');
      return res.redirect('/area/coordinamento/immagini');
    }
    await pool.query('insert into immagini (nome, tipo, peso, dati, alt) values ($1,$2,$3,$4,$5)', [
      String(req.body.nome || req.file.originalname || 'immagine').trim().slice(0, 120),
      req.file.mimetype,
      req.file.size,
      req.file.buffer,
      String(req.body.alt || '').trim().slice(0, 300)
    ]);
    avvisa(req, 'Immagine caricata.');
    res.redirect('/area/coordinamento/immagini');
  })
);

app.post(
  '/area/coordinamento/immagini/:id/alt',
  soloAdmin,
  wrap(async (req, res) => {
    await pool.query('update immagini set alt = $1 where id = $2', [
      String(req.body.alt || '').trim().slice(0, 300),
      req.params.id
    ]);
    avvisa(req, 'Descrizione salvata.');
    res.redirect('/area/coordinamento/immagini');
  })
);

app.post(
  '/area/coordinamento/immagini/:id/elimina',
  soloAdmin,
  wrap(async (req, res) => {
    await pool.query('delete from immagini where id = $1', [req.params.id]);
    avvisa(req, 'Immagine eliminata. Dove era inserita, ora non compare più.');
    res.redirect('/area/coordinamento/immagini');
  })
);

/* ---------- aspetto ---------- */

app.get(
  '/area/coordinamento/aspetto',
  soloAdmin,
  wrap(async (req, res) => {
    const { rows: immagini } = await pool.query('select id, nome from immagini order by created_at desc');
    res.render('admin-aspetto', { titolo: 'Aspetto del sito', CAMPI_ASPETTO, GRUPPI_ASPETTO, immagini });
  })
);

app.post(
  '/area/coordinamento/aspetto',
  soloAdmin,
  wrap(async (req, res) => {
    for (const c of CAMPI_ASPETTO) {
      let v = String(req.body[c.chiave] == null ? '' : req.body[c.chiave]).trim();
      if (c.tipo === 'colore' && !/^#[0-9a-fA-F]{6}$/.test(v)) v = c.def;
      if (c.tipo === 'font' && !FONT[v]) v = c.def;
      if (c.tipo === 'scelta' && !Object.keys(c.opzioni).includes(v)) v = c.def;
      if (c.tipo === 'immagine' && !/^\d+$/.test(v)) v = '';
      if (c.tipo === 'testo') v = v.slice(0, 200);
      if (c.tipo === 'area') v = v.slice(0, 700);
      if (v === '' && c.tipo !== 'immagine') v = c.def;
      await pool.query(
        `insert into impostazioni (chiave, valore) values ($1, $2)
         on conflict (chiave) do update set valore = excluded.valore`,
        [c.chiave, v]
      );
    }
    await impostazioni(true);
    avvisa(req, 'Aspetto aggiornato. Apri la home per vederlo.');
    res.redirect('/area/coordinamento/aspetto');
  })
);

app.post(
  '/area/coordinamento/aspetto/ripristina',
  soloAdmin,
  wrap(async (req, res) => {
    await pool.query('delete from impostazioni');
    await impostazioni(true);
    avvisa(req, 'Ripristinati i colori e i testi di partenza.');
    res.redirect('/area/coordinamento/aspetto');
  })
);

/* ---------- blog: scrittura ---------- */

app.get(
  '/area/coordinamento/blog',
  soloAdmin,
  wrap(async (req, res) => {
    const { rows } = await pool.query('select * from articoli order by created_at desc');
    res.render('admin-blog', { titolo: 'Blog', articoli: rows });
  })
);

app.get(
  '/area/coordinamento/blog/nuovo',
  soloAdmin,
  wrap(async (req, res) => {
    const { rows: immagini } = await pool.query('select id, nome from immagini order by created_at desc');
    res.render('admin-articolo', {
      titolo: 'Nuovo articolo',
      a: { id: null, titolo: '', slug: '', sommario: '', corpo: '', pubblicato: false, immagine_id: null },
      immagini
    });
  })
);

app.post(
  '/area/coordinamento/blog',
  soloAdmin,
  wrap(async (req, res) => {
    const titolo = String(req.body.titolo || '').trim();
    if (!titolo) {
      avvisa(req, 'Serve almeno il titolo per salvare l\'articolo.', 'errore');
      return res.redirect('/area/coordinamento/blog/nuovo');
    }
    const slug = await slugLibero(req.body.slug || titolo);
    const { rows } = await pool.query(
      `insert into articoli (titolo, slug, sommario, corpo, pubblicato, immagine_id)
       values ($1,$2,$3,$4,$5,$6) returning id`,
      [titolo, slug, String(req.body.sommario || '').trim().slice(0, 300), String(req.body.corpo || ''), req.body.pubblicato === 'si', req.body.immagine_id || null]
    );
    avvisa(req, req.body.pubblicato === 'si' ? 'Articolo pubblicato.' : 'Bozza salvata: non è ancora visibile.');
    res.redirect(`/area/coordinamento/blog/${rows[0].id}`);
  })
);

app.get(
  '/area/coordinamento/blog/:id',
  soloAdmin,
  wrap(async (req, res) => {
    const { rows } = await pool.query('select * from articoli where id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).render('errore', { titolo: 'Non trovato', messaggio: 'Questo articolo non esiste.' });
    const { rows: immagini } = await pool.query('select id, nome from immagini order by created_at desc');
    res.render('admin-articolo', { titolo: rows[0].titolo, a: rows[0], immagini });
  })
);

app.post(
  '/area/coordinamento/blog/:id',
  soloAdmin,
  wrap(async (req, res) => {
    const titolo = String(req.body.titolo || '').trim();
    if (!titolo) {
      avvisa(req, 'Il titolo non può restare vuoto.', 'errore');
      return res.redirect(`/area/coordinamento/blog/${req.params.id}`);
    }
    const slug = await slugLibero(req.body.slug || titolo, req.params.id);
    await pool.query(
      `update articoli set titolo=$1, slug=$2, sommario=$3, corpo=$4, pubblicato=$5, immagine_id=$6, updated_at=now()
       where id=$7`,
      [titolo, slug, String(req.body.sommario || '').trim().slice(0, 300), String(req.body.corpo || ''), req.body.pubblicato === 'si', req.body.immagine_id || null, req.params.id]
    );
    avvisa(req, req.body.pubblicato === 'si' ? 'Articolo salvato e online.' : 'Salvato come bozza.');
    res.redirect(`/area/coordinamento/blog/${req.params.id}`);
  })
);

app.post(
  '/area/coordinamento/blog/:id/elimina',
  soloAdmin,
  wrap(async (req, res) => {
    await pool.query('delete from articoli where id = $1', [req.params.id]);
    avvisa(req, 'Articolo eliminato.');
    res.redirect('/area/coordinamento/blog');
  })
);

/* ---------- pagine libere (Chi siamo, domande frequenti) ---------- */

app.get(
  '/area/coordinamento/pagine',
  soloAdmin,
  wrap(async (req, res) => {
    const { rows } = await pool.query('select * from pagine order by ordine asc, id asc');
    res.render('admin-pagine', { titolo: 'Pagine', pagine: rows });
  })
);

app.post(
  '/area/coordinamento/pagine',
  soloAdmin,
  wrap(async (req, res) => {
    const titolo = String(req.body.titolo || '').trim();
    if (!titolo) {
      avvisa(req, 'Serve il titolo della pagina.', 'errore');
      return res.redirect('/area/coordinamento/pagine');
    }
    const base = slugify(titolo);
    let slug = base;
    for (let i = 2; i < 40; i++) {
      const c = await pool.query('select 1 from pagine where slug = $1', [slug]);
      if (!c.rowCount) break;
      slug = `${base}-${i}`;
    }
    const { rows: max } = await pool.query('select coalesce(max(ordine), 0) as m from pagine');
    const { rows } = await pool.query(
      'insert into pagine (slug, titolo, ordine) values ($1,$2,$3) returning id',
      [slug, titolo, Number(max[0].m) + 1]
    );
    res.redirect(`/area/coordinamento/pagine/${rows[0].id}`);
  })
);

app.get(
  '/area/coordinamento/pagine/:id',
  soloAdmin,
  wrap(async (req, res) => {
    const { rows } = await pool.query('select * from pagine where id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).render('errore', { titolo: 'Non trovata', messaggio: 'Questa pagina non esiste.' });
    res.render('admin-pagina', { titolo: rows[0].titolo, p: rows[0] });
  })
);

app.post(
  '/area/coordinamento/pagine/:id',
  soloAdmin,
  wrap(async (req, res) => {
    await pool.query(
      `update pagine set titolo=$1, corpo=$2, attiva=$3, nel_menu=$4, updated_at=now() where id=$5`,
      [
        String(req.body.titolo || '').trim().slice(0, 120),
        String(req.body.corpo || '').slice(0, 20000),
        req.body.attiva === 'si',
        req.body.nel_menu === 'si',
        req.params.id
      ]
    );
    await menuPagine(true);
    avvisa(req, req.body.attiva === 'si' ? 'Pagina salvata e online.' : 'Pagina salvata come bozza.');
    res.redirect('/area/coordinamento/pagine');
  })
);

app.post(
  '/area/coordinamento/pagine/:id/elimina',
  soloAdmin,
  wrap(async (req, res) => {
    await pool.query('delete from pagine where id = $1', [req.params.id]);
    await menuPagine(true);
    avvisa(req, 'Pagina eliminata.');
    res.redirect('/area/coordinamento/pagine');
  })
);

/* ---------- home: blocchi ---------- */

app.get(
  '/area/coordinamento/home',
  soloAdmin,
  wrap(async (req, res) => {
    res.render('admin-home', {
      titolo: 'Home',
      sezioni: await sezioniHome({ soloAttive: false }),
      TIPI_SEZIONE,
      LARGHEZZE
    });
  })
);

app.post(
  '/area/coordinamento/home/ordine',
  soloAdmin,
  wrap(async (req, res) => {
    const ordine = Array.isArray(req.body.ordine) ? req.body.ordine : [];
    const { rows } = await pool.query('select id from sezioni');
    const esistenti = new Set(rows.map((r) => String(r.id)));
    const puliti = ordine.map(String).filter((id) => esistenti.has(id));
    if (puliti.length !== rows.length) return res.status(400).json({ errore: 'ordine incompleto' });
    for (let i = 0; i < puliti.length; i++) {
      await pool.query('update sezioni set ordine = $1 where id = $2', [i + 1, puliti[i]]);
    }
    res.json({ ok: true });
  })
);

app.post(
  '/area/coordinamento/home/aggiungi',
  soloAdmin,
  wrap(async (req, res) => {
    const tipo = req.body.tipo;
    if (!TIPI_SEZIONE[tipo]) {
      avvisa(req, 'Scegli che tipo di blocco aggiungere.', 'errore');
      return res.redirect('/area/coordinamento/home');
    }
    const { rows: max } = await pool.query('select coalesce(max(ordine), 0) as m from sezioni');
    const { rows } = await pool.query(
      `insert into sezioni (tipo, titolo, ordine, attiva) values ($1, $2, $3, false) returning id`,
      [tipo, tipo === 'testo' ? 'Nuovo blocco' : '', Number(max[0].m) + 1]
    );
    if (req.body.ritorno === 'home') {
      await pool.query('update sezioni set attiva = true where id = $1', [rows[0].id]);
      avvisa(req, 'Blocco aggiunto in fondo alla home: cliccaci sopra per scriverlo.');
      return res.redirect('/?modifica=1');
    }
    avvisa(req, 'Blocco aggiunto in fondo, per ora spento: compilalo e accendilo.');
    res.redirect(`/area/coordinamento/home/${rows[0].id}`);
  })
);

app.get(
  '/area/coordinamento/home/:id',
  soloAdmin,
  wrap(async (req, res) => {
    const { rows } = await pool.query('select * from sezioni where id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).render('errore', { titolo: 'Non trovato', messaggio: 'Questo blocco non esiste.' });
    const { rows: immagini } = await pool.query('select id, nome from immagini order by created_at desc');
    res.render('admin-sezione', {
      titolo: 'Blocco della home',
      s: rows[0],
      immagini,
      TIPI_SEZIONE,
      POSIZIONI_FOTO,
      DIMENSIONI_FOTO,
      ALLINEAMENTI,
      DIMENSIONI_TITOLO,
      LARGHEZZE,
      VERTICALI
    });
  })
);

app.post(
  '/area/coordinamento/home/:id/campo',
  soloAdmin,
  wrap(async (req, res) => {
    const { campo, valore } = req.body;
    const ammessi = {
      titolo: () => String(valore || '').trim().slice(0, 160),
      corpo: () => String(valore || '').slice(0, 4000),
      larghezza: () => (LARGHEZZE[valore] ? valore : 'piena'),
      posizione: () => (POSIZIONI_FOTO[valore] ? valore : 'destra'),
      dimensione: () => (DIMENSIONI_FOTO[valore] ? valore : 'media'),
      allineamento: () => (ALLINEAMENTI[valore] ? valore : 'sinistra'),
      dimensione_titolo: () => (DIMENSIONI_TITOLO[valore] ? valore : 'normale'),
      vert: () => (VERTICALI[valore] ? valore : 'alto'),
      immagine_id: () => (/^\d+$/.test(String(valore || '')) ? valore : null)
    };
    if (!ammessi[campo]) return res.status(400).json({ errore: 'campo non modificabile' });
    const { rowCount } = await pool.query(`update sezioni set ${campo} = $1 where id = $2`, [ammessi[campo](), req.params.id]);
    if (!rowCount) return res.status(404).json({ errore: 'blocco non trovato' });
    res.json({ ok: true });
  })
);

app.post(
  '/area/coordinamento/home/:id',
  soloAdmin,
  wrap(async (req, res) => {
    await pool.query(
      `update sezioni set titolo=$1, corpo=$2, immagine_id=$3, testo_bottone=$4, link_bottone=$5,
                          larghezza=$6, attiva=$7, posizione=$8, dimensione=$9,
                          allineamento=$10, dimensione_titolo=$11, vert=$12
       where id=$13`,
      [
        String(req.body.titolo || '').trim().slice(0, 160),
        String(req.body.corpo || '').slice(0, 4000),
        req.body.immagine_id || null,
        String(req.body.testo_bottone || '').trim().slice(0, 60),
        String(req.body.link_bottone || '').trim().slice(0, 200),
        LARGHEZZE[req.body.larghezza] ? req.body.larghezza : 'piena',
        req.body.attiva === 'si',
        POSIZIONI_FOTO[req.body.posizione] ? req.body.posizione : 'destra',
        DIMENSIONI_FOTO[req.body.dimensione] ? req.body.dimensione : 'media',
        ALLINEAMENTI[req.body.allineamento] ? req.body.allineamento : 'sinistra',
        DIMENSIONI_TITOLO[req.body.dimensione_titolo] ? req.body.dimensione_titolo : 'normale',
        VERTICALI[req.body.vert] ? req.body.vert : 'alto',
        req.params.id
      ]
    );
    avvisa(req, req.body.attiva === 'si' ? 'Blocco salvato e visibile in home.' : 'Blocco salvato, per ora spento.');
    res.redirect('/area/coordinamento/home');
  })
);

app.post(
  '/area/coordinamento/home/:id/sposta',
  soloAdmin,
  wrap(async (req, res) => {
    const tutte = await sezioniHome({ soloAttive: false });
    const i = tutte.findIndex((x) => String(x.id) === String(req.params.id));
    const j = req.body.verso === 'su' ? i - 1 : i + 1;
    if (i === -1 || j < 0 || j >= tutte.length) return res.redirect('/area/coordinamento/home');
    const nuovo = tutte.slice();
    nuovo[i] = tutte[j];
    nuovo[j] = tutte[i];
    for (let k = 0; k < nuovo.length; k++) {
      await pool.query('update sezioni set ordine = $1 where id = $2', [k + 1, nuovo[k].id]);
    }
    res.redirect('/area/coordinamento/home');
  })
);

app.post(
  '/area/coordinamento/home/:id/accendi',
  soloAdmin,
  wrap(async (req, res) => {
    await pool.query('update sezioni set attiva = not attiva where id = $1', [req.params.id]);
    res.redirect(req.body.ritorno === 'home' ? '/?modifica=1' : '/area/coordinamento/home');
  })
);

app.post(
  '/area/coordinamento/home/:id/elimina',
  soloAdmin,
  wrap(async (req, res) => {
    await pool.query('delete from sezioni where id = $1', [req.params.id]);
    avvisa(req, 'Blocco eliminato.');
    res.redirect(req.body.ritorno === 'home' ? '/?modifica=1' : '/area/coordinamento/home');
  })
);

/* ---------- agenda della settimana ---------- */

app.get(
  '/area/coordinamento/agenda',
  soloAdmin,
  wrap(async (req, res) => {
    const base = /^\d{4}-\d{2}-\d{2}$/.test(req.query.dal || '') ? new Date(req.query.dal + 'T00:00:00Z') : new Date();
    const lunedi = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
    lunedi.setUTCDate(lunedi.getUTCDate() - ((lunedi.getUTCDay() + 6) % 7));
    const chiave = (d) => d.toISOString().slice(0, 10);

    const giorni = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(lunedi);
      d.setUTCDate(lunedi.getUTCDate() + i);
      giorni.push({ chiave: chiave(d), data: d, oggi: chiave(d) === chiave(new Date()) });
    }
    const fine = new Date(lunedi);
    fine.setUTCDate(lunedi.getUTCDate() + 7);

    const { rows: tutor } = await pool.query(
      `select id, nome, immagine_id from users where role = 'tutor' and status = 'approvato' order by nome asc`
    );
    const { rows: fasce } = await pool.query(
      `select * from disponibilita where data >= $1 and data < $2 order by ora_inizio asc`,
      [chiave(lunedi), chiave(fine)]
    );

    const per = {};
    for (const f of fasce) {
      const k = `${f.user_id}|${new Date(f.data).toISOString().slice(0, 10)}`;
      (per[k] = per[k] || []).push(f);
    }

    const prima = new Date(lunedi);
    prima.setUTCDate(lunedi.getUTCDate() - 7);

    res.render('admin-agenda', {
      titolo: 'Agenda della settimana',
      giorni,
      tutor,
      per,
      settimanaPrima: chiave(prima),
      settimanaDopo: chiave(fine),
      etichetta: `${dataBreve(lunedi)} – ${dataBreve(new Date(fine.getTime() - 86400000))}`,
      libere: fasce.filter((f) => f.stato === 'libero').length
    });
  })
);

/* ---------- chat: il coordinamento vede tutto ---------- */

app.get(
  '/area/coordinamento/messaggi',
  soloAdmin,
  wrap(async (req, res) => {
    res.render('messaggi-elenco', {
      titolo: 'Messaggi',
      conversazioni: await conversazioniPer({ campoVisto: 'visto_admin' }),
      base: '/area/coordinamento/messaggi'
    });
  })
);

app.get(
  '/area/coordinamento/messaggi/:id',
  soloAdmin,
  wrap(async (req, res) => {
    const c = await conversazione('id', req.params.id);
    if (!c) return res.status(404).render('errore', { titolo: 'Non trovata', messaggio: 'Questa conversazione non esiste.' });
    await segnaVisto(c, 'visto_admin');
    res.render('chat', {
      titolo: `${c.genitore_nome} e ${c.tutor_nome}`,
      linkGenitore: urlAssoluto(req, `/chat/${c.token}`),
      c,
      messaggi: await messaggiDi(c.id),
      chi: 'coordinamento'
    });
  })
);

app.post(
  '/area/coordinamento/messaggi/:id',
  soloAdmin,
  wrap(async (req, res) => {
    const c = await conversazione('id', req.params.id);
    if (!c) return res.redirect('/area/coordinamento/messaggi');
    const m = await scriviMessaggio(c, 'coordinamento', req.utente.nome || 'Coordinamento', req.body.testo);
    if (m) {
      if (c.genitore_email) {
        await invia({
          a: c.genitore_email,
          oggetto: 'Messaggio dal coordinamento',
          titolo: 'Nuovo messaggio',
          testo: `"${m.testo}"`,
          azione: { testo: 'Apri la conversazione', link: urlAssoluto(req, `/chat/${c.token}`) }
        });
      }
      await invia({
        a: c.tutor_email,
        oggetto: 'Messaggio dal coordinamento',
        titolo: 'Nuovo messaggio',
        testo: `"${m.testo}"`,
        azione: { testo: 'Apri i messaggi', link: urlAssoluto(req, `/area/tutor/messaggi/${c.id}`) }
      });
    }
    res.redirect(`/area/coordinamento/messaggi/${c.id}`);
  })
);

app.post(
  '/area/coordinamento/messaggi/:id/chiudi',
  soloAdmin,
  wrap(async (req, res) => {
    const { rows } = await pool.query(
      'update conversazioni set aperta = not aperta where id = $1 returning aperta',
      [req.params.id]
    );
    avvisa(req, rows[0] && rows[0].aperta ? 'Conversazione riaperta.' : 'Conversazione chiusa: nessuno può più scrivere.');
    res.redirect(`/area/coordinamento/messaggi/${req.params.id}`);
  })
);

app.post(
  '/area/coordinamento/messaggi/:id/rimanda',
  soloAdmin,
  wrap(async (req, res) => {
    const c = await conversazione('id', req.params.id);
    if (!c || !c.genitore_email) return res.redirect('/area/coordinamento/messaggi');
    const andata = await invia({
      a: c.genitore_email,
      oggetto: `Il link della conversazione con ${c.tutor_nome}`,
      titolo: 'Ecco il link',
      testo: `Ciao ${c.genitore_nome},\n\nda qui puoi scrivere a ${c.tutor_nome.split(' ')[0]} e vedere le risposte. Tienilo da parte: è il tuo accesso alla conversazione.`,
      azione: { testo: 'Apri la conversazione', link: urlAssoluto(req, `/chat/${c.token}`) }
    });
    avvisa(
      req,
      andata ? 'Link rimandato per email.' : 'Email non configurata: copia il link qui sotto e mandaglielo tu su WhatsApp.',
      andata ? 'ok' : 'errore'
    );
    res.redirect(`/area/coordinamento/messaggi/${c.id}`);
  })
);

app.post(
  '/area/coordinamento/richieste/:id/conversazione',
  soloAdmin,
  wrap(async (req, res) => {
    const { rows } = await pool.query('select * from richieste where id = $1', [req.params.id]);
    const r = rows[0];
    if (!r || !r.tutor_id) {
      avvisa(req, 'Questa richiesta non è collegata a nessuna ragazza.', 'errore');
      return res.redirect('/area/coordinamento');
    }
    const gia = await pool.query('select id from conversazioni where richiesta_id = $1', [r.id]);
    if (gia.rows[0]) return res.redirect(`/area/coordinamento/messaggi/${gia.rows[0].id}`);

    const token = crypto.randomBytes(24).toString('hex');
    const { rows: conv } = await pool.query(
      `insert into conversazioni (tutor_id, richiesta_id, genitore_nome, genitore_email, token)
       values ($1,$2,$3,$4,$5) returning id`,
      [r.tutor_id, r.id, r.genitore_nome, r.genitore_email, token]
    );
    await pool.query(
      `insert into messaggi (conversazione_id, autore, nome, testo) values ($1,'genitore',$2,$3)`,
      [conv[0].id, r.genitore_nome, `Richiesta di ${labelMansione(r.mansione)}.` + (r.quando ? `\nQuando: ${r.quando}` : '') + (r.messaggio ? `\n\n${r.messaggio}` : '')]
    );
    avvisa(req, 'Conversazione aperta: copia il link qui sotto e mandalo alla mamma su WhatsApp o per email.');
    res.redirect(`/area/coordinamento/messaggi/${conv[0].id}`);
  })
);

/* ---------- referenze ---------- */

app.post(
  '/area/coordinamento/tutor/:id/referenze',
  soloAdmin,
  wrap(async (req, res) => {
    const stelle = Math.min(5, Math.max(1, parseInt(req.body.stelle, 10) || 0));
    const commento = String(req.body.commento || '').trim().slice(0, 800);
    if (!commento) {
      avvisa(req, 'Scrivi il commento della referenza prima di salvarla.', 'errore');
      return res.redirect(`/area/coordinamento/tutor/${req.params.id}`);
    }
    await pool.query(
      `insert into referenze (tutor_id, autore, stelle, commento, stato, inserita_da)
       values ($1,$2,$3,$4,'pubblicata','coordinamento')`,
      [req.params.id, String(req.body.autore || '').trim().slice(0, 120), stelle, commento]
    );
    avvisa(req, 'Referenza aggiunta: ora si vede sulla sua pagina.');
    res.redirect(`/area/coordinamento/tutor/${req.params.id}`);
  })
);

app.post(
  '/area/coordinamento/referenze/:id/pubblica',
  soloAdmin,
  wrap(async (req, res) => {
    const { rows } = await pool.query(
      "update referenze set stato = 'pubblicata' where id = $1 returning tutor_id",
      [req.params.id]
    );
    if (!rows[0]) {
      avvisa(req, 'Quella referenza non esiste più: forse era già stata pubblicata o eliminata.', 'errore');
      return res.redirect('/area/coordinamento');
    }
    avvisa(req, 'Referenza pubblicata.');
    res.redirect(await ritornoSicuro(req.body.ritorno, rows[0].tutor_id));
  })
);

app.post(
  '/area/coordinamento/referenze/:id/elimina',
  soloAdmin,
  wrap(async (req, res) => {
    const { rows } = await pool.query('delete from referenze where id = $1 returning tutor_id', [req.params.id]);
    avvisa(req, rows[0] ? 'Referenza eliminata.' : 'Quella referenza non c\'era più.');
    res.redirect(rows[0] ? await ritornoSicuro(req.body.ritorno, rows[0].tutor_id) : '/area/coordinamento');
  })
);

/* ---------- account e copia dei dati ---------- */

app.post(
  '/area/coordinamento/coordinatori',
  soloAdmin,
  wrap(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email.includes('@') || password.length < 8) {
      avvisa(req, 'Serve un\'email valida e una password di almeno 8 caratteri.', 'errore');
      return res.redirect('/area/coordinamento');
    }
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      `insert into users (email, password_hash, role, status, nome)
       values ($1,$2,'admin','approvato',$3)
       on conflict (email) do update set password_hash = excluded.password_hash, role = 'admin', status = 'approvato'`,
      [email, hash, String(req.body.nome || '').trim() || 'Coordinamento']
    );
    avvisa(req, `${email} ora entra nel coordinamento con questa password.`);
    res.redirect('/area/coordinamento');
  })
);

app.get('/stato', (req, res) => {
  const mancanti = fileMancanti();
  res.json({
    versione: VERSIONE,
    node: process.version,
    file_attesi: FILE_ATTESI.length,
    file_mancanti: mancanti.length,
    elenco_mancanti: mancanti,
    rotte_attive: app._router.stack.filter((r) => r.route).length,
    esito: mancanti.length ? 'CARICAMENTO INCOMPLETO: mancano dei file' : 'tutti i file sono al loro posto'
  });
});

app.get('/versione', soloAdmin, (req, res) => res.json({ versione: VERSIONE, avviata: PROD ? 'produzione' : 'sviluppo' }));

app.get(
  '/area/coordinamento/esporta.json',
  soloAdmin,
  wrap(async (req, res) => {
    const q = async (sql) => (await pool.query(sql)).rows;
    const dati = {
      esportato: new Date().toISOString(),
      persone: await q('select id, email, role, status, nome, telefono, zona, bio, tariffa, tariffa_max, nota_interna, created_at from users'),
      mansioni: await q('select * from mansioni'),
      materie: await q('select * from materie'),
      disponibilita: await q('select * from disponibilita'),
      richieste: await q('select * from richieste'),
      referenze: await q('select * from referenze'),
      conversazioni: await q('select id, tutor_id, genitore_nome, genitore_email, aperta, created_at from conversazioni'),
      messaggi: await q('select * from messaggi'),
      articoli: await q('select * from articoli'),
      pagine: await q('select * from pagine'),
      sezioni: await q('select * from sezioni'),
      impostazioni: await q('select * from impostazioni'),
      immagini: await q('select id, nome, tipo, peso, alt, created_at from immagini')
    };
    res.setHeader('Content-Disposition', `attachment; filename="mykidacademy-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(dati);
  })
);


/* ---------- errori ---------- */

app.use((req, res) => {
  res.status(404).render('errore', { titolo: 'Pagina non trovata', messaggio: 'Il link che hai seguito non esiste più.' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('errore', {
    titolo: 'Errore',
    messaggio: 'Qualcosa non ha funzionato. Riprova tra un momento.'
  });
});

/* ---------- avvio ---------- */

async function assicuraAdmin() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!email || password.length < 8) {
    console.warn('ADMIN_EMAIL / ADMIN_PASSWORD non impostate: nessun account coordinamento creato.');
    return;
  }
  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    `insert into users (email, password_hash, role, status, nome)
     values ($1,$2,'admin','approvato',$3)
     on conflict (email) do update
       set password_hash = excluded.password_hash, role = 'admin', status = 'approvato'`,
    [email, hash, process.env.ADMIN_NOME || 'Coordinamento']
  );
  console.log(`Account coordinamento pronto: ${email}`);
}

async function assicuraSezioni() {
  const { rows } = await pool.query('select count(*)::int as n from sezioni');
  if (rows[0].n > 0) return;
  const partenza = [
    { tipo: 'mansioni', titolo: '', corpo: '', larghezza: 'piena' },
    { tipo: 'tutor', titolo: 'Chi collabora con noi', corpo: '', larghezza: 'piena' },
    {
      tipo: 'testo',
      titolo: 'Come funziona',
      corpo:
        'Scegli la persona e il tipo di aiuto, lasci un contatto e ti richiamiamo per fissare i primi appuntamenti. Il calendario di ogni ragazza è aggiornato da noi, così vedi solo le fasce davvero libere.\n\nPer qualsiasi cambio di orario o sostituzione parli sempre con noi, non con dieci persone diverse.',
      larghezza: 'meta'
    },
    {
      tipo: 'cta',
      titolo: 'Vuoi lavorare con noi?',
      corpo:
        'Cerchiamo ragazze precise e affidabili per ripetizioni, aiuto compiti, babysitting e aiuto in casa. Ti crei la tua pagina, indichi materie, tariffa e disponibilità: noi ti portiamo le famiglie.',
      larghezza: 'meta',
      bottone: 'Manda la candidatura',
      link: '/lavora-con-noi'
    }
  ];
  for (let i = 0; i < partenza.length; i++) {
    const p = partenza[i];
    await pool.query(
      `insert into sezioni (tipo, titolo, corpo, larghezza, testo_bottone, link_bottone, ordine, attiva)
       values ($1,$2,$3,$4,$5,$6,$7,true)`,
      [p.tipo, p.titolo, p.corpo, p.larghezza, p.bottone || '', p.link || '', i + 1]
    );
  }
  console.log('Blocchi della home creati.');
}

(async () => {
  await initDb();
  await assicuraAdmin();
  await assicuraSezioni();
  const mancanti = fileMancanti();
  if (mancanti.length) {
    console.error('=========================================================');
    console.error(`ATTENZIONE: mancano ${mancanti.length} file. Il caricamento su GitHub è incompleto.`);
    mancanti.forEach((f) => console.error('  manca: ' + f));
    console.error('=========================================================');
  } else {
    console.log(`Tutti i ${FILE_ATTESI.length} file sono al loro posto.`);
  }
  console.log(`Versione: ${VERSIONE}`);
  app.listen(PORT, () => console.log(`MyKidAcademy in ascolto sulla porta ${PORT}`));
})().catch((e) => {
  console.error('Avvio fallito:', e);
  process.exit(1);
});
