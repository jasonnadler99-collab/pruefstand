/* Prüfstand – Prüfungs-Engine
 * Liest window.PRUEFUNG (aus fragen/*.js) und window.PRUEFSTAND_CONFIG (config.js).
 * Ablauf: Einführung -> Fragen -> Überprüfung -> Bestätigung -> Auswertung.
 * Während der Prüfung gibt es KEINE Richtig/Falsch-Rückmeldung und keine Lösungshinweise.
 * Hinweis: Alle Daten (inkl. richtiger Antworten) liegen im Browser und sind dort einsehbar.
 */
(function () {
  'use strict';
  var D = window.PRUEFUNG;
  var C = window.PRUEFSTAND_CONFIG || {};
  var root = document.getElementById('quiz');
  if (!D || !root) { return; }

  var N = D.fragen.length;
  var passPercent = (typeof D.passPercent === 'number') ? D.passPercent :
    (typeof C.passPercent === 'number' ? C.passPercent : null);
  var shuffleOptions = C.shuffleOptions !== false;

  var st = null; // Zustand der laufenden Prüfung
  var firstRender = true;

  /* ---------- Hilfsfunktionen ---------- */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    var i, k;
    if (attrs) {
      for (k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) { continue; }
        if (k === 'class') { el.className = attrs[k]; }
        else if (k.indexOf('on') === 0) { el.addEventListener(k.slice(2), attrs[k]); }
        else if (attrs[k] !== false && attrs[k] !== null && attrs[k] !== undefined) { el.setAttribute(k, attrs[k]); }
      }
    }
    for (i = 2; i < arguments.length; i++) { append(el, arguments[i]); }
    return el;
  }
  function append(el, c) {
    if (c === null || c === undefined || c === false) { return; }
    if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); return; }
    if (typeof c === 'string' || typeof c === 'number') { el.appendChild(document.createTextNode(String(c))); return; }
    el.appendChild(c);
  }
  function shuffle(a) {
    var i, j, t;
    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function pct(x) { return (Math.round(x * 10) / 10).toString().replace('.', ','); }
  function isMulti(q) { return q.richtig.length > 1; }
  function sameSet(a, b) {
    if (a.length !== b.length) { return false; }
    var s = a.slice().sort(), t = b.slice().sort(), i;
    for (i = 0; i < s.length; i++) { if (s[i] !== t[i]) { return false; } }
    return true;
  }
  function answeredCount() {
    return st.answers.filter(function (a) { return a.length > 0; }).length;
  }
  function setView(nodes, focusSel) {
    root.innerHTML = '';
    append(root, nodes);
    if (firstRender) { firstRender = false; return; } // beim Laden der Seite keinen Fokus verschieben
    var f = root.querySelector(focusSel || '[data-focus]');
    if (f) { f.setAttribute('tabindex', '-1'); f.focus({ preventScroll: false }); }
    window.scrollTo(0, 0);
  }
  function onBeforeUnload(e) {
    if (st && (st.phase === 'frage' || st.phase === 'review')) {
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
  }
  window.addEventListener('beforeunload', onBeforeUnload);

  /* ---------- Ansichten ---------- */
  function viewIntro() {
    st = null;
    var mehr = D.fragen.some(isMulti);
    setView([
      h('div', { class: 'karte' },
        h('h2', { 'data-focus': '1' }, 'Bevor es losgeht'),
        D.beschreibung ? h('p', null, D.beschreibung) : null,
        h('ul', { class: 'liste' },
          h('li', null, h('strong', null, N + ' Fragen'), ' mit Multiple-Choice-Antworten.'),
          mehr ? h('li', null, 'Bei manchen Fragen sind ', h('strong', null, 'mehrere Antworten'), ' richtig. Das steht dann ausdrücklich bei der Frage. Eine solche Frage zählt nur, wenn du genau die richtigen Antworten auswählst.') : null,
          h('li', null, 'Jede Frage zählt 1 Punkt. Unbeantwortete Fragen zählen 0 Punkte und werden in der Auswertung extra angezeigt.'),
          h('li', null, 'Während der Prüfung siehst du ', h('strong', null, 'nicht'), ', ob eine Antwort stimmt. Du kannst zwischen den Fragen wechseln und Antworten ändern.'),
          h('li', null, 'Vor dem Abgeben gibt es eine Übersicht. Erst nach deiner Bestätigung bekommst du die Auswertung mit Erklärungen und Quellen.'),
          h('li', null, 'Lädst du die Seite während der Prüfung neu, geht dein Stand verloren und du beginnst von vorn. Es wird nichts gespeichert.')
        ),
        h('p', { class: 'klein' }, 'Dies ist ein Lern- und Übungstest. Das Ergebnis ist kein amtlicher Nachweis und ersetzt keine offizielle Prüfung.'),
        h('button', { type: 'button', class: 'btn', id: 'startBtn', onclick: startExam }, 'Prüfung starten')
      )
    ]);
  }

  function startExam() {
    st = {
      phase: 'frage', cur: 0, answers: [], order: [], pending: false
    };
    D.fragen.forEach(function (q) {
      var idx = q.optionen.map(function (_, i) { return i; });
      st.order.push(shuffleOptions ? shuffle(idx) : idx);
      st.answers.push([]);
    });
    viewFrage();
  }

  function chips() {
    return h('ol', { class: 'chips', 'aria-label': 'Übersicht der Fragen' },
      D.fragen.map(function (q, i) {
        var done = st.answers[i].length > 0;
        var cls = 'chip' + (done ? ' beantwortet' : ' offen') + (st.phase === 'frage' && i === st.cur ? ' aktuell' : '');
        return h('li', null,
          h('button', {
            type: 'button', class: cls,
            'data-chip': i + 1,
            'aria-label': 'Frage ' + (i + 1) + ', ' + (done ? 'beantwortet' : 'offen') + (st.phase === 'frage' && i === st.cur ? ', aktuelle Frage' : ''),
            'aria-current': (st.phase === 'frage' && i === st.cur) ? 'true' : false,
            onclick: function () { st.cur = i; st.phase = 'frage'; viewFrage(); }
          }, String(i + 1)));
      }));
  }

  function statusLine() {
    var a = answeredCount();
    return h('p', { class: 'status-zeile', id: 'statusZeile' },
      'Beantwortet: ', h('strong', null, a + ' von ' + N), ' · Offen: ', h('strong', null, String(N - a)));
  }

  function viewFrage() {
    st.phase = 'frage';
    var i = st.cur, q = D.fragen[i], multi = isMulti(q);
    var type = multi ? 'checkbox' : 'radio';
    var name = 'antwort';
    var opts = st.order[i].map(function (oi, pos) {
      var id = 'opt-' + i + '-' + pos;
      var checked = st.answers[i].indexOf(oi) !== -1;
      return h('li', null,
        h('label', { class: 'opt', for: id },
          h('input', {
            type: type, name: name, id: id, value: String(oi), checked: checked ? 'checked' : false,
            onchange: function (ev) { onPick(i, oi, ev.target.checked, multi); }
          }),
          h('span', { class: 'opt-text' }, q.optionen[oi])
        ));
    });
    var pctDone = Math.round((i + 1) / N * 100);
    setView([
      h('div', { class: 'quiz-kopf' },
        h('span', { class: 'frage-nr', 'data-focus': '1', id: 'frageNr' }, 'Frage ' + (i + 1) + ' von ' + N),
        statusLine()),
      h('div', { class: 'balken', role: 'presentation' }, h('i', { style: 'width:' + pctDone + '%' })),
      chips(),
      h('form', { class: 'frage', onsubmit: function (e) { e.preventDefault(); } },
        h('fieldset', null,
          h('legend', { class: 'frage-text' }, q.frage),
          q.visual ? h('div', { class: 'visual', role: 'img', 'aria-label': q.visualAlt || 'Abbildung zur Frage', html: null }) : null,
          multi ? h('p', { class: 'multi-hinweis' }, 'Mehrere Antworten sind richtig: Wähle genau ' + q.richtig.length + ' Antworten aus.') : h('p', { class: 'multi-hinweis' }, 'Wähle eine Antwort aus.'),
          h('ul', { class: 'optionen' }, opts)
        ),
        h('button', { type: 'button', class: 'btn-text', onclick: function () { st.answers[i] = []; viewFrage(); } }, 'Antwort zurücksetzen')
      ),
      h('div', { class: 'nav-reihe' },
        h('button', { type: 'button', class: 'btn zweit', id: 'zurueckBtn', disabled: i === 0 ? 'disabled' : false, onclick: function () { st.cur = i - 1; viewFrage(); } }, 'Zurück'),
        i < N - 1
          ? h('button', { type: 'button', class: 'btn', id: 'weiterBtn', onclick: function () { st.cur = i + 1; viewFrage(); } }, 'Weiter')
          : h('button', { type: 'button', class: 'btn', id: 'zurPruefungBtn', onclick: viewReview }, 'Zur Überprüfung')
      ),
      h('p', { class: 'mitte' }, h('button', { type: 'button', class: 'btn-text', id: 'reviewLink', onclick: viewReview }, 'Zur Überprüfung vor der Abgabe'))
    ]);
    if (q.visual) {
      var v = root.querySelector('.visual');
      v.innerHTML = q.visual; // eigener, fest eingebundener SVG-Code aus fragen/*.js
      var svg = v.querySelector('svg');
      if (svg) { svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false'); }
    }
  }

  function onPick(i, oi, checked, multi) {
    var a = st.answers[i];
    if (multi) {
      if (checked && a.indexOf(oi) === -1) { a.push(oi); }
      if (!checked) { a.splice(a.indexOf(oi), 1); }
    } else {
      st.answers[i] = [oi];
    }
    // Nur Übersicht aktualisieren (Fokus bleibt auf der Antwort)
    var sz = document.getElementById('statusZeile');
    if (sz) { sz.replaceWith(statusLine()); }
    var chip = root.querySelector('[data-chip="' + (i + 1) + '"]');
    if (chip) {
      var done = st.answers[i].length > 0;
      chip.className = 'chip ' + (done ? 'beantwortet' : 'offen') + ' aktuell';
      chip.setAttribute('aria-label', 'Frage ' + (i + 1) + ', ' + (done ? 'beantwortet' : 'offen') + ', aktuelle Frage');
    }
  }

  function viewReview() {
    st.phase = 'review';
    var open = N - answeredCount();
    setView([
      h('h2', { 'data-focus': '1' }, 'Überprüfung vor der Abgabe'),
      h('p', null, 'Prüfe, ob alles beantwortet ist. Du kannst jede Frage noch ändern. ',
        'Beantwortet: ', h('strong', null, (N - open) + ' von ' + N), '. Offen: ', h('strong', { id: 'offenAnzahl' }, String(open)), '.'),
      open > 0 ? h('div', { class: 'hinweis warn' }, 'Achtung: ' + open + (open === 1 ? ' Frage ist' : ' Fragen sind') + ' noch unbeantwortet. Unbeantwortete Fragen zählen 0 Punkte.') : null,
      h('ul', { class: 'review-liste' }, D.fragen.map(function (q, i) {
        var done = st.answers[i].length > 0;
        return h('li', { class: done ? 'beantwortet' : 'offen' },
          h('button', { type: 'button', class: 'review-eintrag', 'data-review': i + 1, onclick: function () { st.cur = i; viewFrage(); } },
            h('span', { class: 'rnr' }, 'Frage ' + (i + 1)),
            h('span', { class: 'rtext' }, q.frage),
            h('span', { class: 'rstatus' }, done ? 'Beantwortet' : 'Offen')));
      })),
      h('div', { class: 'nav-reihe' },
        h('button', { type: 'button', class: 'btn zweit', id: 'backToExam', onclick: function () { st.cur = Math.min(st.cur, N - 1); viewFrage(); } }, 'Zurück zur Prüfung'),
        h('button', { type: 'button', class: 'btn', id: 'abgebenBtn', onclick: viewConfirm }, 'Prüfung abgeben')
      )
    ]);
  }

  function viewConfirm() {
    var open = N - answeredCount();
    var box = h('div', { class: 'bestaetigung', role: 'alertdialog', 'aria-labelledby': 'cfTitel', 'aria-describedby': 'cfText', id: 'bestaetigung' },
      h('h3', { id: 'cfTitel', 'data-focus': '1' }, 'Prüfung wirklich abgeben?'),
      h('p', { id: 'cfText' },
        open > 0 ? ('Du hast noch ' + open + (open === 1 ? ' unbeantwortete Frage' : ' unbeantwortete Fragen') + '. Sie zählen 0 Punkte. ') : 'Du hast alle Fragen beantwortet. ',
        'Nach der Abgabe kannst du deine Antworten nicht mehr ändern.'),
      h('div', { class: 'nav-reihe' },
        h('button', { type: 'button', class: 'btn zweit', id: 'cfAbbruch', onclick: viewReview }, 'Abbrechen'),
        h('button', { type: 'button', class: 'btn', id: 'cfJa', onclick: submitExam }, 'Ja, jetzt abgeben')));
    setView([box]);
  }

  function evaluate() {
    var res = { richtig: 0, falsch: 0, offen: 0, items: [] };
    D.fragen.forEach(function (q, i) {
      var a = st.answers[i], status;
      if (a.length === 0) { status = 'offen'; res.offen++; }
      else if (sameSet(a, q.richtig)) { status = 'richtig'; res.richtig++; }
      else { status = 'falsch'; res.falsch++; }
      res.items.push({ i: i, status: status });
    });
    res.punkte = res.richtig; res.max = N;
    res.prozent = N ? (res.punkte / N * 100) : 0;
    return res;
  }

  function submitExam() {
    st.phase = 'ergebnis';
    st.result = evaluate();
    viewResult('alle');
  }

  var LABEL = { richtig: 'Richtig', falsch: 'Falsch', offen: 'Nicht beantwortet' };

  function viewResult(filter) {
    var r = st.result;
    var bestanden = (passPercent !== null) ? (r.prozent >= passPercent) : null;
    var items = r.items.filter(function (it) { return filter === 'alle' || it.status === filter; });
    function fbtn(key, text) {
      return h('button', { type: 'button', class: 'filter' + (filter === key ? ' aktiv' : ''), 'aria-pressed': filter === key ? 'true' : 'false', 'data-filter': key, onclick: function () { viewResult(key); } }, text);
    }
    setView([
      h('div', { class: 'ergebnis' },
        h('h2', { 'data-focus': '1', id: 'ergTitel' }, 'Auswertung: ' + D.titel),
        h('div', { class: 'punkte', id: 'ergPunkte' }, r.punkte + ' von ' + r.max + ' Punkten'),
        h('div', { class: 'prozent', id: 'ergProzent' }, pct(r.prozent) + ' %'),
        bestanden === null ? null :
          h('div', { class: 'status ' + (bestanden ? 'bestanden' : 'nicht'), id: 'ergStatus' },
            bestanden ? 'Lernziel erreicht (Grenze: ' + pct(passPercent) + ' %)' : 'Lernziel noch nicht erreicht (Grenze: ' + pct(passPercent) + ' %)'),
        h('div', { class: 'zaehler' },
          h('div', { class: 'z-gesamt' }, h('b', { id: 'ergGesamt' }, String(r.max)), 'Fragen gesamt'),
          h('div', { class: 'r' }, h('b', { id: 'ergRichtig' }, String(r.richtig)), 'richtig'),
          h('div', { class: 'f' }, h('b', { id: 'ergFalsch' }, String(r.falsch)), 'falsch'),
          h('div', { class: 'o' }, h('b', { id: 'ergOffen' }, String(r.offen)), 'nicht beantwortet')),
        h('p', { class: 'klein' }, 'Jede richtig beantwortete Frage zählt 1 Punkt, falsche und unbeantwortete Fragen zählen 0 Punkte. Das Ergebnis ist ein Lern- und Übungsergebnis und kein amtlicher Nachweis.' +
          (passPercent !== null ? ' Die Grenze von ' + pct(passPercent) + ' % ist eine Einstellung dieser Übungsseite und keine amtliche Bestehensgrenze.' : '')),
        h('div', { class: 'nav-reihe' },
          h('button', { type: 'button', class: 'btn', id: 'neustartBtn', onclick: viewIntro }, 'Prüfung neu starten'),
          h('a', { class: 'btn zweit', href: 'pruefungen.html' }, 'Alle Prüfungen'))
      ),
      h('section', { class: 'rueckblick', 'aria-labelledby': 'rbTitel' },
        h('h2', { id: 'rbTitel' }, 'Auswertung der einzelnen Fragen'),
        h('div', { class: 'filter-reihe' }, fbtn('alle', 'Alle (' + N + ')'), fbtn('richtig', 'Richtig (' + r.richtig + ')'), fbtn('falsch', 'Falsch (' + r.falsch + ')'), fbtn('offen', 'Nicht beantwortet (' + r.offen + ')')),
        items.length === 0 ? h('p', null, 'Keine Fragen in dieser Auswahl.') : null,
        items.map(function (it) { return detail(it); })
      )
    ], '#ergTitel');
    // Position der Detailliste ist egal; Fokus auf Titel
  }

  function detail(it) {
    var q = D.fragen[it.i], a = st.answers[it.i];
    function txt(list) { return list.map(function (oi) { return q.optionen[oi]; }); }
    var gew = a.length ? txt(a) : null;
    var rich = txt(q.richtig);
    var quelle = q.quelle;
    var node = h('article', { class: 'rb ' + it.status, 'data-status': it.status, 'data-nr': it.i + 1 },
      h('p', { class: 'rb-kopf' }, h('span', { class: 'badge ' + it.status }, LABEL[it.status]), ' Frage ' + (it.i + 1) + ' von ' + N),
      h('p', { class: 'q' }, q.frage),
      q.visual ? h('div', { class: 'visual klein-visual', role: 'img', 'aria-label': q.visualAlt || 'Abbildung zur Frage' }) : null,
      h('p', null, h('strong', null, 'Deine Antwort: '), gew ? listOrText(gew) : 'Keine Antwort ausgewählt.'),
      h('p', null, h('strong', null, 'Richtige Antwort: '), listOrText(rich)),
      h('p', null, h('strong', null, 'Erklärung: '), q.erklaerung),
      quelle ? h('p', { class: 'quelle' }, h('strong', null, 'Quelle: '),
        quelle.url ? h('a', { href: quelle.url, target: '_blank', rel: 'noopener noreferrer' }, quelle.name) : quelle.name,
        q.rechtsgrundlage ? (' · Rechtsgrundlage: ' + q.rechtsgrundlage) : '') : null
    );
    if (q.visual) {
      var v = node.querySelector('.visual');
      v.innerHTML = q.visual;
      var svg = v.querySelector('svg');
      if (svg) { svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false'); }
    }
    return node;
  }
  function listOrText(arr) {
    if (arr.length === 1) { return arr[0]; }
    return h('ul', { class: 'liste' }, arr.map(function (t) { return h('li', null, t); }));
  }

  /* Start */
  viewIntro();
})();
