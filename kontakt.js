/* Kontaktformular: Prüfung der Eingaben, Versand über einen externen Formulardienst (Endpoint in config.js).
   Eine Erfolgsmeldung erscheint NUR, wenn der Dienst den Versand mit einer Erfolgsantwort bestätigt. */
(function () {
  'use strict';
  var C = window.PRUEFSTAND_CONFIG || {};
  var form = document.getElementById('kontaktForm');
  if (!form) { return; }
  var meldung = document.getElementById('kMeldung');
  var btn = document.getElementById('kSenden');
  var loadedAt = Date.now();
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function el(id) { return document.getElementById(id); }
  function fehler(feldId, text) {
    var f = el(feldId), p = el(feldId + 'F');
    if (!p) { return; }
    if (text) { p.textContent = text; p.hidden = false; f.setAttribute('aria-invalid', 'true'); f.setAttribute('aria-describedby', p.id); }
    else { p.textContent = ''; p.hidden = true; f.removeAttribute('aria-invalid'); f.removeAttribute('aria-describedby'); }
  }
  function zeige(typ, text, mitMail) {
    meldung.innerHTML = '';
    var d = document.createElement('div');
    d.className = 'meldung ' + typ;
    d.appendChild(document.createTextNode(text));
    if (mitMail) {
      var a = document.createElement('a');
      a.href = 'mailto:' + (C.kontaktEmail || 'jason.nadler@soz-pankow.de');
      a.textContent = C.kontaktEmail || 'jason.nadler@soz-pankow.de';
      d.appendChild(document.createTextNode(' Du kannst stattdessen direkt eine E-Mail schreiben: '));
      d.appendChild(a);
      d.appendChild(document.createTextNode('.'));
    }
    meldung.appendChild(d);
  }
  function pruefe() {
    var ok = true, first = null;
    function check(id, bad, text) {
      if (bad) { fehler(id, text); ok = false; if (!first) { first = el(id); } } else { fehler(id, ''); }
    }
    check('kName', !el('kName').value.trim(), 'Bitte gib deinen Namen ein.');
    var mail = el('kMail').value.trim();
    check('kMail', !mail ? true : !EMAIL.test(mail), !mail ? 'Bitte gib deine E-Mail-Adresse ein.' : 'Bitte gib eine gültige E-Mail-Adresse ein, zum Beispiel name@beispiel.de.');
    check('kBetreff', !el('kBetreff').value.trim(), 'Bitte gib einen Betreff ein.');
    check('kText', !el('kText').value.trim(), 'Bitte schreib eine Nachricht.');
    check('kZustimmung', !el('kZustimmung').checked, 'Bitte bestätige, dass du die Datenschutzerklärung gelesen hast.');
    if (first) { first.focus(); }
    return ok;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    meldung.innerHTML = '';
    if (!pruefe()) { return; }
    // Spam-Schutz: Honigtopf-Feld und zu schnelles Absenden (Bots). Verworfene Anfragen erhalten bewusst keine Erfolgsmeldung.
    if (el('kWeb').value || (Date.now() - loadedAt) < 3000) {
      zeige('err', 'Die Nachricht konnte nicht gesendet werden. Bitte versuche es in einigen Sekunden noch einmal.', true);
      return;
    }
    var endpoint = (C.formEndpoint || '').trim();
    if (!endpoint) {
      zeige('err', 'Das Kontaktformular ist noch nicht freigeschaltet, deine Nachricht wurde nicht gesendet.', true);
      return;
    }
    var data = {
      name: el('kName').value.trim(), email: el('kMail').value.trim(),
      subject: el('kBetreff').value.trim(), message: el('kText').value.trim()
    };
    var extra = C.formExtraFields || {}, k;
    for (k in extra) { if (Object.prototype.hasOwnProperty.call(extra, k)) { data[k] = extra[k]; } }
    btn.disabled = true; btn.textContent = 'Wird gesendet …';
    fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (r.ok && j.success !== false && !j.error) {
            zeige('ok', 'Danke! Deine Nachricht wurde gesendet.');
            form.reset();
          } else {
            zeige('err', 'Die Nachricht konnte nicht gesendet werden.', true);
          }
        });
      })
      .catch(function () { zeige('err', 'Die Nachricht konnte nicht gesendet werden (keine Verbindung oder Dienst nicht erreichbar).', true); })
      .then(function () { btn.disabled = false; btn.textContent = 'Nachricht senden'; });
  });
})();
