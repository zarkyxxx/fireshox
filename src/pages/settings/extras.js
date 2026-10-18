// Paramètres — sections Claude, ShoxBlock, Traduction et Mode Fantôme.
// Les interrupteurs simples (data-key) sont gérés par le script de la page ; ici : compteurs, listes,
// boutons et largeur du panneau Claude.
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const api = window.fireshox || null;
  const settings = () => FX.store.get('settings', {}) || {};
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LANG = (() => { try { return new Intl.DisplayNames(['fr'], { type: 'language' }); } catch { return null; } })();
  const langName = (b) => { let n = ''; try { n = LANG ? LANG.of(b) : ''; } catch {} return n || b; };
  const X_ICON = '<svg viewBox="0 0 24 24" class="ic"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

  // ---------------------------------------------------------------- Claude
  const cw = $('[data-key=claudeWidth]');
  const cwOut = $('#cw-out');
  const showWidth = () => { cwOut.textContent = (Math.round(+cw.value) || 400) + ' px'; };
  cw.addEventListener('input', showWidth);
  setTimeout(showWidth, 0);
  $('#open-claude').addEventListener('click', () => FX.open('https://claude.ai/'));

  // ---------------------------------------------------------------- ShoxBlock
  function when(t) {
    if (!t) return 'jamais encore';
    const d = new Date(t);
    const days = Math.floor((Date.now() - t) / 86400000);
    const hm = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (days <= 0) return `aujourd'hui à ${hm}`;
    if (days === 1) return `hier à ${hm}`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) + ` à ${hm}`;
  }
  async function blockInfo() {
    if (!api || !api.shoxblock) { $('#sb-upd').textContent = 'Disponible dans Fire Shox'; return; }
    let i = null;
    try { i = await api.shoxblock.info(); } catch {}
    if (!i) return;
    $('#sb-total').innerHTML = `🔥 <span class="xs-big">${FX.fmt(i.total)}</span> pubs et traqueurs écrasés depuis toujours`;
    $('#sb-upd').textContent = i.ready ? `Listes à jour : ${when(i.updated)}` : 'Listes en cours de chargement…';
    const box = $('#sb-allow');
    box.innerHTML = i.allow.length
      ? i.allow.map((s) => `<span class="xs-chip"><b>${esc(s)}</b><button title="Réactiver ShoxBlock sur ce site" data-site="${esc(s)}">${X_ICON}</button></span>`).join('')
      : '<span class="xs-none">Aucun : ShoxBlock veille partout 🛡️</span>';
    box.querySelectorAll('[data-site]').forEach((b) => b.addEventListener('click', async () => {
      await api.shoxblock.unallow(b.dataset.site);
      FX.toast(`ShoxBlock réactivé sur ${b.dataset.site}`);
      blockInfo();
    }));
  }
  $('#sb-update').addEventListener('click', async () => {
    if (!api || !api.shoxblock) return;
    const b = $('#sb-update');
    b.disabled = true;
    b.textContent = 'Mise à jour…';
    let r = null;
    try { r = await api.shoxblock.update(); } catch {}
    b.disabled = false;
    b.textContent = 'Mettre à jour les listes';
    FX.toast(r && r.ok ? '🛡️ Listes ShoxBlock à jour' : 'Mise à jour impossible (hors ligne ?)');
    blockInfo();
  });

  // ---------------------------------------------------------------- Traduction
  function always() {
    const list = settings().translateAlways || [];
    const box = $('#tr-always');
    box.innerHTML = list.length
      ? list.map((l) => `<span class="xs-chip"><b>${esc(langName(l))}</b><button title="Ne plus traduire d'office" data-lang="${esc(l)}">${X_ICON}</button></span>`).join('')
      : '<span class="xs-none">Aucune langue : Fire Shox demande à chaque fois.</span>';
    box.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => {
      const s = settings();
      FX.store.set('settings', { ...s, translateAlways: (s.translateAlways || []).filter((x) => x !== b.dataset.lang) });
      const n = langName(b.dataset.lang);
      FX.toast(`Plus de traduction automatique pour ${/^[aeiouyhéè]/i.test(n) ? "l'" + n : 'le ' + n}`);
      always();
    }));
  }

  // ---------------------------------------------------------------- Fantôme
  $('#ghost-win').addEventListener('click', () => {
    if (api && api.newGhostWindow) { api.newGhostWindow(); FX.sound('whoosh'); }
    else FX.toast('Ctrl+Maj+N dans Fire Shox');
  });

  FX.store.onChange((k) => { if (k === 'settings') { always(); showWidth(); } });
  blockInfo();
  always();
})();
