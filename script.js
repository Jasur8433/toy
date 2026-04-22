const scene = document.getElementById('scene');
document.getElementById('openInvite').addEventListener('click', () => {
  scene.classList.add('open');
  setTimeout(() => document.getElementById('invitation').scrollIntoView({ behavior: 'smooth' }), 300);
});

const targetDate = new Date('2026-08-09T15:30:00+03:00').getTime();
const format = (n) => String(n).padStart(2, '0');

function updateCountdown() {
  const now = Date.now();
  const diff = Math.max(0, targetDate - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000) % 24;
  const m = Math.floor(diff / 60000) % 60;
  const s = Math.floor(diff / 1000) % 60;

  document.getElementById('d').textContent = format(d);
  document.getElementById('h').textContent = format(h);
  document.getElementById('m').textContent = format(m);
  document.getElementById('s').textContent = format(s);
}

updateCountdown();
setInterval(updateCountdown, 1000);
