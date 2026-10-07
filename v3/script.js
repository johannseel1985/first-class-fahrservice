/* First Class auf der Straße · Version 3
   Scroll-Film ohne externe Bibliotheken */
(() => {
  'use strict';

  const root = document.documentElement;
  root.classList.add('js');
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(Math.max(v, a), b);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => window.innerWidth < 768;
  const ease = (t) => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  /* Fortschritt eines Elements beim Durchscrollen (0 bis 1) */
  const through = (el, start = 1, end = 0) => {
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const a = vh * start;
    const b = vh * end - r.height;
    return clamp((a - r.top) / (a - b));
  };
  const pinned = (el) => {
    const r = el.getBoundingClientRect();
    return clamp(-r.top / Math.max(el.offsetHeight - window.innerHeight, 1));
  };

  /* ---------- Scroll-gesteuertes Video ---------- */
  class Scrubber {
    constructor(video) {
      this.v = video;
      this.target = 0;
      this.current = 0;
      this.loaded = false;
      this.loading = false;
    }
    load() {
      if (this.loaded || this.loading || reduce) return;
      this.loading = true;
      const src = isMobile() && this.v.dataset.srcM ? this.v.dataset.srcM : this.v.dataset.src;
      fetch(src).then((r) => r.blob()).then((blob) => {
        this.v.src = URL.createObjectURL(blob);
        this.v.addEventListener('loadeddata', () => {
          this.loaded = true;
          this.v.pause();
          this.v.currentTime = this.target * (this.v.duration || 0);
          this.v.classList.add('ready');
        }, { once: true });
        this.v.load();
      }).catch(() => { this.loading = false; });
    }
    set(p) { this.target = clamp(p); }
    tick() {
      if (!this.loaded || !this.v.duration) return;
      this.current += (this.target - this.current) * .18;
      if (Math.abs(this.target - this.current) < .0005) this.current = this.target;
      const t = this.current * (this.v.duration - .05);
      if (!this.v.seeking && Math.abs(this.v.currentTime - t) > .012) {
        if (this.v.fastSeek && Math.abs(this.v.currentTime - t) > 1.5) this.v.fastSeek(t);
        else this.v.currentTime = t;
      }
    }
  }

  const scrubbers = new Map();
  $$('video.scrub').forEach((v) => scrubbers.set(v, new Scrubber(v)));

  if ('IntersectionObserver' in window) {
    const lazy = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        $$('video.scrub', e.target).forEach((v) => scrubbers.get(v).load());
        lazy.unobserve(e.target);
      });
    }, { rootMargin: '150% 0px' });
    $$('.hero, .film, .drive').forEach((s) => lazy.observe(s));
  }
  // iOS: Videos einmal mit einer Geste „aufwecken“, damit Seeking zuverlässig klappt
  const prime = () => {
    scrubbers.forEach((s) => { if (s.loaded) s.v.play().then(() => s.v.pause()).catch(() => {}); });
    window.removeEventListener('touchstart', prime);
  };
  window.addEventListener('touchstart', prime, { passive: true });

  /* ---------- Elemente ---------- */
  const topbar = $('#topbar');
  const hero = $('.hero');
  const heroVideo = $('.hero video.scrub');
  const words = (() => {
    const el = $('[data-words]');
    if (!el) return [];
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const s = document.createElement('span');
            s.className = 'w';
            s.textContent = part;
            frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    return { el, list: $$('.w', el) };
  })();
  const portrait = $('[data-portrait]');
  const film = $('.film');
  const scenes = $$('.scene');
  const captions = $$('.caption');
  const clock = $('.hud-clock');
  const clockLabel = $('.hud-label');
  const clockIndex = $('.hud-index');
  const drive = $('[data-drive]');
  const driveFlow = window.matchMedia('(max-width: 767px), (max-width: 1024px) and (orientation: portrait)');
  const steps = $('[data-steps]');
  const stepItems = $$('.step');
  const airports = $('.airports');
  const routeCodes = ['fkb', 'sxb', 'str', 'bsl', 'fra'];
  const dock = $('.dock-cta');
  const contact = $('#anfrage');

  const timeline = [
    { t: 5 * 60 + 40, label: 'Abholung' },
    { t: 7 * 60 + 10, label: 'Flughafen' },
    { t: 10 * 60, label: 'Termin' },
    { t: 20 * 60 + 15, label: 'Abend' },
    { t: 23 * 60 + 40, label: 'Angekommen' }
  ];
  const fmt = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;
  let lastCaption = -1;
  let routeMax = 0;


  /* ---------- Leistungen: Galerie ---------- */
  const gallery = $('[data-gallery]');
  const track = gallery && $('[data-track]', gallery);
  const gCards = gallery ? $$('[data-card]', gallery) : [];
  const gIndex = gallery && $('[data-gallery-index]', gallery);
  const desktopGallery = () => window.innerWidth >= 1025 && !reduce;
  let gOverflow = 0;
  let gActive = -1;

  const setupGallery = () => {
    if (!gallery) return;
    if (desktopGallery()) {
      gallery.classList.add('pinned');
      track.style.setProperty('--gx', '0px');
      gOverflow = Math.max(track.scrollWidth - window.innerWidth, 0);
      gallery.style.setProperty('--gh', `${gOverflow + window.innerHeight * 1.15}px`);
    } else {
      gallery.classList.remove('pinned');
      gallery.style.removeProperty('--gh');
      track.style.setProperty('--gx', '0px');
      gOverflow = 0;
    }
  };

  const playCard = (card, on) => {
    const v = $('video', card);
    if (!v) return;
    if (on) {
      if (!v.src) v.src = isMobile() && v.dataset.srcM ? v.dataset.srcM : v.dataset.src;
      v.play().then(() => card.classList.add('playing')).catch(() => {});
    } else {
      v.pause();
      card.classList.remove('playing');
    }
  };

  const setActive = (i) => {
    if (i === gActive) return;
    gActive = i;
    gCards.forEach((c, k) => {
      c.classList.toggle('on', k === i);
      if (!c.matches(':hover')) playCard(c, k === i && !reduce);
    });
    if (gIndex) gIndex.textContent = String(i + 1).padStart(2, '0');
  };

  function galleryFrame(vh) {
    if (!gallery) return;
    const vw = window.innerWidth;
    let p;
    if (gallery.classList.contains('pinned')) {
      p = pinned(gallery);
      track.style.setProperty('--gx', `${(-p * gOverflow).toFixed(1)}px`);
    } else {
      p = track.scrollLeft / Math.max(track.scrollWidth - track.clientWidth, 1);
      const r = gallery.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
    }
    gallery.style.setProperty('--gp', p.toFixed(4));
    let best = 0;
    let bestD = Infinity;
    gCards.forEach((c, k) => {
      const r = c.getBoundingClientRect();
      const center = r.left + r.width / 2;
      const d = Math.abs(center - vw / 2);
      if (d < bestD) { bestD = d; best = k; }
      c.style.setProperty('--kx', `${(((center - vw / 2) / vw) * -6).toFixed(2)}%`);
    });
    best = Math.round(p * (gCards.length - 1));
    const r = gallery.getBoundingClientRect();
    if (r.top < vh * .75 && r.bottom > vh * .25) setActive(best);
  }

  if (gallery) {
    track.addEventListener('scroll', request, { passive: true });
    gCards.forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse' || reduce) return;
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.classList.add('tilt');
        card.style.setProperty('--ry', `${((x - .5) * 10).toFixed(2)}deg`);
        card.style.setProperty('--rx', `${((.5 - y) * 8).toFixed(2)}deg`);
        card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      });
      card.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') playCard(card, true); });
      card.addEventListener('pointerleave', () => {
        card.classList.remove('tilt');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
        if (!card.classList.contains('on')) playCard(card, false);
      });
    });
    setupGallery();
    window.addEventListener('resize', () => { setupGallery(); request(); }, { passive: true });
    window.addEventListener('load', () => { setupGallery(); request(); });
  }

  /* ---------- Hauptschleife ---------- */
  let queued = false;
  function frame() {
    queued = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    root.style.setProperty('--p', (y / Math.max(root.scrollHeight - vh, 1)).toFixed(4));
    topbar.classList.toggle('solid', y > 30);

    if (hero) {
      const h = reduce ? 0 : pinned(hero);
      hero.style.setProperty('--h', h.toFixed(4));
      const c = 1 - ease(clamp((h - .05) / .3));
      const b = Math.min(ease(clamp((h - .3) / .24)), 1 - ease(clamp((h - .84) / .16)));
      hero.style.setProperty('--c', (reduce ? 1 : c).toFixed(3));
      hero.style.setProperty('--b', (reduce ? 0 : b).toFixed(3));
      if (heroVideo) scrubbers.get(heroVideo).set(ease(h));
    }

    if (words.list && words.list.length) {
      const p = reduce ? 1 : through(words.el, .9, .4);
      const n = Math.round(p * words.list.length * 1.05);
      words.list.forEach((w, i) => w.classList.toggle('on', i < n));
    }

    if (portrait) portrait.style.setProperty('--c', (reduce ? 0 : 1 - clamp(through(portrait, 1, .45) * 1.35)).toFixed(4));

    if (film && scenes.length && !reduce) {
      const r = film.getBoundingClientRect();
      const p = pinned(film);
      const n = scenes.length;
      const x = p * n;
      const fade = .14;
      film.style.setProperty('--f', p.toFixed(4));
      const enter = clamp((vh - r.top) / vh);
      const leave = clamp((r.bottom - vh) / (vh * .6));
      film.style.setProperty('--bars', (Math.min(enter, leave) * (isMobile() ? .5 : 1)).toFixed(3));
      scenes.forEach((sc, i) => {
        let o;
        if (i === 0) o = clamp((i + 1 + fade - x) / (fade * 2));
        else if (i === n - 1) o = clamp((x - i + fade) / (fade * 2));
        else o = Math.min(clamp((x - i + fade) / (fade * 2)), clamp((i + 1 + fade - x) / (fade * 2)));
        sc.style.opacity = o.toFixed(3);
        sc.style.visibility = o > .001 ? 'visible' : 'hidden';
        const local = clamp((x - i + fade) / (1 + fade * 2));
        sc.style.setProperty('--s', local.toFixed(4));
        const v = $('video.scrub', sc);
        if (v) scrubbers.get(v).set(local);
      });
      const active = Math.min(n - 1, Math.floor(x));
      if (active !== lastCaption) {
        captions.forEach((c, i) => c.classList.toggle('on', i === active));
        clockIndex.textContent = String(active + 1).padStart(2, '0');
        clockLabel.textContent = timeline[active].label;
        lastCaption = active;
      }
      const seg = active;
      const frac = seg === n - 1 ? 0 : clamp(x - seg);
      const e = frac < .72 ? 0 : (frac - .72) / .28;
      const from = timeline[seg].t;
      const to = timeline[Math.min(seg + 1, n - 1)].t;
      clock.textContent = fmt(from + (to - from) * e);
    }

    if (drive) {
      const r = drive.getBoundingClientRect();
      const enter = clamp((vh - r.top) / vh);
      drive.style.setProperty('--v', (reduce ? 1 : ease(enter)).toFixed(4));
      const dv = $('video.scrub', drive);
      if (driveFlow.matches) {
        /* Smartphone/Tablet hochkant: kein Anpinnen, der Film läuft beim Durchscrollen ab */
        const sr = $('.drive-media', drive).getBoundingClientRect();
        const q = clamp((vh * .98 - sr.top) / (vh * .98 - vh * .2));
        drive.style.setProperty('--v', '1');
        if (dv) scrubbers.get(dv).set(reduce ? 1 : q);
        drive.style.setProperty('--sp', (reduce ? 1 : clamp((q - .15) / .6)).toFixed(4));
      } else {
        const dp = pinned(drive);
        if (dv) scrubbers.get(dv).set(reduce ? 1 : clamp(dp * 1.35));
        drive.style.setProperty('--sp', (reduce ? 1 : clamp((dp - .58) / .34)).toFixed(4));
      }
    }

    if (gallery) galleryFrame(vh);

    if (steps) {
      const p = reduce ? 1 : through(steps, .82, .5);
      steps.style.setProperty('--sp', p.toFixed(4));
      stepItems.forEach((s, i) => s.classList.toggle('on', p >= i / stepItems.length + .02 || p === 1));
    }

    if (airports && !selected) {
      const grid = $('.airports-grid', airports);
      const gt = grid.getBoundingClientRect().top;
      const p = reduce ? 1 : clamp((vh * .95 - gt) / (vh * .55));
      routeMax = Math.max(routeMax, p);
      routeCodes.forEach((code, i) => {
        const local = clamp((routeMax - i * .12) / .4);
        $$(`[data-route="${code}"]`, airports).forEach((el) => el.style.setProperty('--r', local.toFixed(3)));
      });
    }

    if (dock && contact) dock.classList.toggle('show', y > vh * .9 && contact.getBoundingClientRect().top > vh * .55);
  }
  function request() { if (!queued) { queued = true; requestAnimationFrame(frame); } }

  /* Videos werden in einer eigenen Schleife weich nachgeführt */
  (function loop() {
    scrubbers.forEach((s) => s.tick());
    requestAnimationFrame(loop);
  })();

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request, { passive: true });

  /* ---------- Einblenden ---------- */
  const reveals = $$('.reveal');
  if (reduce || !('IntersectionObserver' in window)) reveals.forEach((el) => el.classList.add('in'));
  else {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    reveals.forEach((el) => io.observe(el));
  }

  /* ---------- Aktiver Menüpunkt ---------- */
  const navLinks = $$('.nav a[href^="#"]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) navLinks.forEach((a) => a.classList.toggle('current', a.getAttribute('href') === `#${e.target.id}`));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean).forEach((s) => io.observe(s));
  }

  /* ---------- Menü ---------- */
  const menuBtn = $('.menu-btn');
  const setMenu = (open) => {
    root.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
  };
  menuBtn.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
  $$('.nav a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- Abflugtafel ---------- */
  const board = $('[data-board]');
  const rows = $$('.row', board);
  const detail = $('.board-detail-text', board);
  const boardCta = $('[data-board-cta]', board);
  let selected = null;

  const flapChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const runFlaps = () => {
    $$('.flap', board).forEach((el, k) => {
      const final = el.dataset.flap;
      el.setAttribute('aria-label', final);
      el.innerHTML = final.split('').map(() => '<b aria-hidden="true"> </b>').join('');
      const cells = $$('b', el);
      cells.forEach((cell, i) => {
        const target = final[i];
        if (target === ':' ) { cell.textContent = ':'; return; }
        let n = 0;
        const max = 8 + i * 3 + k;
        const id = setInterval(() => {
          n += 1;
          cell.textContent = n >= max ? target : flapChars[Math.floor(Math.random() * flapChars.length)];
          if (n >= max) clearInterval(id);
        }, 55);
      });
    });
  };
  if (board) {
    if (reduce || !('IntersectionObserver' in window)) $$('.flap', board).forEach((el) => { el.innerHTML = el.dataset.flap.split('').map((c) => `<b aria-hidden="true">${c}</b>`).join(''); });
    else {
      const io = new IntersectionObserver((entries, obs) => { if (entries[0].isIntersecting) { runFlaps(); obs.disconnect(); } }, { threshold: .35 });
      io.observe(board);
    }
  }

  const select = (code) => {
    selected = code;
    rows.forEach((r) => r.setAttribute('aria-pressed', String(r.dataset.route === code)));
    $$('.map-route, .map-airport').forEach((el) => {
      el.classList.toggle('active', el.dataset.route === code);
      el.classList.toggle('dim', el.dataset.route !== code);
      el.style.setProperty('--r', el.dataset.route === code ? '1' : '1');
    });
    const row = rows.find((r) => r.dataset.route === code);
    const name = $('.dest strong', row).textContent;
    detail.innerHTML = `<strong>${name}</strong> · ${$('.km', row).textContent} · ca. ${$('.time', row).dataset.flap.replace(':', ' Std. ').replace(/^0 Std\. /, '')} Min. Fahrt.<br>Die Abholzeit stimmen wir persönlich mit Ihnen ab.`;
    boardCta.hidden = false;
    boardCta.textContent = `Transfer nach ${code.toUpperCase()} anfragen`;
    boardCta.dataset.name = row.dataset.name;
  };
  rows.forEach((r) => r.addEventListener('click', () => select(r.dataset.route)));
  $$('.map-airport').forEach((g) => g.addEventListener('click', () => select(g.dataset.route)));
  if (boardCta) boardCta.addEventListener('click', () => {
    const to = $('#to');
    to.value = boardCta.dataset.name || '';
    to.classList.add('flash');
    setTimeout(() => to.classList.remove('flash'), 1600);
    setTimeout(() => $('#from').focus({ preventScroll: true }), 900);
  });

  /* ---------- Anfrageformular ---------- */
  const form = $('#requestForm');
  const err = $('#formError');
  const PHONE = '4915126388936';
  const EMAIL = 'info_hansen@gmx.de';
  const dateDE = (iso) => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}.${m}.${y}`; };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const channel = (e.submitter && e.submitter.dataset.channel) || 'whatsapp';
    const data = new FormData(form);
    const get = (k) => String(data.get(k) || '').trim();
    const req = [$('#from'), $('#to')];
    const missing = req.filter((i) => !i.value.trim());
    req.forEach((i) => i.setAttribute('aria-invalid', String(!i.value.trim())));
    if (missing.length) { err.hidden = false; missing[0].focus(); return; }
    err.hidden = true;
    const name = get('name');
    const lines = [
      name ? `Guten Tag Herr Hansen, hier ist ${name}. Ich möchte gerne eine Fahrt anfragen.` : 'Guten Tag Herr Hansen, ich möchte gerne eine Fahrt anfragen.',
      '',
      `Abholort: ${get('from')}`,
      `Ziel: ${get('to')}`,
      `Datum: ${dateDE(get('date')) || 'noch offen'}`,
      `Uhrzeit: ${get('time') ? `${get('time')} Uhr` : 'noch offen'}`,
      `Fahrgäste: ${get('people') || '1'}`
    ];
    if (get('note')) lines.push(`Hinweis: ${get('note')}`);
    const text = lines.join('\n');
    if (channel === 'mail') {
      const subject = `Fahrtanfrage ${dateDE(get('date'))}`.trim();
      window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    } else {
      window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    }
  });
  const dateInput = $('#date');
  const now = new Date();
  dateInput.min = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  $('#year').textContent = now.getFullYear();

  frame();
  window.addEventListener('load', request);
})();
