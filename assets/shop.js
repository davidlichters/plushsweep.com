// PlushSweep Vorschau: Stufenwahl, Galerie-Punkte, Sticky-Kaufleiste, Kaufknopf ohne Kasse.
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function stufeSetzen() {
    var a = $('input[name="menge"]:checked');
    if (!a) return;
    $$('[data-preis-anzeige]').forEach(function (el) { el.textContent = a.dataset.preis; });
    $$('[data-titel-anzeige]').forEach(function (el) { el.textContent = a.dataset.titel; });
  }
  $$('input[name="menge"]').forEach(function (i) { i.addEventListener('change', stufeSetzen); });
  stufeSetzen();

  // Lieferdatum: heute + Bearbeitung (Werktage) + Laufzeit (Tage), gleiche Rechnung wie bau/bauen.py
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function werktage(d, n) { d = new Date(d); while (n > 0) { d.setDate(d.getDate() + 1); var w = d.getDay(); if (w > 0 && w < 6) n--; } return d; }
  function tage(d, n) { d = new Date(d); d.setDate(d.getDate() + n); return d; }
  function fmt(d) { return MON[d.getMonth()] + ' ' + d.getDate(); }
  $$('[data-lieferung]').forEach(function (el) {
    var b = el.dataset.bearb.split(',').map(Number), l = el.dataset.lauf.split(',').map(Number), h = new Date();
    var t = fmt(tage(werktage(h, b[0]), l[0])) + ' to ' + fmt(tage(werktage(h, b[1]), l[1]));
    var m = el.querySelector('mark'); if (m) m.textContent = t; else el.textContent = t;
  });

  var toast = $('#toast'), zeit;
  $$('[data-kauf]').forEach(function (k) {
    k.addEventListener('click', function () {
      toast.textContent = 'Preview only: checkout is not connected yet.';
      toast.classList.add('zeigen');
      clearTimeout(zeit);
      zeit = setTimeout(function () { toast.classList.remove('zeigen'); }, 2600);
    });
  });

  var band = $('#galerie'), punkte = $$('#punkte a').concat($$('#daumen a'));
  if (band && punkte.length) {
    var anz = $$('#punkte a').length || punkte.length;
    punkte.forEach(function (p, j) {
      var i = j % anz;
      p.addEventListener('click', function (e) {
        e.preventDefault();
        band.scrollTo({ left: band.clientWidth * i, behavior: 'smooth' });
      });
    });
    band.addEventListener('scroll', function () {
      var i = Math.round(band.scrollLeft / band.clientWidth);
      punkte.forEach(function (p, k) { p.classList.toggle('aktiv', k % anz === i); });
    }, { passive: true });
  }

  var sticky = $('#sticky'), kauf = $('#kauf .knopf');
  if (sticky && kauf) {
    var lauf = false;
    var pruefen = function () {
      lauf = false;
      // Leiste erst zeigen, wenn Stufen und Kaufknopf nach oben aus dem Bild gescrollt sind (Kurs K:28, Regel 4), nie beim Laden
      var unten = kauf.getBoundingClientRect().bottom < 0;
      sticky.classList.toggle('zeigen', unten);
      sticky.setAttribute('aria-hidden', unten ? 'false' : 'true');
      $('button', sticky).tabIndex = unten ? 0 : -1;
    };
    window.addEventListener('scroll', function () { if (!lauf) { lauf = true; requestAnimationFrame(pruefen); } }, { passive: true });
    pruefen();
  }
  // Lange Stimmen gekuerzt (CSS line-clamp); nur wo wirklich abgeschnitten, ein Knopf 'Read more'
  function kuerzen(f) {
    var q = f.querySelector('blockquote');
    if (!q || f.querySelector('.stimme__mehr') || q.scrollHeight <= q.clientHeight + 2) return;
    var k = document.createElement('button'); k.className = 'stimme__mehr'; k.type = 'button'; k.textContent = 'Read more';
    k.addEventListener('click', function () { var o = f.classList.toggle('offen'); k.textContent = o ? 'Show less' : 'Read more'; });
    q.insertAdjacentElement('afterend', k);
  }
  $$('.stimme').forEach(kuerzen);
  // Bewertungen: 4 stehen im HTML, "Show more" laedt reviews.json einmal und haengt je 20 an; "See all photos" haengt die uebrigen Fotos an
  var bewDaten = null, bewPos = 0, mehr = $('[data-bew-mehr]'), fotoMehr = $('[data-fotos-mehr]');
  function laden(fertig) {
    if (bewDaten) return fertig();
    fetch(mehr.dataset.quelle).then(function (r) { return r.json(); }).then(function (d) { bewDaten = d; fertig(); });
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
  var basis = mehr ? mehr.dataset.quelle.replace(/assets\/reviews\.json$/, '') : '';
  // 07.11.: Fotos in Stimmen laden sofort (kein Nachladen beim Scrollen); nur die 440 Fotos in der Scrollbox 'See all' bleiben lazy
  function bild(h, w, lazy) { var i = el('img'); i.src = basis + 'img/kunden/' + h + '.webp'; i.alt = 'Customer photo'; i.width = w; i.height = w; if (lazy) i.loading = 'lazy'; i.decoding = 'async'; return i; }
  function karte(r) {
    var f = el('figure', 'stimme'), st = el('span', 'sterne sterne--klein'), v = el('span', 'sterne__voll');
    st.setAttribute('role', 'img'); st.setAttribute('aria-label', r[1] + '.0 out of 5 stars'); v.style.width = (r[1] * 20) + '%'; st.appendChild(v); f.appendChild(st);
    if (r[2]) f.appendChild(el('b', 'stimme__titel', r[2]));
    var q = el('blockquote');
    r[3].split('\n').filter(function (z) { return z.trim(); }).forEach(function (z, i) { if (i) q.appendChild(el('br')); q.appendChild(document.createTextNode(z)); });
    f.appendChild(q);
    if (r[4].length) { var fs = el('div', 'stimme__fotos'); r[4].slice(0, 3).forEach(function (h) { fs.appendChild(bild(h, 120)); }); f.appendChild(fs); }
    f.appendChild(el('figcaption', '', r[0]));
    return f;
  }
  if (mehr) mehr.addEventListener('click', function () {
    mehr.disabled = true;
    laden(function () {
      var liste = $('#bew-liste'), bis = Math.min(bewPos + 20, bewDaten.r.length);
      for (; bewPos < bis; bewPos++) { var kk = karte(bewDaten.r[bewPos]); liste.appendChild(kk); kuerzen(kk); }
      mehr.disabled = false;
      var rest = bewDaten.r.length - bewPos;
      if (rest <= 0) mehr.remove(); else mehr.textContent = 'Show more reviews (' + rest.toLocaleString('en-US') + ' left)';
    });
  });
  if (fotoMehr && mehr) fotoMehr.addEventListener('click', function () {
    fotoMehr.disabled = true;
    laden(function () {
      var ul = $('#bew-fotos');
      bewDaten.fotos.forEach(function (h) { var li = el('li'); li.appendChild(bild(h, 360, true)); ul.appendChild(li); });
      ul.classList.add('bew__fotos--alle'); fotoMehr.remove();
    });
  });
})();