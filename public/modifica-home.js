/* Modifica della home stando sulla home.
   Ogni modifica viene salvata sul server e poi la pagina si ricarica:
   così quello che vedi è sempre la home vera, non una finta anteprima. */
(function () {
  const pagina = document.getElementById('home-modificabile');
  if (!pagina) return;

  const stato = document.getElementById('modifica-stato');

  function dimmi(testo) {
    if (stato) stato.textContent = testo || '';
  }

  async function salva(indirizzo, dati) {
    dimmi('Salvo…');
    try {
      const r = await fetch(indirizzo, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(dati)
      });
      if (!r.ok) throw new Error('salvataggio rifiutato');
      return true;
    } catch (e) {
      dimmi('');
      alert('Non è stato salvato (' + e.message + '). Ricarico la pagina per rimettere tutto a posto.');
      window.location.reload();
      return false;
    }
  }

  function ricarica() {
    window.location.href = '/?modifica=1';
  }

  /* ---------- trascinamento ---------- */

  let trascinato = null;

  pagina.addEventListener('dragstart', function (e) {
    const cella = e.target.closest('.cella');
    if (!cella) return;
    trascinato = cella;
    cella.classList.add('cella--in-volo');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', cella.dataset.id);
  });

  pagina.addEventListener('dragend', function () {
    if (trascinato) trascinato.classList.remove('cella--in-volo');
    pagina.querySelectorAll('.cella--bersaglio').forEach((c) => c.classList.remove('cella--bersaglio'));
    trascinato = null;
  });

  pagina.addEventListener('dragover', function (e) {
    const cella = e.target.closest('.cella');
    if (!cella || !trascinato || cella === trascinato) return;
    e.preventDefault();
    pagina.querySelectorAll('.cella--bersaglio').forEach((c) => c.classList.remove('cella--bersaglio'));
    cella.classList.add('cella--bersaglio');
  });

  pagina.addEventListener('drop', async function (e) {
    const cella = e.target.closest('.cella');
    if (!cella || !trascinato || cella === trascinato) return;
    e.preventDefault();

    const tutte = Array.from(pagina.querySelectorAll('.cella'));
    const partenza = tutte.indexOf(trascinato);
    const arrivo = tutte.indexOf(cella);
    const nuovo = tutte.map((c) => c.dataset.id);
    nuovo.splice(partenza, 1);
    nuovo.splice(arrivo, 0, trascinato.dataset.id);

    if (await salva('/area/coordinamento/home/ordine', { ordine: nuovo })) ricarica();
  });

  /* ---------- barra di ogni blocco ---------- */

  pagina.addEventListener('click', async function (e) {
    const b = e.target.closest('[data-comando]');
    if (!b) return;
    const cella = b.closest('.cella');
    const id = cella.dataset.id;
    const comando = b.dataset.comando;

    if (comando === 'larghezza' || comando === 'posizione' || comando === 'vert') {
      const valori = b.dataset.valori.split(',');
      const ora = b.dataset.valore;
      const prossimo = valori[(valori.indexOf(ora) + 1) % valori.length];
      if (await salva('/area/coordinamento/home/' + id + '/campo', { campo: comando, valore: prossimo })) ricarica();
      return;
    }

    if (comando === 'immagine') {
      const elenco = await (await fetch('/area/coordinamento/immagini.json', { credentials: 'same-origin' })).json();
      if (!elenco.length) {
        alert('Non hai ancora caricato immagini. Vai in Coordinamento → Immagini.');
        return;
      }
      const righe = elenco.map((i, n) => n + 1 + ') ' + i.nome).join('\n');
      const scelta = prompt('Quale immagine? Scrivi il numero.\n\n' + righe);
      const n = parseInt(scelta, 10);
      if (!n || !elenco[n - 1]) return;
      if (await salva('/area/coordinamento/home/' + id + '/campo', { campo: 'immagine_id', valore: String(elenco[n - 1].id) })) ricarica();
      return;
    }

    if (comando === 'testo') {
      apriScrittura(cella);
    }
  });

  /* ---------- scrittura in pagina ---------- */

  function apriScrittura(cella) {
    if (cella.querySelector('.modifica-scrivi')) return;
    const contenuto = cella.querySelector('.blocco');
    const box = document.createElement('div');
    box.className = 'modifica-scrivi';
    box.innerHTML =
      '<label>Titolo<input type="text" class="ms-titolo" maxlength="160"></label>' +
      '<label>Testo<textarea class="ms-corpo" rows="7"></textarea></label>' +
      '<p class="data">Valgono i segni del blog: <code>## </code> sottotitolo, <code>- </code> elenco, <code>**grassetto**</code>, <code>{verde:colorato}</code>.</p>' +
      '<div class="riga-azioni"><button type="button" class="bottone piccolo ms-salva">Salva</button>' +
      '<button type="button" class="bottone piccolo chiaro ms-annulla">Annulla</button></div>';
    box.querySelector('.ms-titolo').value = cella.dataset.titolo || '';
    box.querySelector('.ms-corpo').value = cella.dataset.corpo || '';
    if (!cella.dataset.corpoModificabile) box.querySelector('.ms-corpo').closest('label').remove();
    contenuto.after(box);
    box.querySelector('.ms-titolo').focus();

    box.querySelector('.ms-annulla').addEventListener('click', () => box.remove());
    box.querySelector('.ms-salva').addEventListener('click', async function () {
      const id = cella.dataset.id;
      const titolo = box.querySelector('.ms-titolo').value;
      const corpoCampo = box.querySelector('.ms-corpo');
      if (!(await salva('/area/coordinamento/home/' + id + '/campo', { campo: 'titolo', valore: titolo }))) return;
      if (corpoCampo && !(await salva('/area/coordinamento/home/' + id + '/campo', { campo: 'corpo', valore: corpoCampo.value }))) return;
      ricarica();
    });
  }
})();
