/* First Class auf der Straße · Scroll-Inszenierung ohne externe Bibliotheken */
(() => {
  'use strict';

  const root = document.documentElement;
  root.classList.add('js');

  const clamp = (v, min = 0, max = 1) => Math.min(Math.max(v, min), max);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const topbar = $('#topbar');
  const hero = $('.hero');
  const film = $('.film');
  const scenes = $$('.scene');
  const captions = $$('.caption');
  const hudClock = $('.hud-clock');
  const hudLabel = $('.hud-label');
  const hudIndex = $('.hud-index');
  const stepsList = $('[data-steps]');
  const steps = $$('.step');
  const stepsLine = $('.steps-line');
  const region = $('.region');
  const routes = $$('.route');
  const airports = $$('.map-svg .airport');
  const airportItems = $$('[data-airports] li');
  const portrait = $('.portrait-frame');
  const mobileCta = $('.mobile-cta');
  const contact = $('#anfrage');
  const scrubText = $('[data-scrub]');
  const navLinks = $$('.topnav a[href^="#"]');

  /* ---------- Film: Uhrzeit läuft wie ein Tag ---------- */
  const timeline = [
    { t: 5 * 60 + 40, label: 'Abholung' },
    { t: 7 * 60 + 10, label: 'Flughafen' },
    { t: 10 * 60 + 0, label: 'Termin' },
    { t: 20 * 60 + 15, label: 'Abend' },
    { t: 23 * 60 + 40, label: 'Angekommen' }
  ];
  const formatTime = (min) => {
    const h = Math.floor(min / 60) % 24;
    const m = Math.floor(min % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  /* ---------- Statement: Wörter erscheinen beim Scrollen ---------- */
  let words = [];
  if (scrubText) {
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const span = document.createElement('span');
            span.className = 'w';
            span.textContent = part;
            frag.appendChild(span);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      });
    };
    walk(scrubText);
    words = $$('.w', scrubText);
  }

  /* ---------- Hilfsfunktion: Fortschritt eines Elements ---------- */
  const progressThrough = (el, startFactor = 1, endFactor = 0) => {
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const start = vh * startFactor;
    const end = vh * endFactor - rect.height;
    return clamp((start - rect.top) / (start - end));
  };

  let lastCaption = -1;
  let ticking = false;

  function update() {
    ticking = false;
    const y = window.scrollY || root.scrollTop;
    const vh = window.innerHeight;
    const maxScroll = Math.max(root.scrollHeight - vh, 1);
    root.style.setProperty('--scroll-progress', (y / maxScroll).toFixed(4));
    topbar?.classList.toggle('is-scrolled', y > 24);

    const motion = !reduceMotion.matches;

    /* Hero */
    if (hero) {
      const p = motion ? clamp(y / Math.max(hero.offsetHeight, 1)) : 0;
      hero.style.setProperty('--hero-p', p.toFixed(4));
    }

    /* Statement */
    if (words.length) {
      const p = motion ? progressThrough(scrubText, .85, .45) : 1;
      const count = Math.round(p * words.length * 1.05);
      words.forEach((w, i) => w.classList.toggle('on', i < count));
    }

    /* Film */
    if (film && scenes.length) {
      const rect = film.getBoundingClientRect();
      const travel = Math.max(film.offsetHeight - vh, 1);
      const p = clamp(-rect.top / travel);
      const n = scenes.length;
      const x = p * n;
      const fade = .16;

      film.style.setProperty('--film-p', p.toFixed(4));
      // Kinobalken: kommen beim Eintritt, gehen am Ende
      const enter = clamp((vh - rect.top) / vh);
      const leave = clamp((rect.bottom - vh) / (vh * .6));
      film.style.setProperty('--bars', (Math.min(enter, leave) * (window.innerWidth < 861 ? .55 : 1)).toFixed(3));

      scenes.forEach((scene, i) => {
        const local = clamp(x - i);
        let opacity;
        if (i === 0) opacity = clamp((i + 1 + fade - x) / (fade * 2));
        else if (i === n - 1) opacity = clamp((x - i + fade) / (fade * 2));
        else opacity = Math.min(clamp((x - i + fade) / (fade * 2)), clamp((i + 1 + fade - x) / (fade * 2)));
        scene.style.opacity = opacity.toFixed(3);
        scene.style.visibility = opacity > 0.001 ? 'visible' : 'hidden';
        scene.style.setProperty('--s', motion ? local.toFixed(4) : '.5');
      });

      const active = Math.min(n - 1, Math.floor(x));
      if (active !== lastCaption) {
        captions.forEach((c, i) => c.classList.toggle('is-active', i === active));
        if (hudIndex) hudIndex.textContent = String(active + 1).padStart(2, '0');
        if (hudLabel) hudLabel.textContent = timeline[active].label;
        lastCaption = active;
      }
      // Uhr läuft innerhalb der Szene zur nächsten Uhrzeit
      const seg = Math.min(n - 1, Math.floor(x));
      const from = timeline[seg].t;
      const to = timeline[Math.min(seg + 1, n - 1)].t;
      const frac = seg === n - 1 ? 0 : clamp(x - seg);
      const eased = frac < .7 ? 0 : (frac - .7) / .3;
      if (hudClock) hudClock.textContent = formatTime(from + (to - from) * eased);
    }

    /* Ablauf */
    if (stepsList && steps.length) {
      const p = motion ? progressThrough(stepsList, .8, .55) : 1;
      stepsList.parentElement.style.setProperty('--steps-p', p.toFixed(4));
      steps.forEach((step, i) => step.classList.toggle('is-on', p >= i / steps.length + .02 || p === 1));
    }

    /* Region: Strecken zeichnen sich */
    if (region && routes.length) {
      const p = motion ? progressThrough(region, .85, .35) : 1;
      const order = ['fkb', 'sxb', 'str', 'bsl', 'fra'];
      order.forEach((code, i) => {
        const local = clamp((p - i * .14) / .32);
        $$(`[data-route="${code}"]`, region).forEach((el) => el.style.setProperty('--r', local.toFixed(3)));
        airportItems.find((li) => li.dataset.route === code)?.classList.toggle('is-on', local > .85);
      });
    }

    /* Porträt öffnet sich */
    if (portrait) {
      const p = motion ? progressThrough(portrait, 1, .5) : 1;
      portrait.style.setProperty('--clip', (1 - clamp(p * 1.4)).toFixed(4));
    }

    /* Mobiler Button */
    if (mobileCta && contact) {
      const contactTop = contact.getBoundingClientRect().top;
      mobileCta.classList.toggle('is-visible', y > vh * .9 && contactTop > vh * .6);
    }
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', () => { positionStepsLine(); requestUpdate(); }, { passive: true });

  /* Linie der Schritte an den Punkten ausrichten */
  function positionStepsLine() {
    if (!stepsLine || !steps.length) return;
    const grid = stepsLine.parentElement.getBoundingClientRect();
    const first = steps[0].querySelector('.step-dot').getBoundingClientRect();
    const last = steps[steps.length - 1].querySelector('.step-dot').getBoundingClientRect();
    const mobile = window.innerWidth < 861;
    stepsLine.style.setProperty('--line-top', `${(mobile ? first.top + first.height / 2 : first.top + first.height / 2) - grid.top}px`);
    if (mobile) stepsLine.style.setProperty('--line-bottom', `${grid.bottom - (last.top + last.height / 2)}px`);
  }

  /* ---------- Reveal ---------- */
  const revealEls = $$('.reveal');
  if (reduceMotion.matches || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  } else {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: .1 });
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- Aktiver Menüpunkt ---------- */
  if ('IntersectionObserver' in window) {
    const sections = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);
    const navIo = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === `#${entry.target.id}`));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => navIo.observe(s));
  }

  /* ---------- Mobiles Menü ---------- */
  const menuToggle = $('.menu-toggle');
  const setMenu = (open) => {
    root.classList.toggle('menu-open', open);
    menuToggle?.setAttribute('aria-expanded', String(open));
    menuToggle?.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
  };
  menuToggle?.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
  navLinks.forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- Anfrageformular ---------- */
  const form = $('#requestForm');
  const errorBox = $('#formError');
  const PHONE = '4915126388936';
  const EMAIL = form?.dataset.email || $('.contact-direct a[href^="mailto:"]')?.getAttribute('href').replace('mailto:', '') || '';

  const formatDate = (iso) => {
    if (!iso) return '';
    const [yy, mm, dd] = iso.split('-');
    return `${dd}.${mm}.${yy}`;
  };

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const channel = event.submitter?.dataset.channel || 'whatsapp';
    const data = new FormData(form);
    const get = (k) => String(data.get(k) || '').trim();
    const fromInput = $('#from');
    const toInput = $('#to');

    const missing = [fromInput, toInput].filter((input) => !input.value.trim());
    [fromInput, toInput].forEach((input) => input.setAttribute('aria-invalid', String(!input.value.trim())));
    if (missing.length) {
      errorBox.hidden = false;
      missing[0].focus();
      return;
    }
    errorBox.hidden = true;

    const name = get('name');
    const lines = [
      name ? `Guten Tag Herr Hansen, hier ist ${name}. Ich möchte gerne eine Fahrt anfragen.` : 'Guten Tag Herr Hansen, ich möchte gerne eine Fahrt anfragen.',
      '',
      `Abholort: ${get('from')}`,
      `Ziel: ${get('to')}`,
      `Datum: ${formatDate(get('date')) || 'noch offen'}`,
      `Uhrzeit: ${get('time') ? `${get('time')} Uhr` : 'noch offen'}`,
      `Fahrgäste: ${get('people') || '1'}`,
      get('note') ? `Hinweis: ${get('note')}` : ''
    ].filter((line, i, arr) => line !== '' || (i > 0 && arr[i - 1] !== ''));

    const text = lines.join('\n');
    if (channel === 'mail') {
      const subject = `Fahrtanfrage ${formatDate(get('date')) || ''}`.trim();
      window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    } else {
      window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    }
  });

  const dateInput = $('#date');
  if (dateInput) {
    const now = new Date();
    dateInput.min = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  positionStepsLine();
  window.addEventListener('load', () => { positionStepsLine(); requestUpdate(); });
  update();
})();
