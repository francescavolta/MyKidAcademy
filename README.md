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

## Calendario e referenze

**Calendario a griglia** — nell'area tutor e nella scheda del coordinamento, sopra l'agenda per giorno (che resta). Griglia del mese da lunedì a domenica, frecce per cambiare mese (`?mese=2026-10`), fasce verdi se libere e rosse se occupate, bordo sul giorno di oggi. La griglia la costruisce `costruisciMese()` in `server.js`, la disegna `views/partials/calendario.ejs` — si riusa passando `mese` e `base` (l'indirizzo su cui puntano le frecce).

**Referenze** — tabella `referenze` (tutor, firma, email, stelle 1-5, commento, `stato`, `inserita_da`).

Le scrivono le famiglie dal modulo sulla pagina pubblica della tutor (`POST /tutor/:id/referenza`). Arrivano con `stato = 'in_attesa'` e non si vedono da nessuna parte fino a quando il coordinamento non le pubblica: l'elenco di quelle da approvare sta in cima all'area coordinamento, e ognuna ha Pubblica / Elimina. Il coordinamento può anche inserirne una a mano dalla scheda della tutor (per quelle arrivate a voce): quella nasce già pubblicata.

Controlli sul modulo pubblico: firma obbligatoria, commento di almeno 15 caratteri, una referenza per tutor per sessione, email facoltativa e mai mostrata al pubblico. La moderazione resta la difesa vera.

Il riquadro (`views/partials/referenze.ejs`) non compare se non c'è niente da mostrare. Media e numero, calcolati sulle sole pubblicate in `SELECT_TUTOR`, appaiono in cima al profilo e sulle schede in elenco.

## Aspetto, immagini e blog

In cima all'area coordinamento ci sono tre scorciatoie.

**Aspetto del sito**, in cinque gruppi:

| Gruppo | Cosa cambi |
|---|---|
| Testi | nome del sito, email di contatto, riga in fondo |
| Home | titolo e frase, allineamento del titolo, immagine principale con tre modi di mostrarla (accanto al titolo, larga sotto, come sfondo col titolo sopra) e tre grandezze, scritta del link al blog |
| Caratteri | dieci coppie di caratteri, dimensione del testo (normale o grande) |
| Colori | sfondo pagine, sfondo barra, riquadri, bordi, titoli, pulsanti, testo, testo secondario |
| Forme | angoli dei riquadri (morbidi, molto tondi, netti), ombre sì/no |
| Blog | titolo e frase della pagina blog, impaginazione dell'elenco (elenco, schede, griglia), data sì/no, copertina grande o piccola, sfondo solo per le pagine del blog |

C'è "Ripristina tutto come all'inizio". Tutto sta nella tabella `impostazioni`: cambiare aspetto non richiede un deploy.

**Home, modifica in pagina** — da amministratore, in fondo alla home c'è "Modifica questa home" (`/?modifica=1`). In quella modalità i blocchi sono contornati, compresi quelli spenti, e ognuno ha la sua barretta: presa per **trascinarlo** dove vuoi, "Scrivi" per cambiare titolo e testo sul posto, un pulsante che cicla la **larghezza**, uno per scegliere l'**immagine**, uno per la **posizione della foto**, uno per l'**allineamento verticale**, più Spegni, Elimina e "Tutto" (che apre la scheda completa). In cima, una barra per aggiungere un blocco e uscire.

Ogni modifica passa da `POST /area/coordinamento/home/:id/campo` (JSON, whitelist dei campi ammessi) o da `POST /area/coordinamento/home/ordine` (JSON, elenco completo degli id), poi **la pagina si ricarica**: la resa è sempre quella vera del server, mai un'anteprima costruita nel browser. Il codice sta in `public/modifica-home.js`.

**Home** — la home è il titolo in cima (che si cambia da Aspetto) più una pila di blocchi riordinabili, nella tabella `sezioni`. Ogni blocco si sposta con ↑ ↓, si spegne senza cancellarlo, si modifica e si elimina. I tipi sono in `TIPI_SEZIONE` (`server.js`):

| Tipo | Cosa mostra |
|---|---|
| Testo | titolo e testo, con immagine a fianco se scelta |
| Immagine | una foto larga con didascalia |
| Tessere dei servizi | i cinque riquadri delle mansioni |
| Schede delle tutor | le prime sei approvate, col link a tutte |
| Ultimi articoli del blog | i tre articoli pubblicati più recenti |
| Invito con pulsante | titolo, testo e un pulsante verso una pagina |

Ogni blocco, oltre ai suoi contenuti, ha i comandi di impaginazione:

| Comando | Valori | Colonna |
|---|---|---|
| Dove sta l'immagine | a destra, a sinistra, sopra, sotto il testo | `posizione` |
| Quanto grande (immagine) | piccola, media, grande, tutta la larghezza | `dimensione` |
| Allineamento del testo | a sinistra, centrato, a destra | `allineamento` |
| Grandezza del titolo | piccolo, normale, grande | `dimensione_titolo` |
| Larghezza del blocco | tutta, tre quarti, due terzi, metà, un terzo, un quarto | `larghezza` |
| Posizione nella riga | in alto, al centro, in basso | `vert` |

Sono classi CSS (`foto--sinistra`, `fig--piccola`, `all--centro`, `tit--grande`) definite in fondo a `style.css`: per aggiungere un valore, va messo nell'elenco corrispondente in `server.js` (`POSIZIONI_FOTO`, `DIMENSIONI_FOTO`, `ALLINEAMENTI`, `DIMENSIONI_TITOLO`) e gli va scritta la regola CSS. Le larghezze sono in dodicesimi (`LARGHEZZE` in `server.js`). `raggruppaSezioni()` mette in fila i blocchi consecutivi finché la somma sta in 12: due da 6 fanno una riga da due, tre da 4 una riga da tre, 8 + 4 una riga sbilanciata. Se una riga resta incompleta, le colonne della griglia diventano la sua somma, così riempie comunque la larghezza mantenendo le proporzioni. Sotto i 760 px tutto torna in colonna singola e l'immagine va sopra il testo: su telefono le colonne affiancate sono illeggibili. I blocchi di partenza (che riproducono la home originale) vengono creati al primo avvio da `assicuraSezioni()` e solo se la tabella è vuota.

**Immagini** — JPG, PNG, WEBP o GIF. Il browser rimpicciolisce il file prima di spedirlo (lato lungo 1800 px, JPEG qualità 0.82, in `public/carica-immagine.js`): una foto da 6 MB arriva a qualche centinaio di KB. Le GIF e i file sotto 900 KB passano intatti. Il limite del server è 12 MB (`MAX_IMMAGINE` in `server.js`), ed è solo una rete di sicurezza. Le immagini stanno nel database (tabella `immagini`, colonna `bytea`), non nel disco del servizio, che su Render si azzera a ogni deploy. Ogni immagine mostra il suo codice `[img:N]`. Tieni d'occhio i MB occupati indicati in cima all'elenco.

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
| `{verde:testo}` | testo colorato (`tema`, `rosa`, `rosso`, `arancio`, `giallo`, `verde`, `blu`, `viola`, `grigio` — tavolozza `COLORI_TESTO` in `server.js`) |

Ogni riga è valutata da sola, quindi un titolo funziona anche con il testo attaccato sotto. Ogni articolo può avere una copertina scelta dalla libreria. La conversione sta in `corpoHtml` (`server.js`); l'anteprima nel browser ripete le stesse regole in `public/editor.js` — se cambi una regola, cambiala in entrambi.

Per aggiungere una coppia di caratteri: array `FONT` in cima a `server.js`. Per aggiungere una voce modificabile: `CAMPI_ASPETTO`, accanto — i tipi sono `testo`, `area`, `colore`, `font`, `scelta`.

## Prossimi pezzi, quando servono

- **Email automatiche** (avviso quando arriva una candidatura o una richiesta): un servizio tipo Resend, ~20 righe in `server.js`.
- **Foto delle ragazze**: ora c'è il monogramma con le iniziali. Si può usare la stessa libreria immagini del blog.
- **Ridimensionamento lato server**: oggi lo fa il browser. Con `sharp` si farebbe anche quando JavaScript è spento.
- **Recupero password**: oggi la reimposti tu dal coordinamento (o la ragazza si registra di nuovo). Con le email diventa automatico.
- **Calendario a griglia mensile**: ora è un'agenda per giorno, più leggibile su telefono.
