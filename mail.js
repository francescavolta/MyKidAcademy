/* Invio email con Resend (https://resend.com).
   Se RESEND_API_KEY non c'è, il messaggio viene solo scritto nei log:
   il sito funziona comunque, semplicemente non manda niente. */

const CHIAVE = process.env.RESEND_API_KEY || '';
const MITTENTE = process.env.MITTENTE || 'MyKidAcademy <onboarding@resend.dev>';
const ADMIN = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();

function paragrafi(testo) {
  return String(testo || '')
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function pagina(titolo, testo, azione) {
  return `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:16px;line-height:1.55;color:#34222b;max-width:520px">
  <h1 style="font-size:20px;color:#8e3a5c;margin:0 0 16px">${titolo}</h1>
  ${paragrafi(testo)}
  ${azione ? `<p style="margin:22px 0"><a href="${azione.link}" style="background:#8e3a5c;color:#fff;text-decoration:none;padding:11px 20px;border-radius:999px;display:inline-block">${azione.testo}</a></p>` : ''}
  <p style="margin:26px 0 0;font-size:13px;color:#7c6670">Questa email arriva dal sito di MyKidAcademy.</p>
</div>`;
}

async function invia({ a, oggetto, titolo, testo, azione, rispondiA }) {
  const destinatari = [].concat(a).filter(Boolean);
  if (!destinatari.length) return false;

  if (!CHIAVE) {
    console.log(`[email non inviata: manca RESEND_API_KEY] a ${destinatari.join(', ')} — ${oggetto}`);
    return false;
  }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${CHIAVE}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: MITTENTE,
        to: destinatari,
        subject: oggetto,
        html: pagina(titolo || oggetto, testo, azione),
        text: String(testo || '') + (azione ? `\n\n${azione.testo}: ${azione.link}` : ''),
        ...(rispondiA ? { reply_to: rispondiA } : {})
      })
    });
    if (!r.ok) {
      console.error('Resend ha risposto', r.status, await r.text());
      return false;
    }
    return true;
  } catch (e) {
    // Un'email non partita non deve mai fare fallire la pagina.
    console.error('Invio email non riuscito:', e.message);
    return false;
  }
}

const avvisaAdmin = (opzioni) => invia({ ...opzioni, a: ADMIN });

module.exports = { invia, avvisaAdmin, ADMIN };
