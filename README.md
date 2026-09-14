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

## Tariffe

Ogni tutor ha `tariffa` (il minimo) e, se vuole, `tariffa_max`. La pagina scrive "15 € l'ora" con il solo minimo e "15–20 € l'ora" quando c'è anche il massimo, in un unico punto: `tariffaTesto()` in `server.js`, usata da tutte le viste. Un massimo minore o uguale al minimo viene ignorato.

## Richieste e calendario

Quando il coordinamento porta una richiesta a **confermata**, se alla richiesta è collegata una fascia (`richieste.disponibilita_id`) la fascia diventa `occupato` con nota "Famiglia <nome>", e partono due email: conferma alla famiglia e avviso alla tutor, entrambe con data e ora.

- Se quella fascia risulta già occupata da un'altra famiglia, la conferma **non** la sovrascrive: compare un avviso in rosso, così il doppio impegno lo vedi prima di crearlo.
- Se riporti la richiesta a uno stato diverso da confermata, la fascia torna libera — ma solo se la nota è quella scritta dal sistema per quella richiesta: le fasce segnate a mano non vengono mai toccate.
- La fascia la sceglie la famiglia dal modulo, oppure la colleghi tu dal menù nella colonna "Fascia" della tabella delle richieste, che mostra le fasce libere future di quella ragazza.

**Agenda della settimana** (`/area/coordinamento/agenda`): tutte le ragazze approvate in righe, i sette giorni in colonne, le fasce nelle celle con verde/rosso, oggi evidenziato, frecce per cambiare settimana. Serve a rispondere a "chi ho libero giovedì alle 15" senza aprire le schede una a una.

## Bottoni del pannello

L'elenco dei possibili bottoni sta in `SCORCIATOIE` (`server.js`); quali mostrare e in che ordine è salvato nell'impostazione `scorciatoie` (una lista di id separati da virgola, gruppo `nascosto` quindi non compare nella pagina Aspetto). Si gestisce da `/area/coordinamento/scorciatoie`, raggiungibile dall'ingranaggio in fondo alla fila dei bottoni: frecce per spostare, Nascondi/Mostra, e "Rimetti l'ordine di partenza". Gli id sconosciuti vengono ignorati e le voci aggiunte in futuro compaiono fra i nascosti, quindi aggiornare il codice non rompe mai la configurazione salvata.

## Galleria e WhatsApp

**Galleria**: tipo di blocco per la home con più immagini (tabella `sezione_immagini`, con ordine). Nella scheda del blocco si spuntano le foto dalla libreria; l'ordine è quello mostrato, e le già scelte salgono in cima. La misura del blocco (piccola/media/grande/piena) decide quante colonne ha la griglia.

**WhatsApp**: `waNumero()` normalizza qualunque formato — `333 123 4567`, `+39 333 1234567`, `0039…` — in quello che vuole wa.me. Riconosce i cellulari e i fissi italiani senza prefisso e lascia intatti i numeri con prefisso straniero. Il pulsante compare sulla pagina di ogni tutor e nel piè di pagina di tutto il sito, con il messaggio già scritto.

## Pagina pubblica delle referenze

`/referenze` raccoglie tutte le referenze pubblicate delle tutor approvate: media stelle, totale, quante ragazze sono recensite, filtro per ragazza e ordinamento (più recenti o voto più alto). Voce nel menu, presente anche nella sitemap.

C'è anche un tipo di blocco per la home, "Referenze delle famiglie": mostra le tre più recenti e il link alla pagina. Si aggiunge da Coordinamento → Home → Aggiungi blocco.

Nota su Google: non ho messo i dati strutturati `AggregateRating`. Su recensioni raccolte e pubblicate dal sito stesso quel markup è a rischio penalizzazione, e le stelle nei risultati di ricerca non valgono il rischio.

## Chat interna con le collaboratrici

Conversazione privata fra coordinamento e singola tutor: una sola per ragazza, creata al primo messaggio (`conversazioni.tipo = 'interna'`). Compare dentro la scheda della tutor lato coordinamento e dentro la sua area personale, non nella lista "Messaggi" — quella resta riservata alle conversazioni con le famiglie (`conversazioniPer` filtra `tipo = 'famiglia'`).

Ogni messaggio manda un'email all'altra parte. I messaggi non letti dalle ragazze compaiono in cima all'area coordinamento sotto "Messaggi dalle ragazze", con il collegamento diretto alla scheda. Il token di una conversazione interna non apre nulla da `/chat/:token`: è una via chiusa.

## Documenti delle collaboratrici

