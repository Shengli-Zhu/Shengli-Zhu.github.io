(function () {
  const list = document.querySelector('.digest');
  const groups = [...document.querySelectorAll('.digest-group')];
  const rows = [...document.querySelectorAll('.digest .row')];
  const facets = [...document.querySelectorAll('button.facet')];
  const search = document.getElementById('digest-q');
  const newBtn = document.querySelector('.digest-new');
  const empty = document.querySelector('.digest-empty');
  const total = document.querySelector('.digest-n');
  const count = document.querySelector('.tools-count');
  const active = document.querySelector('.tools-active');
  const clear = document.querySelector('.tools-clear');
  const fig = document.querySelector('.flow');
  const NS = 'http://www.w3.org/2000/svg';
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmt = d => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  const state = { journal: '', q: '', fresh: false };
  const text = new Map(rows.map(r => [r, r.textContent.toLowerCase()]));
  const panel = document.querySelector('.facet-panel');
  if (panel && window.matchMedia('(max-width: 820px)').matches) panel.open = false;
  const end = fig ? Date.parse(fig.dataset.end + 'T00:00:00Z') : 0;
  const n = fig ? Number(fig.dataset.days) : 0;
  const ago = s => Math.round((end - Date.parse(s + 'T00:00:00Z')) / 864e5);

  // Papers this browser has not seen on this page before; the baseline is kept for the whole visit.
  const store = (area, key, value) => { try { return value === undefined ? window[area].getItem(key) : window[area].setItem(key, value); } catch (e) { return null; } };
  const KEY = list && list.dataset.seen;
  if (KEY && rows.length) {
    let baseline = store('sessionStorage', KEY);
    if (baseline === null) {
      baseline = store('localStorage', KEY);
      if (baseline !== null) store('sessionStorage', KEY, baseline);
    }
    store('localStorage', KEY, JSON.stringify(rows.map(r => r.dataset.doi)));
    let seen = null;
    try { seen = baseline && new Set(JSON.parse(baseline)); } catch (e) { seen = null; }
    if (seen) {
      const fresh = rows.filter(r => !seen.has(r.dataset.doi));
      fresh.forEach(r => {
        r.classList.add('is-new');
        const mark = document.createElement('span');
        mark.className = 'new-mark';
        mark.textContent = 'New';
        r.querySelector('.row-title').append(' ', mark);
      });
      if (fresh.length && newBtn) {
        newBtn.hidden = false;
        newBtn.textContent = `${fresh.length} new since your last visit`;
      }
    }
  }

  const el = (tag, attrs, t) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (t !== undefined) e.textContent = t;
    return e;
  };

  // A smooth line through the points that never dips below the baseline.
  function curve(pts, base) {
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)];
      const c1y = Math.min(base, p1[1] + (p2[1] - p0[1]) / 6), c2y = Math.min(base, p2[1] - (p3[1] - p1[1]) / 6);
      d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${c1y} ${p2[0] - (p3[0] - p1[0]) / 6},${c2y} ${p2[0]},${p2[1]}`;
    }
    return d;
  }

  // Papers per day drawn as a hydrograph: the daily count is the discharge.
  function drawFlow() {
    if (!fig) return;
    const svg = fig.querySelector('svg');
    const days = Array.from({ length: n }, (_, i) => new Date(end - (n - 1 - i) * 864e5));
    const counts = new Array(n).fill(0);
    const dates = fig.dataset.dates ? fig.dataset.dates.split(' ') : rows.filter(r => !r.hidden).map(r => r.dataset.date);
    dates.forEach(s => { const k = ago(s); if (k >= 0 && k < n) counts[n - 1 - k]++; });
    const W = svg.clientWidth, H = svg.clientHeight, top = 14, bottom = 22;
    const max = Math.max(4, ...counts);
    const x = i => (i + 0.5) * W / n;
    const y = c => top + (H - top - bottom) * (1 - c / max);
    const pts = counts.map((c, i) => [x(i), y(c)]);
    pts.unshift([0, pts[0][1]]);
    pts.push([W, pts[pts.length - 1][1]]);
    const line = curve(pts, y(0));
    svg.replaceChildren();
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.append(el('line', { class: 'flow-grid', x1: 0, x2: W, y1: y(max), y2: y(max) }));
    svg.append(el('text', { class: 'flow-label', x: 0, y: y(max) - 4 }, `${max} papers a day`));
    svg.append(el('path', { class: 'flow-area', d: `${line} L${W},${y(0)} L0,${y(0)} Z` }));
    svg.append(el('path', { class: 'flow-line', d: line }));
    svg.append(el('line', { class: 'flow-base', x1: 0, x2: W, y1: y(0), y2: y(0) }));
    const step = 7 * Math.ceil(70 / (7 * W / n));
    days.forEach((d, i) => {
      if ((n - 1 - i) % step === 0) svg.append(el('text', { class: 'flow-label', x: x(i), y: H - 4, 'text-anchor': i === n - 1 ? 'end' : 'middle' }, fmt(d)));
      const hit = el('rect', { class: 'flow-hit', x: i * W / n, y: top, width: W / n, height: y(0) - top });
      hit.append(el('title', {}, `${fmt(d)}: ${counts[i]} paper${counts[i] === 1 ? '' : 's'}`));
      svg.append(hit);
    });
  }

  const matches = (r, skip) =>
    (skip === 'journal' || !state.journal || r.dataset.journal === state.journal) &&
    (!state.q || text.get(r).includes(state.q)) &&
    (!state.fresh || r.classList.contains('is-new'));

  function updateFacets() {
    const pool = rows.filter(r => matches(r, 'journal'));
    const tally = value => pool.filter(r => r.dataset.journal === value).length;
    const k = facets.map(f => tally(f.dataset.value));
    const max = Math.max(1, ...k);
    facets.forEach((f, i) => {
      f.querySelector('.facet-n').textContent = k[i];
      f.style.setProperty('--w', `${(100 * k[i] / max).toFixed(1)}%`);
      f.classList.toggle('is-empty', k[i] === 0);
      f.setAttribute('aria-pressed', String(state.journal === f.dataset.value));
    });
  }

  function chip(label, onClear) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tools-chip';
    b.setAttribute('aria-label', `Remove filter: ${label}`);
    b.textContent = label;
    b.addEventListener('click', onClear);
    return b;
  }

  function apply() {
    let shown = 0;
    groups.forEach(g => {
      let k = 0;
      g.querySelectorAll('.row').forEach(r => { const on = matches(r); r.hidden = !on; if (on) k++; });
      g.hidden = k === 0;
      shown += k;
    });
    const filtered = state.journal || state.q || state.fresh;
    if (total) total.textContent = shown;
    if (count) count.textContent = filtered ? `${shown} of ${rows.length} papers` : `All ${rows.length} papers`;
    if (active) {
      active.replaceChildren();
      if (state.fresh) active.append(chip('New since your last visit', () => { state.fresh = false; apply(); }));
      if (state.journal) active.append(chip(facets.find(f => f.dataset.value === state.journal).querySelector('.facet-label').textContent, () => { state.journal = ''; apply(); }));
      if (state.q) active.append(chip(`“${search.value.trim()}”`, () => { search.value = ''; state.q = ''; apply(); }));
    }
    if (clear) clear.hidden = !filtered;
    if (newBtn) newBtn.setAttribute('aria-pressed', String(state.fresh));
    if (empty) empty.hidden = shown > 0;
    updateFacets();
    drawFlow();
  }

  facets.forEach(f => f.addEventListener('click', () => {
    state.journal = state.journal === f.dataset.value ? '' : f.dataset.value;
    apply();
  }));
  if (search) search.addEventListener('input', () => { state.q = search.value.trim().toLowerCase(); apply(); });
  if (newBtn) newBtn.addEventListener('click', () => { state.fresh = !state.fresh; apply(); });
  if (clear) clear.addEventListener('click', () => {
    Object.assign(state, { journal: '', q: '', fresh: false });
    if (search) search.value = '';
    apply();
  });
  let pending = false;
  window.addEventListener('resize', () => { if (!pending) { pending = true; requestAnimationFrame(() => { pending = false; drawFlow(); }); } });
  if (groups.length) apply(); else drawFlow();
})();
