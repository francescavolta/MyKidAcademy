require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const PgStore = require('connect-pg-simple')(session);
const bcrypt = require('bcryptjs');
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

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function avvisa(req, testo, tipo = 'ok') {
  req.session.avviso = { testo, tipo };
}

app.use(
  wrap(async (req, res, next) => {
    res.locals.titolo = 'MyKidAcademy';
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
    const tutor = (await tutorPubblici()).slice(0, 6);
    res.render('home', { titolo: 'MyKidAcademy', tutor });
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

(async () => {
  await initDb();
  await assicuraAdmin();
  app.listen(PORT, () => console.log(`MyKidAcademy in ascolto sulla porta ${PORT}`));
})().catch((e) => {
  console.error('Avvio fallito:', e);
  process.exit(1);
});