Tabella `documenti` (tipo, file in `bytea`, scadenza, nota, chi l'ha caricato). **Li gestisce solo il coordinamento**: la sezione non compare nell'area delle tutor e non esiste una rotta con cui possano caricarli. Il coordinamento li carica, li vede tutti, cambia le scadenze e li elimina. Il download (`/documenti/:id`) è consentito **solo** all'amministrazione e alla diretta interessata, con `Cache-Control: private, no-store`.

I tipi previsti sono in `TIPI_DOCUMENTO`: documento d'identità, codice fiscale, contratto firmato, certificato penale, assicurazione, titolo di studio, altro. I documenti scaduti o in scadenza entro 30 giorni compaiono in cima all'area coordinamento, in "Documenti da rinnovare", e sono evidenziati nella scheda.

Nessuna famiglia vede mai questi file: non compaiono su nessuna pagina pubblica e `/documenti/` è escluso da `robots.txt`.

## Archivio

Le richieste `confermata` e `chiusa` non compaiono più nella tabella del coordinamento: si vedono con "Mostra anche le N archiviate" (`?archivio=1`). Stessa cosa per le conversazioni chiuse, nella lista dei messaggi, sia lato coordinamento sia lato tutor. Niente viene cancellato: è solo un filtro.

## Statistiche e Google

**Statistiche** (`/area/coordinamento/statistiche`, tabella `visite`): conteggio interno senza cookie e senza salvare IP. L'impronta è `sha256(sale_del_giorno + ip + user-agent)` troncata, con un sale casuale rigenerato ogni giorno: permette di contare le persone di una giornata, non di riconoscerle il giorno dopo. Non conta le richieste degli amministratori, i robot noti, le pagine sotto `/area`, la chat, `/stato` e i file statici. La pagina mostra persone e pagine viste per giorno, le pagine più viste e la provenienza (Google, Instagram, WhatsApp, diretto). Per il testo privacy c'è già un paragrafo dedicato nel valore di partenza.

**Google**: `robots.txt` (blocca `/area/`, `/chat/`, `/stato`, dichiara la sitemap), `sitemap.xml` generata dal database con home, elenco, profili approvati, blog, articoli pubblicati, pagine attive; `<link rel="canonical">` e `og:url` su ogni pagina; dati strutturati JSON-LD `LocalBusiness` in testa e `BlogPosting` sugli articoli. Tutto usa `INDIRIZZO_SITO`, quindi quella variabile deve essere giusta.

## Protezione degli accessi

- **Tentativi di accesso**: dopo 6 password sbagliate per la stessa coppia indirizzo-IP, l'accesso è bloccato per 15 minuti; negli ultimi due tentativi il messaggio avvisa. Il contatore si azzera a ogni accesso riuscito e vive in memoria (`tentativi`), quindi si svuota a ogni riavvio: sufficiente con una sola istanza come questa. Lo stesso limite vale sulle richieste di recupero password.
- **Richieste da altri siti**: un middleware controlla `Origin` (o in mancanza `Referer`) su ogni POST. Se non corrisponde al sito, la richiesta è rifiutata con una pagina spiegata. Quando mancano entrambe le intestazioni la richiesta passa solo sui moduli pubblici, mai sotto `/area`. Insieme al cookie `sameSite: lax` copre il caso CSRF senza dover mettere un token in una quarantina di moduli.
- **Sessione rigenerata all'accesso**: l'identificativo precedente smette di valere.
- **Intestazioni**: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` in produzione e una CSP che limita le origini. La CSP consente `unsafe-inline` perché le pagine usano attributi di stile e qualche `onsubmit`/`onchange` in linea: serve a bloccare script esterni, non quelli della pagina.

Se un modulo smette di funzionare con "Richiesta non accettata", la causa quasi certa è il controllo dell'origine: succede aprendo il sito da un indirizzo diverso da quello configurato (per esempio onrender.com dopo il passaggio al dominio).

## Eliminare davvero

- **Richiesta**: bottone Elimina nella tabella delle richieste. Cancella per sempre, libera la fascia se era stata occupata per quella famiglia (solo se la nota è quella scritta dal sistema) e, con la casella spuntata, porta via anche la conversazione. Senza spunta la chat resta, scollegata dalla richiesta.
- **Conversazione**: "Elimina tutto" nella pagina della conversazione, lato coordinamento. Cancella conversazione e messaggi; il link della mamma smette di funzionare.

Entrambe sono irreversibili e servono anche a rispondere a chi chiede la cancellazione dei propri dati.

## Chat famiglia / tutor

Tabelle `conversazioni` e `messaggi`. Una conversazione nasce **da sola** quando una famiglia manda una richiesta: il testo della richiesta diventa il primo messaggio.

Chi entra e come:

| Chi | Come accede |
|---|---|
| Famiglia | **subito dopo aver mandato la richiesta finisce dentro la conversazione**, e vede il proprio link da salvare. Lo riceve anche per email, se le email sono configurate. Nessuna registrazione |
| Tutor | dalla sua area, sezione Messaggi (solo le proprie) |
| Coordinamento | `/area/coordinamento/messaggi`: tutte, con la possibilità di scrivere come "Coordinamento" e di chiudere una conversazione |

Ogni nuovo messaggio manda un'email a chi deve leggerlo (e al coordinamento quando scrive la famiglia). I non letti si calcolano confrontando `ultimo_messaggio` con `visto_tutor` / `visto_admin` / `visto_genitore`, e compaiono come contatore nelle due aree.

Il fatto che il coordinamento legga è **scritto in chiaro** in cima alla conversazione a entrambe le parti: è una scelta voluta, non una sorveglianza nascosta, e in un servizio che coinvolge minori è anche una tutela per la tutor. Chiudendo una conversazione nessuno può più scrivere, tranne il coordinamento.

Se le email non sono attive, la chat funziona lo stesso: il coordinamento vede il link della mamma in cima alla conversazione e può copiarlo (o farlo rimandare per email con un bottone). Le richieste arrivate prima di questa funzione non hanno una conversazione: nella tabella delle richieste c'è "Crea", che la apre riportandoci dentro il testo della richiesta.

Il token è una stringa casuale di 24 byte: chi ha il link entra. Va bene per messaggi organizzativi; non è il posto per dati delicati, e questo è scritto anche nella privacy.

## Email

`mail.js` manda le email con [Resend](https://resend.com). Senza `RESEND_API_KEY` il sito funziona identico e scrive nei log quello che avrebbe mandato: niente si rompe, semplicemente nessuno viene avvisato.

Cosa parte, e a chi:

| Quando | A te | Al destinatario |
|---|---|---|
| Una ragazza si candida | avviso con il link alla candidatura | conferma di ricezione |
| Approvi una tutor | — | "la tua pagina è online" |
| Una famiglia manda una richiesta | avviso con tutti i dati, `reply_to` della mamma | conferma di ricezione |
| Una famiglia lascia una referenza | avviso da approvare | — |
| Una tutor chiede la password | — | link per reimpostarla |

**Recupero password**: `/password` → email con un link valido due ore e usabile una volta (tabella `reimposta`). Vale solo per le tutor: la password del coordinamento viene riallineata a `ADMIN_PASSWORD` a ogni deploy, quindi va cambiata da lì. Gli account coordinamento creati dal pannello, invece, possono usarlo.

**Configurare Resend**: account gratuito, verifica del dominio (se ne hai uno) e chiave API in `RESEND_API_KEY`. Per provare subito senza dominio si può mandare da `onboarding@resend.dev`, ma solo verso il proprio indirizzo.

## Privacy, condivisione e antispam

- Pagina `/privacy` con il testo modificabile in Aspetto → Privacy. È un punto di partenza da completare con i dati veri dell'attività, non un testo legale garantito.
- Casella di consenso obbligatoria su tutti e tre i moduli pubblici (richiesta, referenza, candidatura), con link alla privacy. Senza spunta il modulo non passa.
- Niente banner cookie: l'unico cookie è quello tecnico di sessione.
- Antispam: campo trappola invisibile (`sito_web`) più scarto degli invii completati in meno di 3 secondi, in `robot()`.
- Condivisione: tag Open Graph in `partials/testa.ejs`; descrizione e immagine si scelgono in Aspetto → Condivisione. Con `INDIRIZZO_SITO` impostato l'immagine viene linkata in assoluto, come WhatsApp pretende.
- Pulsante WhatsApp sulla pagina di ogni tutor, con messaggio già scritto: compare solo se metti il numero in Aspetto → Testi.

## Pagine, foto e accessibilità

- **Pagine libere** (tabella `pagine`): crei "Chi siamo", "Domande frequenti" e quello che vuoi, con la stessa scrittura del blog; quelle pubblicate e con "nel menù" attivo compaiono da sole nella barra in alto.
- **Foto delle tutor**: ognuna carica la sua dalla propria area (ridimensionata a 1800 px dal browser). Senza foto resta il monogramma con le iniziali. Compare nelle schede, nell'elenco e sul profilo.
- **Filtro per giorno** in `/tutor`: mostra solo chi ha una fascia libera futura in quel giorno della settimana (`extract(isodow …)`).
- **Descrizione delle immagini** (`alt`): campo al caricamento e modificabile dalla libreria.
- **Avviso di contrasto** in Aspetto: calcola il rapporto WCAG sulle cinque combinazioni che contano e avvisa sotto 4.5.
- **Calendario su telefono**: sotto i 620 px la griglia diventa una lista dei soli giorni con fasce.

## Gestione

- **Fascia scelta nella richiesta**: la famiglia può indicare quale fascia le va bene, e la richiesta la registra (`richieste.disponibilita_id`).
- **Ore del mese**: nella scheda della tutor, il totale delle ore segnate come occupate nel mese visualizzato.
- **Secondo account coordinamento**: dal fondo dell'area coordinamento, con email e password. Ha gli stessi poteri.
- **Schede delle ragazze in CSV**: `/area/coordinamento/ragazze.csv`, solo per il coordinamento. Una riga per collaboratrice con contatti, zona, stato, tariffe, mansioni, materie, numero di referenze e media stelle, documenti e prima scadenza, richieste ricevute, fasce libere future, presentazione e nota interna. Separatore punto e virgola e BOM UTF-8, così Excel italiano lo apre in colonne.
- **Copia dei dati**: `/area/coordinamento/esporta.json` scarica tutto tranne i byte delle immagini. Non sostituisce i backup di Render, ma è una rete di sicurezza che controlli tu.

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
