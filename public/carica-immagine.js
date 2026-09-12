/* Rimpicciolisce l'immagine nel browser prima di caricarla.
   Una foto da 6 MB del telefono arriva nel database a poche centinaia di KB.
   Se il browser non collabora, il form parte normale (limite del server: 12 MB). */
(function () {
  const form = document.getElementById('form-immagine');
  const campo = document.getElementById('file');
  const stato = document.getElementById('stato-caricamento');
  if (!form || !campo || !window.fetch || !window.FormData) return;

  const LATO_MAX = 1800;
  const QUALITA = 0.82;

  function dimmi(testo) {
    if (stato) stato.textContent = testo;
  }

  function mb(n) {
    return (n / 1048576).toFixed(1) + ' MB';
  }

  async function apri(file) {
    if (window.createImageBitmap) {
      try {
        return await createImageBitmap(file, { imageOrientation: 'from-image' });
      } catch (e) {
        /* provo con il metodo vecchio */
      }
    }
    return await new Promise((ok, no) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => no(new Error('immagine non leggibile'));
      img.src = URL.createObjectURL(file);
    });
  }

  async function rimpicciolisci(file) {
    const img = await apri(file);
    const l = img.width;
    const h = img.height;
    const fattore = Math.min(1, LATO_MAX / Math.max(l, h));
    const tela = document.createElement('canvas');
    tela.width = Math.round(l * fattore);
    tela.height = Math.round(h * fattore);
    const ctx = tela.getContext('2d');
    ctx.drawImage(img, 0, 0, tela.width, tela.height);
    const blob = await new Promise((ok) => tela.toBlob(ok, 'image/jpeg', QUALITA));
    if (!blob) throw new Error('conversione non riuscita');
    return new File([blob], (file.name || 'immagine').replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  }

  form.addEventListener('submit', async function (e) {
    const file = campo.files && campo.files[0];
    if (!file) return;

    // Le GIF animate non si toccano: ridimensionarle le fa diventare fisse.
    const daLasciare = file.type === 'image/gif' || file.size < 900 * 1024;
    if (daLasciare) return;

    e.preventDefault();
    const bottone = form.querySelector('button[type="submit"]');
    if (bottone) bottone.disabled = true;

    try {
      dimmi('Rimpicciolisco l\'immagine…');
      const ridotto = await rimpicciolisci(file);
      dimmi('Carico… (da ' + mb(file.size) + ' a ' + mb(ridotto.size) + ')');

      const dati = new FormData();
      dati.append('file', ridotto);
      dati.append('nome', form.querySelector('#nome').value || file.name);

      const risposta = await fetch(form.action, { method: 'POST', body: dati, credentials: 'same-origin' });
      if (!risposta.ok) throw new Error('il server ha rifiutato il file');
      window.location.href = '/area/coordinamento/immagini';
    } catch (err) {
      dimmi('');
      if (bottone) bottone.disabled = false;
      alert('Non sono riuscito a rimpicciolire l\'immagine (' + err.message + '). Provo a caricarla così com\'è.');
      form.submit();
    }
  });
})();
