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
