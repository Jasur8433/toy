const hero = document.getElementById('hero');
const openInvite = document.getElementById('openInvite');

openInvite.addEventListener('click', () => {
  hero.classList.add('open');
  setTimeout(() => {
    document.getElementById('invitation').scrollIntoView({ behavior: 'smooth' });
  }, 350);
});

const eventDate = new Date('2025-08-09T15:30:00+03:00').getTime();
const pad = (n) => String(n).padStart(2, '0');

function tick() {
  const now = Date.now();
  const diff = Math.max(0, eventDate - now);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  const secs = Math.floor((diff / 1000) % 60);

  document.getElementById('d').textContent = pad(days);
  document.getElementById('h').textContent = pad(hours);
  document.getElementById('m').textContent = pad(mins);
  document.getElementById('s').textContent = pad(secs);
}

tick();
setInterval(tick, 1000);
