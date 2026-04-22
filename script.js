const hero = document.getElementById('hero');
const openInvite = document.getElementById('openInvite');

openInvite.addEventListener('click', () => {
  hero.classList.add('open');
  setTimeout(() => document.getElementById('paper').scrollIntoView({ behavior: 'smooth' }), 280);
});

const weddingDate = new Date('2026-08-09T15:30:00+03:00').getTime();
const pad = (n) => String(n).padStart(2, '0');

function updateTimer() {
  const diff = Math.max(0, weddingDate - Date.now());
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000) % 24;
  const m = Math.floor(diff / 60000) % 60;
  const s = Math.floor(diff / 1000) % 60;

  document.getElementById('d').textContent = pad(d);
  document.getElementById('h').textContent = pad(h);
  document.getElementById('m').textContent = pad(m);
  document.getElementById('s').textContent = pad(s);
}

updateTimer();
setInterval(updateTimer, 1000);
