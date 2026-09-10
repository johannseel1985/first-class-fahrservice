document.documentElement.classList.add('js');

const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const topbar = document.getElementById('topbar');
const hero = document.querySelector('.hero');
const vehicle = document.querySelector('.vehicle');
const serviceStories = Array.from(document.querySelectorAll('[data-service]'));
const serviceImages = Array.from(document.querySelectorAll('[data-service-media]'));
const serviceGallery = document.querySelector('.service-gallery');
const galleryNumber = document.querySelector('.service-gallery-number');
const galleryName = document.querySelector('.service-gallery-name');

const serviceLabels = {
  airport: { number: '01', name: 'Flughafentransfer' },
  business: { number: '02', name: 'Businessfahrten' },
  private: { number: '03', name: 'Privatfahrten' }
};

let activeService = 'airport';
let frameRequested = false;

function activateService(name) {
  if (!serviceLabels[name] || activeService === name) return;
  activeService = name;

  serviceStories.forEach((story) => {
    story.classList.toggle('is-active', story.dataset.service === name);
  });

  serviceImages.forEach((image) => {
    image.classList.toggle('is-active', image.dataset.serviceMedia === name);
  });

  if (galleryNumber) galleryNumber.textContent = serviceLabels[name].number;
  if (galleryName) galleryName.textContent = serviceLabels[name].name;
}

function updateServiceStory() {
  if (!serviceStories.length) return;

  const isMobile = window.innerWidth < 768;
  const galleryRect = serviceGallery?.getBoundingClientRect();
  const galleryBottom = galleryRect
    ? clamp(galleryRect.bottom, 0, window.innerHeight)
    : window.innerHeight * .5;
  const viewportCenter = isMobile
    ? clamp(
        galleryBottom + (window.innerHeight - galleryBottom) * .48,
        window.innerHeight * .64,
        window.innerHeight * .86
      )
    : window.innerHeight * .5;
  let closestStory = serviceStories[0];
  let closestDistance = Number.POSITIVE_INFINITY;

  serviceStories.forEach((story) => {
    const rect = story.getBoundingClientRect();
    const storyCenter = rect.top + rect.height * .5;
    const distance = Math.abs(storyCenter - viewportCenter);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestStory = story;
    }
  });

  activateService(closestStory.dataset.service);
}

serviceImages.forEach((image) => {
  const decodeImage = () => image.decode?.().catch(() => {});
  if (image.complete) decodeImage();
  else image.addEventListener('load', decodeImage, { once: true });
});

function updateScrollEffects() {
  frameRequested = false;
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollRange = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  document.documentElement.style.setProperty('--scroll-progress', (scrollTop / scrollRange).toFixed(4));

  if (topbar) topbar.classList.toggle('is-scrolled', scrollTop > 20);

  if (!prefersReducedMotion.matches && hero) {
    const heroRect = hero.getBoundingClientRect();
    const progress = clamp(-heroRect.top / Math.max(heroRect.height, 1));
    hero.style.setProperty('--hero-scale', (1.025 + progress * .075).toFixed(4));
    hero.style.setProperty('--hero-copy-shift', `${(progress * 64).toFixed(1)}px`);
    hero.style.setProperty('--hero-copy-opacity', (1 - progress * .76).toFixed(3));
  }

  if (!prefersReducedMotion.matches && vehicle) {
    const vehicleRect = vehicle.getBoundingClientRect();
    const travel = Math.max(vehicle.offsetHeight - window.innerHeight, 1);
    const progress = clamp(-vehicleRect.top / travel);
    vehicle.style.setProperty('--vehicle-scale', (1.01 + progress * .085).toFixed(4));
    vehicle.style.setProperty('--vehicle-shift', `${(-progress * 12).toFixed(1)}px`);
  }

  updateServiceStory();
}

function requestScrollUpdate() {
  if (frameRequested) return;
  frameRequested = true;
  window.requestAnimationFrame(updateScrollEffects);
}

const revealElements = Array.from(document.querySelectorAll('.reveal'));

if (prefersReducedMotion.matches || !('IntersectionObserver' in window)) {
  revealElements.forEach((element) => element.classList.add('is-visible'));
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, {
    rootMargin: '0px 0px -12% 0px',
    threshold: .12
  });

  revealElements.forEach((element) => revealObserver.observe(element));
}

window.addEventListener('scroll', requestScrollUpdate, { passive: true });
window.addEventListener('resize', requestScrollUpdate, { passive: true });
requestScrollUpdate();

const requestForm = document.getElementById('requestForm');

if (requestForm) {
  requestForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(requestForm);
    const from = String(formData.get('from') || '').trim();
    const to = String(formData.get('to') || '').trim();
    const date = String(formData.get('date') || '');
    const time = String(formData.get('time') || '');
    const people = String(formData.get('people') || '1');
    const note = String(formData.get('note') || '').trim();

    const lines = [
      'Hallo Herr Hansen, ich möchte gerne eine Fahrt anfragen.',
      '',
      `Abholort: ${from || 'noch offen'}`,
      `Ziel: ${to || 'noch offen'}`,
      `Datum: ${date || 'noch offen'}`,
      `Uhrzeit: ${time || 'noch offen'}`,
      `Fahrgäste: ${people}`,
      note ? `Hinweis: ${note}` : ''
    ].filter(Boolean);

    const url = `https://wa.me/4915126388936?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  });
}

const dateInput = document.getElementById('date');

if (dateInput) {
  const now = new Date();
  dateInput.min = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();
