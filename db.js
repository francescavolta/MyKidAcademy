const { Pool } = require('pg');

const url = process.env.DATABASE_URL || '';

// Su Render: la Internal Database URL non usa SSL, quella External sì.
// L'hostname interno non contiene punti, quindi lo distinguiamo così.
function ssl() {
  if (process.env.DATABASE_SSL === 'false') return false;
  if (process.env.DATABASE_SSL === 'true') return { rejectUnauthorized: false };
  return /\.render\.com|sslmode=require/.test(url) ? { rejectUnauthorized: false } : false;
}

const pool = new Pool({ connectionString: url, ssl: ssl(), max: 8 });

const SCHEMA = `
create table if not exists users (
  id            serial primary key,
  email         text unique not null,
  password_hash text not null,
  role          text not null default 'tutor',   -- 'admin' | 'tutor'
  status        text not null default 'in_attesa', -- 'in_attesa' | 'approvato' | 'rifiutato' | 'sospeso'
  nome          text not null default '',
  telefono      text not null default '',
  zona          text not null default '',
  bio           text not null default '',
  tariffa       numeric(6,2),
  nota_interna  text not null default '',
  created_at    timestamptz not null default now()
);

create table if not exists mansioni (
  user_id  integer not null references users(id) on delete cascade,
  mansione text not null,
  primary key (user_id, mansione)
);

create table if not exists materie (
  id      serial primary key,
  user_id integer not null references users(id) on delete cascade,
  nome    text not null
);

create table if not exists disponibilita (
  id         serial primary key,
  user_id    integer not null references users(id) on delete cascade,
  data       date not null,
  ora_inizio time not null,
  ora_fine   time not null,
  stato      text not null default 'libero',  -- 'libero' | 'occupato'
  nota       text not null default '',
  creata_da  text not null default 'tutor',   -- 'tutor' | 'coordinamento'
  created_at timestamptz not null default now()
);
create index if not exists disponibilita_user_data on disponibilita (user_id, data);

create table if not exists impostazioni (
  chiave text primary key,
  valore text not null default ''
);

create table if not exists immagini (
  id         serial primary key,
  nome       text not null,
  tipo       text not null,
  peso       integer not null default 0,
  dati       bytea not null,
  created_at timestamptz not null default now()
);

create table if not exists articoli (
  id         serial primary key,
  titolo     text not null,
  slug       text unique not null,
  sommario   text not null default '',
  corpo      text not null default '',
  pubblicato boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists articoli_pubblicati on articoli (pubblicato, created_at desc);
alter table articoli add column if not exists immagine_id integer references immagini(id) on delete set null;

create table if not exists referenze (
  id         serial primary key,
  tutor_id   integer not null references users(id) on delete cascade,
  autore     text not null default '',
  stelle     integer not null default 5,
  commento   text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists referenze_tutor on referenze (tutor_id, created_at desc);
alter table referenze add column if not exists stato text not null default 'pubblicata';
alter table referenze add column if not exists email text not null default '';
alter table referenze add column if not exists inserita_da text not null default 'coordinamento';

create table if not exists sezioni (
  id            serial primary key,
  tipo          text not null,
  titolo        text not null default '',
  corpo         text not null default '',
  immagine_id   integer references immagini(id) on delete set null,
  testo_bottone text not null default '',
  link_bottone  text not null default '',
  larghezza     text not null default 'piena',
  attiva        boolean not null default true,
  ordine        integer not null default 0
);
create index if not exists sezioni_ordine on sezioni (ordine);
alter table sezioni add column if not exists posizione text not null default 'destra';
alter table sezioni add column if not exists dimensione text not null default 'media';
alter table sezioni add column if not exists allineamento text not null default 'sinistra';
alter table sezioni add column if not exists dimensione_titolo text not null default 'normale';
alter table sezioni add column if not exists vert text not null default 'alto';

create table if not exists richieste (
  id                serial primary key,
  tutor_id          integer references users(id) on delete set null,
  genitore_nome     text not null,
  genitore_email    text not null,
  genitore_telefono text not null default '',
  mansione          text not null,
  quando            text not null default '',
  messaggio         text not null default '',
  stato             text not null default 'nuova', -- 'nuova' | 'in_corso' | 'confermata' | 'chiusa'
  created_at        timestamptz not null default now()
);
`;

async function initDb() {
  await pool.query(SCHEMA);
}

module.exports = { pool, initDb };
