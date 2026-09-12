require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const PgStore = require('connect-pg-simple')(session);
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { pool, initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const PROD = process.env.NODE_ENV === 'production';

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

const TIPI_SEZIONE = {
  testo: { nome: 'Testo', spiega: 'Un titolo e del testo, con immagine a fianco se vuoi.', campi: ['titolo', 'corpo', 'immagine', 'larghezza'] },
  immagine: { nome: 'Immagine', spiega: 'Una foto larga, con didascalia facoltativa.', campi: ['immagine', 'titolo'] },
  mansioni: { nome: 'Tessere dei servizi', spiega: 'I cinque riquadri: ripetizioni, compiti, babysitter, cucina, pulizia.', campi: ['titolo'] },
  tutor: { nome: 'Schede delle tutor', spiega: 'Le prime sei ragazze approvate, con il link a tutte.', campi: ['titolo'] },
  articoli: { nome: 'Ultimi articoli del blog', spiega: 'I tre articoli pubblicati più recenti.', campi: ['titolo'] },
  cta: { nome: 'Invito con pulsante', spiega: 'Titolo, testo e un pulsante che porta dove vuoi.', campi: ['titolo', 'corpo', 'testo_bottone', 'link_bottone', 'larghezza'] }
};

const RAGGI = { morbido: '18px', tondo: '28px', netto: '3px' };
const SCALE = { normale: '17px', grande: '19px' };
const IMPAGINAZIONI_BLOG = { elenco: 'Elenco semplice', schede: 'Schede con immagine', griglia: 'Griglia di riquadri' };

const CAMPI_ASPETTO = [
  { chiave: 'nome_sito', gruppo: 'Testi', label: 'Nome del sito', tipo: 'testo', def: 'MyKidAcademy' },
  { chiave: 'titolo_home', gruppo: 'Home', label: 'Titolo grande in home', tipo: 'area', def: 'Una persona di fiducia\nper quello che serve a casa.', aiuto: 'Dove vai a capo tu, va a capo anche il sito.' },
  { chiave: 'sottotitolo_home', gruppo: 'Home', label: 'Frase sotto il titolo', tipo: 'area', def: 'Selezioniamo noi le ragazze che collaborano con noi, una per una. Tu scegli di cosa hai bisogno, guardi chi è libera e ci pensiamo noi a organizzare.' },
  { chiave: 'email_contatto', gruppo: 'Testi', label: 'Email di contatto', tipo: 'testo', def: 'ciao@esempio.it' },
  { chiave: 'testo_piede', gruppo: 'Testi', label: 'Riga in fondo alle pagine', tipo: 'testo', def: 'ripetizioni, aiuto compiti, babysitter e aiuto in casa.' },

  { chiave: 'home_immagine', gruppo: 'Home', label: 'Immagine principale', tipo: 'immagine', def: '', aiuto: 'Si carica da Immagini. Lascia "Nessuna" per la home senza foto.' },
  { chiave: 'home_immagine_stile', gruppo: 'Home', label: 'Come si vede', tipo: 'scelta', opzioni: { accanto: 'Accanto al titolo', sotto: 'Larga sotto al titolo', sfondo: 'Come sfondo, col titolo sopra' }, def: 'accanto' },
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

  { chiave: 'titolo_blog', gruppo: 'Blog', label: 'Titolo della pagina blog', tipo: 'testo', def: 'Blog' },
  { chiave: 'sottotitolo_blog', gruppo: 'Blog', label: 'Frase sotto il titolo', tipo: 'area', def: 'Consigli, avvisi e cose che vale la pena raccontare ai genitori.' },
  { chiave: 'blog_impaginazione', gruppo: 'Blog', label: 'Come si vede l\'elenco', tipo: 'scelta', opzioni: IMPAGINAZIONI_BLOG, def: 'elenco' },
  { chiave: 'blog_data', gruppo: 'Blog', label: 'Mostrare la data', tipo: 'scelta', opzioni: { si: 'Sì', no: 'No' }, def: 'si' },
  { chiave: 'blog_copertina_grande', gruppo: 'Blog', label: 'Copertina a tutta larghezza nell\'articolo', tipo: 'scelta', opzioni: { si: 'Sì', no: 'No, piccola' }, def: 'si' },
  { chiave: 'colore_blog_sfondo', gruppo: 'Blog', label: 'Sfondo delle pagine del blog', tipo: 'colore', def: '#fff8fa' }
];

const GRUPPI_ASPETTO = ['Testi', 'Home', 'Caratteri', 'Colori', 'Forme', 'Blog'];

function scurisci(hex, quanto = 0.22) {
  const m = /^#([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return '#6f2a46';
  const n = parseInt(m[1], 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.round(v * (1 - quanto))));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

let cacheCfg = null;
let cacheCfgOra = 0;

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

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function avvisa(req, testo, tipo = 'ok') {
  req.session.avviso = { testo, tipo };
}

app.use(
  wrap(async (req, res, next) => {
    const cfg = await impostazioni();
    res.locals.cfg = cfg;
    res.locals.font = FONT[cfg.font];
    res.locals.FONT = FONT;
    res.locals.scurisci = scurisci;
    res.locals.RAGGI = RAGGI;
    res.locals.COLORI_TESTO = COLORI_TESTO;
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
    res.locals.percorso = req.path;
    res.locals.avviso = req.session.avviso || null;
    delete req.session.avviso;
    res.locals.utente = null;

    if (req.session.userId) {
      const { rows } = await pool.query('select * from users where id = $1', [req.session.userId]);
      if (rows[0]) {
        req.utente = rows[0];
        res.locals.utente = rows[0];
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
    coalesce(array_agg(distinct t.nome) filter (where t.nome is not null), '{}') as materie
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

// Due blocchi "metà" di fila stanno affiancati; tutto il resto va a piena larghezza.
function raggruppaSezioni(sezioni) {
  const gruppi = [];
  for (let i = 0; i < sezioni.length; i++) {
    const s = sezioni[i];
    const prossima = sezioni[i + 1];
    if (s.larghezza === 'meta' && prossima && prossima.larghezza === 'meta') {
      gruppi.push({ coppia: true, blocchi: [s, prossima] });
      i++;
    } else {
      gruppi.push({ coppia: false, blocchi: [s] });
    }
  }
  return gruppi;
}

async function tutorPubblici({ mansione, zona } = {}) {
  const cond = ["u.role = 'tutor'", "u.status = 'approvato'"];
  const vals = [];
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

function tariffaValida(v) {
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 && n <= 999 ? n : null;
}

/* ---------- pagine pubbliche ---------- */

app.get(
  '/',
  wrap(async (req, res) => {
    const sezioni = await sezioniHome();
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
    const tutor = await tutorPubblici({ mansione, zona });
    res.render('elenco', { titolo: 'Le nostre tutor', tutor, mansione, zona });
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
      mansionePre: req.query.mansione || ''
    });
  })
);

app.post(
  '/tutor/:id/richiesta',
  wrap(async (req, res) => {
    const t = await tutorSingolo(req.params.id);
    if (!t || t.status !== 'approvato') return res.redirect('/tutor');
    const { genitore_nome, genitore_email, genitore_telefono, mansione, quando, messaggio } = req.body;
    if (!genitore_nome || !genitore_email || !ID_MANSIONI.includes(mansione)) {
      avvisa(req, 'Compila nome, email e tipo di aiuto per inviare la richiesta.', 'errore');
      return res.redirect(`/tutor/${t.id}`);
    }
    await pool.query(
      `insert into richieste (tutor_id, genitore_nome, genitore_email, genitore_telefono, mansione, quando, messaggio)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [t.id, genitore_nome.trim(), genitore_email.trim().toLowerCase(), (genitore_telefono || '').trim(), mansione, (quando || '').trim(), (messaggio || '').trim()]
    );
    avvisa(req, `Richiesta inviata. Ti ricontattiamo noi per confermare con ${t.nome}.`);
    res.redirect(`/tutor/${t.id}`);
  })
);

/* ---------- candidatura tutor ---------- */

app.get('/lavora-con-noi', (req, res) => {
  res.render('candidatura', { titolo: 'Lavora con noi' });
});

app.post(
  '/lavora-con-noi',
  wrap(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const nome = String(req.body.nome || '').trim();

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
      `insert into users (email, password_hash, role, status, nome, telefono, zona, bio, tariffa)
       values ($1,$2,'tutor','in_attesa',$3,$4,$5,$6,$7) returning id`,
      [
        email,
        hash,
        nome,
        String(req.body.telefono || '').trim(),
        String(req.body.zona || '').trim(),
        String(req.body.bio || '').trim().slice(0, 1200),
        tariffaValida(req.body.tariffa)
      ]
    );
    await salvaMansioni(rows[0].id, req.body.mansioni);
    await salvaMaterie(rows[0].id, req.body.materie);

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
    res.render('area-tutor', { titolo: 'La mia pagina', t, giorni: raggruppaPerData(slots), richieste });
  })
);

app.post(
  '/area/tutor/profilo',
  soloTutor,
  wrap(async (req, res) => {
    await pool.query(
      `update users set nome=$1, telefono=$2, zona=$3, bio=$4, tariffa=$5 where id=$6`,
      [
        String(req.body.nome || '').trim() || req.utente.nome,
        String(req.body.telefono || '').trim(),
        String(req.body.zona || '').trim(),
        String(req.body.bio || '').trim().slice(0, 1200),
        tariffaValida(req.body.tariffa),
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
      `select r.*, u.nome as tutor_nome from richieste r
       left join users u on u.id = r.tutor_id
       order by (r.stato = 'nuova') desc, r.created_at desc
       limit 100`
    );
    res.render('area-admin', {
      titolo: 'Coordinamento',
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
    await pool.query(`update users set status=$1 where id=$2 and role='tutor'`, [stato, req.params.id]);
    avvisa(req, stato === 'approvato' ? 'Tutor approvata: ora è visibile ai genitori.' : `Stato aggiornato: ${stato.replace('_', ' ')}.`);
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
    res.render('admin-tutor', { titolo: `Scheda di ${t.nome}`, t, giorni: raggruppaPerData(slots), richieste, STATI_UTENTE });
  })
);

app.post(
  '/area/coordinamento/tutor/:id',
  soloAdmin,
  wrap(async (req, res) => {
    const id = req.params.id;
    await pool.query(
      `update users set nome=$1, telefono=$2, zona=$3, bio=$4, tariffa=$5, nota_interna=$6
       where id=$7 and role='tutor'`,
      [
        String(req.body.nome || '').trim(),
        String(req.body.telefono || '').trim(),
        String(req.body.zona || '').trim(),
        String(req.body.bio || '').trim().slice(0, 1200),
        tariffaValida(req.body.tariffa),
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
    if (!STATI_RICHIESTA.includes(req.body.stato)) return res.redirect('/area/coordinamento');
    await pool.query('update richieste set stato=$1 where id=$2', [req.body.stato, req.params.id]);
    res.redirect(req.body.ritorno || '/area/coordinamento');
  })
);

/* ---------- home: blocchi (solo admin) ---------- */

app.get(
  '/area/coordinamento/home',
  soloAdmin,
  wrap(async (req, res) => {
    res.render('admin-home', { titolo: 'Home', sezioni: await sezioniHome({ soloAttive: false }), TIPI_SEZIONE });
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
      [tipo, TIPI_SEZIONE[tipo].nome === 'Testo' ? 'Nuovo blocco' : '', Number(max[0].m) + 1]
    );
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
    res.render('admin-sezione', { titolo: 'Blocco della home', s: rows[0], immagini, TIPI_SEZIONE });
  })
);

app.post(
  '/area/coordinamento/home/:id',
  soloAdmin,
  wrap(async (req, res) => {
    await pool.query(
      `update sezioni set titolo=$1, corpo=$2, immagine_id=$3, testo_bottone=$4, link_bottone=$5,
                          larghezza=$6, attiva=$7
       where id=$8`,
      [
        String(req.body.titolo || '').trim().slice(0, 160),
        String(req.body.corpo || '').slice(0, 4000),
        req.body.immagine_id || null,
        String(req.body.testo_bottone || '').trim().slice(0, 60),
        String(req.body.link_bottone || '').trim().slice(0, 200),
        req.body.larghezza === 'meta' ? 'meta' : 'piena',
        req.body.attiva === 'si',
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
    // Riscrivo tutti gli ordini: così restano sempre consecutivi anche dopo le cancellazioni.
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
    res.redirect('/area/coordinamento/home');
  })
);

app.post(
  '/area/coordinamento/home/:id/elimina',
  soloAdmin,
  wrap(async (req, res) => {
    await pool.query('delete from sezioni where id = $1', [req.params.id]);
    avvisa(req, 'Blocco eliminato.');
    res.redirect('/area/coordinamento/home');
  })
);

/* ---------- immagini ---------- */

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

app.get(
  '/area/coordinamento/immagini',
  soloAdmin,
  wrap(async (req, res) => {
    const { rows } = await pool.query('select id, nome, tipo, peso, created_at from immagini order by created_at desc');
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
    await pool.query('insert into immagini (nome, tipo, peso, dati) values ($1,$2,$3,$4)', [
      String(req.body.nome || req.file.originalname || 'immagine').trim().slice(0, 120),
      req.file.mimetype,
      req.file.size,
      req.file.buffer
    ]);
    avvisa(req, 'Immagine caricata.');
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

/* ---------- blog pubblico ---------- */

app.get(
  '/blog',
  wrap(async (req, res) => {
    const { rows } = await pool.query(
      'select * from articoli where pubblicato = true order by created_at desc limit 50'
    );
    res.render('blog', { titolo: 'Blog', articoli: rows });
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

/* ---------- aspetto (solo admin) ---------- */

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

/* ---------- blog: scrittura (solo admin) ---------- */

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
  app.listen(PORT, () => console.log(`MyKidAcademy in ascolto sulla porta ${PORT}`));
})().catch((e) => {
  console.error('Avvio fallito:', e);
  process.exit(1);
});
