(function () {
  const root = document.documentElement;
  const bar = document.querySelector('.topbar');
  const toTop = document.querySelector('.to-top');
  const head = document.querySelector('.hero, .band, .cover');
  const narrow = window.matchMedia('(max-width: 760px)');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Fixed top bar: its height feeds the sticky offsets; on phones it slides away while reading down.
  let lastY = window.scrollY, hidden = false, ticking = false;
  const setHeight = () => root.style.setProperty('--bar-h', `${bar.offsetHeight}px`);
  function onScroll() {
    ticking = false;
    const y = window.scrollY, h = bar.offsetHeight;
    if (!narrow.matches || y <= h || y < lastY) hidden = false;
    else if (y > lastY) hidden = true;
    lastY = y;
    bar.classList.toggle('is-scrolled', y > (head ? head.offsetHeight - h : 0));
    bar.classList.toggle('is-hidden', hidden);
    root.style.setProperty('--bar-offset', hidden ? '0px' : 'var(--bar-h)');
    if (toTop) toTop.classList.toggle('is-shown', y > window.innerHeight * 0.6);
  }
  if (bar) {
    setHeight();
    new ResizeObserver(setHeight).observe(bar);
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();
  }

  // Glass lens that rests on the current page and slides to whatever the pointer is over.
  const nav = document.querySelector('.topbar .nav');
  const lens = nav && nav.querySelector('.nav-lens');
  if (lens) {
    const current = nav.querySelector('a[aria-current="page"]');
    const place = (a, instant) => {
      if (!a) { lens.classList.remove('is-on'); return; }
      if (instant) lens.style.transition = 'none';
      lens.style.setProperty('--lx', `${a.offsetLeft}px`);
      lens.style.setProperty('--lw', `${a.offsetWidth}px`);
      lens.classList.add('is-on');
      if (instant) { lens.offsetWidth; lens.style.transition = ''; }
    };
    nav.querySelectorAll('a').forEach(a => {
      a.addEventListener('pointerenter', () => place(a, reduce));
      a.addEventListener('focus', () => place(a, reduce));
    });
    nav.addEventListener('pointermove', e => {
      const r = lens.getBoundingClientRect();
      lens.style.setProperty('--mx', `${Math.round(100 * (e.clientX - r.left) / Math.max(r.width, 1))}%`);
    });
    nav.addEventListener('pointerleave', () => place(current, reduce));
    nav.addEventListener('focusout', e => { if (!nav.contains(e.relatedTarget)) place(current, reduce); });
    window.addEventListener('resize', () => place(current, true));
    document.fonts.ready.then(() => place(current, true));
    place(current, true);
  }

  // Copy button on every code block.
  const copyText = text => {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok ? Promise.resolve() : Promise.reject(new Error('copy failed'));
  };
  document.querySelectorAll('.prose pre').forEach(pre => {
    const box = document.createElement('div');
    box.className = 'code-box';
    pre.before(box);
    box.append(pre);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'code-copy';
    btn.textContent = 'Copy';
    btn.setAttribute('aria-label', 'Copy code');
    btn.addEventListener('click', () => {
      const code = pre.querySelector('code') || pre;
      copyText(code.textContent.replace(/\n$/, ''))
        .then(() => { btn.textContent = 'Copied'; })
        .catch(() => { btn.textContent = 'Press Ctrl+C'; })
        .finally(() => setTimeout(() => { btn.textContent = 'Copy'; }, 1600));
    });
    box.append(btn);
  });

  if (toTop) {
    toTop.hidden = false;
    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));
  }
})();
