document.getElementById('year').textContent = new Date().getFullYear();

const form = document.getElementById('requestForm');
form.addEventListener('submit', function(e) {
  e.preventDefault();

  const from = document.getElementById('from').value.trim();
  const to = document.getElementById('to').value.trim();
  const date = document.getElementById('date').value;
  const time = document.getElementById('time').value;
  const people = document.getElementById('people').value;
  const note = document.getElementById('note').value.trim();

  const lines = [
    'Hallo Herr Hansen, ich möchte gerne eine Fahrt anfragen.',
    '',
    'Abholort: ' + (from || 'noch offen'),
    'Ziel: ' + (to || 'noch offen'),
    'Datum: ' + (date || 'noch offen'),
    'Uhrzeit: ' + (time || 'noch offen'),
    'Fahrgäste: ' + people,
    note ? 'Hinweis: ' + note : ''
  ].filter(Boolean);

  const url = 'https://wa.me/4915126388936?text=' + encodeURIComponent(lines.join('\n'));
  window.open(url, '_blank', 'noopener');
});
