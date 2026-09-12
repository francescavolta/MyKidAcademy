/* Barra dei bottoni e anteprima per l'articolo.
   Le stesse regole del server (corpoHtml in server.js), qui solo per l'anteprima. */
(function () {
  const area = document.getElementById('corpo');
  const barra = document.getElementById('barra-strumenti');
  const anteprima = document.getElementById('anteprima');
  if (!area || !barra) return;

  const COLORI = {
    tema: 'var(--prugna)', rosa: '#d16a92', rosso: '#b3261e', arancio: '#b4610f',
    giallo: '#96780c', verde: '#3f7a52', blu: '#2a5d9f', viola: '#6c3f96', grigio: '#7c6670'
  };

  function applica(azione) {
    const inizio = area.selectionStart;
    const fine = area.selectionEnd;
    const testo = area.value;
    const scelto = testo.slice(inizio, fine);

    // Azioni che lavorano sulla riga intera
    if (['h2', 'h3', 'lista'].includes(azione)) {
      const capo = testo.lastIndexOf('\n', inizio - 1) + 1;
      let coda = testo.indexOf('\n', fine);
      if (coda === -1) coda = testo.length;
      const prefisso = azione === 'h2' ? '## ' : azione === 'h3' ? '### ' : '- ';
      const righe = testo.slice(capo, coda).split('\n');
      const giaMesso = righe.every((r) => r.startsWith(prefisso));
      const nuove = righe
        .map((r) => (giaMesso ? r.slice(prefisso.length) : prefisso + r.replace(/^(#{2,3}\s+|[-*]\s+)/, '')))
        .join('\n');
      area.setRangeText(nuove, capo, coda, 'end');
      finisci();
      return;
    }

    // Azioni che avvolgono il testo selezionato
    const segni = { grassetto: ['**', '**'], corsivo: ['*', '*'] };
    if (segni[azione]) {
      const [a, b] = segni[azione];
      if (scelto) {
        const pulito = scelto.startsWith(a) && scelto.endsWith(b) ? scelto.slice(a.length, -b.length) : a + scelto + b;
        area.setRangeText(pulito, inizio, fine, 'end');
      } else {
        area.setRangeText(a + 'testo' + b, inizio, fine, 'select');
      }
      finisci();
      return;
    }

    if (azione === 'colore') {
      const scelta = document.getElementById('scegli-colore');
      const nome = scelta ? scelta.value : '';
      if (!nome) {
        alert('Scegli prima un colore dal menù accanto al bottone.');
        return;
      }
      area.setRangeText('{' + nome + ':' + (scelto || 'testo') + '}', inizio, fine, scelto ? 'end' : 'select');
      finisci();
      return;
    }

    if (azione === 'link') {
      const url = prompt('Indirizzo del link (con https://)', 'https://');
      if (!url) return;
      area.setRangeText('[' + (scelto || 'testo del link') + '](' + url + ')', inizio, fine, 'end');
      finisci();
      return;
    }

    if (azione === 'immagine') {
      const scelta = document.getElementById('scegli-immagine');
      const id = scelta ? scelta.value : '';
      if (!id) {
        alert('Scegli prima un\'immagine dal menù accanto al bottone.');
        return;
      }
      const didascalia = prompt('Didascalia sotto l\'immagine (lascia vuoto per nessuna)', '') || '';
      const codice = '\n[img:' + id + (didascalia ? '|' + didascalia : '') + ']\n';
      area.setRangeText(codice, inizio, fine, 'end');
      finisci();
    }
  }

  function finisci() {
    area.focus();
    disegna();
  }

  function inLinea(t) {
    return t
      .replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|\s)\*([^*]+)\*/g, '$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener">$1</a>')
      .replace(/\{(\w+):([^{}]*)\}/g, function (tutto, nome, dentro) {
        return COLORI[nome] ? '<span style="color:' + COLORI[nome] + '">' + dentro + '</span>' : tutto;
      });
  }

  function aHtml(testo) {
    const out = [];
    let par = [];
    let lista = [];
    const chiudiPar = () => { if (par.length) out.push('<p>' + par.join('<br>') + '</p>'); par = []; };
    const chiudiLista = () => { if (lista.length) out.push('<ul>' + lista.map((v) => '<li>' + v + '</li>').join('') + '</ul>'); lista = []; };
    const chiudi = () => { chiudiPar(); chiudiLista(); };

    for (const riga of String(testo || '').replace(/\r\n/g, '\n').split('\n')) {
      const r = riga.trim();
      if (!r) { chiudi(); continue; }
      const tit = /^(#{2,3})\s+(.*)$/.exec(r);
      if (tit) { chiudi(); const tag = tit[1].length === 2 ? 'h2' : 'h3'; out.push('<' + tag + '>' + inLinea(tit[2]) + '</' + tag + '>'); continue; }
      const img = /^\[img:(\d+)(?:\|([^\]]*))?\]$/.exec(r);
      if (img) {
        chiudi();
        out.push('<figure><img src="/immagini/' + img[1] + '" alt="">' + (img[2] ? '<figcaption>' + inLinea(img[2]) + '</figcaption>' : '') + '</figure>');
        continue;
      }
      const voce = /^[-*]\s+(.*)$/.exec(r);
      if (voce) { chiudiPar(); lista.push(inLinea(voce[1])); continue; }
      chiudiLista(); par.push(inLinea(r));
    }
    chiudi();
    return out.join('\n');
  }

  function disegna() {
    if (anteprima) anteprima.innerHTML = aHtml(area.value) || '<p class="data">L\'anteprima compare qui mentre scrivi.</p>';
  }

  barra.addEventListener('click', function (e) {
    const b = e.target.closest('button[data-azione]');
    if (!b) return;
    e.preventDefault();
    applica(b.dataset.azione);
  });

  area.addEventListener('input', disegna);
  disegna();
})();
