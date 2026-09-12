# MyKidAcademy — sito dell'agenzia

Sito con tre facce:

- **pubblica** — i genitori vedono le mansioni, sfogliano le ragazze approvate, aprono una pagina e mandano una richiesta (non devono registrarsi);
- **area tutor** — ogni ragazza entra con la sua email, compila materie, tariffa, zona, presentazione e il proprio calendario;
- **area coordinamento** — solo la tua email. Vedi le candidature, approvi o rifiuti, modifichi qualsiasi scheda, aggiungi o cambi le fasce nel calendario di chiunque, gestisci le richieste dei genitori.

Niente pagamenti online: il sito mette in contatto e tu organizzi.

Stack: Node.js + Express + PostgreSQL + pagine EJS. Nessun build step, nessun framework frontend.

---

## 1. Il codice deve stare su GitHub

Render non carica cartelle dal computer: legge il codice da GitHub. Quindi l'ordine è: GitHub prima, Render dopo. Non serve il terminale, si fa tutto dal browser.

1. Vai su **github.com** e crea un account (se non l'hai).
2. In alto a destra **+ → New repository**. Name: `mykidacademy`. Lascia **Public**, non spuntare "Add a README". **Create repository**.
3. Nella pagina che si apre clicca **uploading an existing file**.
4. Scompatta lo zip sul computer, apri la cartella e **trascina dentro il riquadro tutto quello che c'è dentro** (i file `server.js`, `db.js`, `package.json`… e le cartelle `views` e `public`). Non trascinare lo zip e non trascinare la cartella che li contiene: devono finire nella radice del repository.
5. In basso **Commit changes**.

Alla fine devi vedere `server.js`, `render.yaml`, `views`, `public` nella lista del repository.

## 2. Il pannello di Render

Il pannello è **dashboard.render.com** (non è un programma da scaricare: è un sito, ci entri col browser). Se l'account l'hai fatto con GitHub sei già collegato, altrimenti la prima volta ti chiede di autorizzare GitHub: accetta e dai accesso al repository `mykidacademy`.

## 3. Crea sito e database in un colpo solo

In questo progetto c'è il file `render.yaml`, che dice a Render cosa costruire. Così non devi creare il database a mano né cercare niente.

1. Nel pannello: **New → Blueprint**.
2. Scegli il repository `mykidacademy` → **Connect**.
3. Render ti mostra che creerà un servizio web e un database Postgres, e ti chiede due valori:
   - `ADMIN_EMAIL` → **la tua email**, è l'unico accesso al coordinamento
   - `ADMIN_PASSWORD` → una password tua, almeno 8 caratteri (scrivila da parte)
4. **Apply**. Da qui ci vogliono qualche minuto: quando il servizio è `Live`, in alto trovi il link `https://mykidacademy-qualcosa.onrender.com`.

Il database, la connessione, le tabelle e il tuo account admin si creano da soli. Non devi aprire il database e non devi scrivere nessun comando SQL.

Se Render si lamenta di un nome di piano (`plan:`) o della region, apri `render.yaml` su GitHub, clicca la matita per modificarlo e scrivimi l'errore esatto: te lo correggo.

## 4. I piani da scegliere

Due avvertenze, perché il gratis qui fa danni:

- Il **database gratuito** viene cancellato dopo un periodo limitato, e con lui tutte le candidature.
- Il **servizio web gratuito** si spegne quando nessuno lo usa: il primo genitore che apre il link aspetta mezzo minuto davanti a una pagina bianca.

Per provare va benissimo il gratis. Prima di mandare il link alle famiglie passa ai due piani a pagamento più piccoli (Settings → Change plan su entrambi). I prezzi cambiano, guardali nel pannello.

## 5. Se invece li crei a mano

Solo se il Blueprint non va: **New → Postgres** (name `mykidacademy-db`, region Frankfurt), poi **New → Web Service** sullo stesso repo con Build Command `npm ci`, Start Command `npm start`. Nel servizio web, tab **Environment**, aggiungi a mano: `DATABASE_URL` (la *Internal* Database URL che trovi nella pagina del database), `SESSION_SECRET` (una stringa lunga a caso), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NOME`, `NODE_ENV=production`.

## 6. Dopo il deploy

1. Apri `https://tuo-sito.onrender.com/accedi` ed entra con `ADMIN_EMAIL`.
2. Da un browser in incognito vai su **Lavora con noi** e registra una candidatura di prova.
3. Torna nel coordinamento: la vedi in "Candidature in attesa". Approvala e controlla che compaia sul sito pubblico.
4. Apri la sua scheda e prova ad aggiungere una fascia nel calendario.

## 7. Dominio tuo

Nel servizio web: **Settings → Custom Domains**, aggiungi il dominio e copia i record DNS che ti dà Render nel pannello di chi ti ha venduto il dominio. HTTPS è automatico.

---

## Provare in locale

```bash
cp .env.example .env      # metti dentro una DATABASE_URL valida
npm install
npm start                 # http://localhost:3000
```

Serve un PostgreSQL raggiungibile. Se usi quello di Render dall'esterno, prendi la **External** Database URL e aggiungi `DATABASE_SSL=true`.

## Dove mettere le mani

| File | Cosa contiene |
|---|---|
| `server.js` | tutte le pagine e i permessi. Le mansioni sono l'array `MANSIONI` in cima: aggiungine una e compare in tutto il sito |
| `db.js` | tabelle del database |
| `public/style.css` | colori (`:root` in cima), tipografia, layout |
| `views/admin-aspetto.ejs` | la pagina "Aspetto del sito" nel coordinamento |
| `views/` | le pagine. `partials/campi-tutor.ejs` è il modulo condiviso tra candidatura, area tutor e scheda del coordinamento |

## Aspetto, immagini e blog

In cima all'area coordinamento ci sono tre scorciatoie.

**Aspetto del sito**, in cinque gruppi:

| Gruppo | Cosa cambi |
|---|---|
| Testi | nome del sito, email di contatto, riga in fondo |
| Home | titolo e frase, immagine principale con tre modi di mostrarla (accanto al titolo, larga sotto, come sfondo col titolo sopra), seconda immagine in fondo |
| Caratteri | dieci coppie di caratteri, dimensione del testo (normale o grande) |
| Colori | sfondo pagine, sfondo barra, riquadri, bordi, titoli, pulsanti, testo, testo secondario |
| Forme | angoli dei riquadri (morbidi, molto tondi, netti), ombre sì/no |
| Blog | titolo e frase della pagina blog, impaginazione dell'elenco (elenco, schede, griglia), data sì/no, copertina grande o piccola, sfondo solo per le pagine del blog |

C'è "Ripristina tutto come all'inizio". Tutto sta nella tabella `impostazioni`: cambiare aspetto non richiede un deploy.

**Immagini** — carica JPG, PNG, WEBP o GIF fino a 3 MB. Stanno nel database (tabella `immagini`, colonna `bytea`) e non nel disco del servizio, che su Render si azzera a ogni deploy. Ogni immagine mostra il suo codice `[img:N]`. La pagina indica anche quanti MB stai occupando: controllalo, lo spazio del piano Postgres non è infinito.

**Blog** — bozza o online, con barra dei bottoni (Titolo, Titolo piccolo, G, C, Elenco, Link, Inserisci immagine) e anteprima dal vivo sotto il campo di scrittura. I bottoni scrivono dei segni nel testo, che il server trasforma in HTML:

| Nel campo | Nella pagina |
|---|---|
| `## Testo` | sottotitolo |
| `### Testo` | sottotitolo piccolo |
| `**testo**` | grassetto |
| `*testo*` | corsivo |
| `- voce` | elenco puntato |
| `[testo](https://…)` | link |
| `[img:3]` o `[img:3\|didascalia]` | immagine |

Ogni riga è valutata da sola, quindi un titolo funziona anche con il testo attaccato sotto. Ogni articolo può avere una copertina scelta dalla libreria. La conversione sta in `corpoHtml` (`server.js`); l'anteprima nel browser ripete le stesse regole in `public/editor.js` — se cambi una regola, cambiala in entrambi.

Per aggiungere una coppia di caratteri: array `FONT` in cima a `server.js`. Per aggiungere una voce modificabile: `CAMPI_ASPETTO`, accanto — i tipi sono `testo`, `area`, `colore`, `font`, `scelta`.

## Prossimi pezzi, quando servono

- **Email automatiche** (avviso quando arriva una candidatura o una richiesta): un servizio tipo Resend, ~20 righe in `server.js`.
- **Foto delle ragazze**: ora c'è il monogramma con le iniziali. Si può usare la stessa libreria immagini del blog.
- **Rimpicciolire le immagini al caricamento**: oggi il limite è 3 MB e ridimensioni tu. Con `sharp` si fa lato server.
- **Recupero password**: oggi la reimposti tu dal coordinamento (o la ragazza si registra di nuovo). Con le email diventa automatico.
- **Calendario a griglia mensile**: ora è un'agenda per giorno, più leggibile su telefono.
