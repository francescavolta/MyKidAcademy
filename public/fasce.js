/* Scorciatoie per il modulo delle fasce ripetute:
   scelta rapida dei giorni e "tutto il giorno". */
(function () {
  document.querySelectorAll('.ripetute').forEach(function (box) {
    const giorni = box.querySelectorAll('input[name="giorni"]');
    const inizio = box.querySelector('input[name="ora_inizio"]');
    const fine = box.querySelector('input[name="ora_fine"]');

    box.addEventListener('click', function (e) {
      const b = e.target.closest('button[data-giorni]');
      if (b) {
        e.preventDefault();
        const scelta = b.dataset.giorni;
        giorni.forEach(function (c) {
          const n = Number(c.value);
          c.checked =
            scelta === 'tutti' ? true :
            scelta === 'feriali' ? n <= 5 :
            scelta === 'weekend' ? n >= 6 :
            false;
        });
        return;
      }

      const g = e.target.closest('button[data-orario]');
      if (g) {
        e.preventDefault();
        if (g.dataset.orario === 'giornata') {
          inizio.value = '00:00';
          fine.value = '23:59';
        } else {
          inizio.value = '';
          fine.value = '';
        }
      }
    });
  });
})();
