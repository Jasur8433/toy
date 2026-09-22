const filters = document.querySelectorAll('.filter');
const events = document.querySelectorAll('.event');
filters.forEach((filter) => {
  filter.addEventListener('click', () => {
    filters.forEach((item) => item.classList.remove('active'));
    filter.classList.add('active');
    const type = filter.dataset.filter;
    events.forEach((event) => {
      event.hidden = type !== 'all' && event.dataset.type !== type;
    });
  });
});
