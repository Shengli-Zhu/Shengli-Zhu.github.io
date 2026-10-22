(function () {
  const buttons = document.querySelectorAll('.hydraw-types button');
  const items = document.querySelectorAll('.hydraw-item');
  buttons.forEach(b => b.addEventListener('click', () => {
    const type = b.dataset.type;
    items.forEach(i => { i.hidden = Boolean(type) && i.dataset.type !== type; });
    buttons.forEach(o => o.setAttribute('aria-pressed', String(o === b)));
  }));
})();
