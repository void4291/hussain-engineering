/* Hussain Engineering — site interactions.
   Vanilla JS, no dependencies. Every module is progressive enhancement:
   the pages read correctly with this file missing or motion disabled. */
(() => {
'use strict';

const root = document.documentElement;
const motion = root.classList.contains('motion');
const finePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

/* One shared frame loop: each task gets (scrollY, time). */
/* frame-rate independent easing toward a target (rate = responsiveness per second) */
const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt / 1000));
const tasks = [];
let lastT = 0;
function frame(t) {
  const y = window.scrollY, dt = Math.min(300, lastT ? t - lastT : 16.7);
  lastT = t;
  for (const fn of tasks) fn(y, t, dt);
  requestAnimationFrame(frame);
}

/* ---------------------------------------------------------------- nav */
function initNav() {
  const nav = $('.nav'), burger = $('.burger'), menu = $('.menu');
  if (!nav) return;

  function setMenu(open) {
    menu.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  if (burger && menu) {
    burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
    menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
    matchMedia('(min-width:1181px)').addEventListener('change', e => { if (e.matches) setMenu(false); });
  }

  const themed = $$('[data-theme]');
  const gears = $$('.gear');
  let lastY = -1, dirY = window.scrollY;
  tasks.push(y => {
    if (y === lastY) return;
    nav.classList.toggle('is-solid', y > 40);
    if (y > dirY + 6 && y > 320) nav.classList.add('is-hidden');
    else if (y < dirY - 6 || y <= 320) nav.classList.remove('is-hidden');
    if (Math.abs(y - dirY) > 6) dirY = y;
    lastY = y;

    /* which section sits under the bar decides its ink colour */
    let light = false;
    for (const el of themed) {
      const r = el.getBoundingClientRect();
      if (r.top <= 36 && r.bottom > 36) light = el.dataset.theme !== 'dark';
    }
    nav.classList.toggle('on-light', light);

    if (motion) for (const g of gears) g.style.transform = `rotate(${(y * 0.12).toFixed(1)}deg)`;
  });
}

/* ------------------------------------------------- Karachi wall clock */
function initClock() {
  const els = $$('[data-clock]');
  if (!els.length || !window.Intl) return;
  const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Karachi' });
  const tick = () => { const s = fmt.format(new Date()); els.forEach(el => { el.textContent = s; }); };
  tick();
  setInterval(tick, 20000);
}

/* -------------------------------------------------------- reveals */
function splitWords(el, cls) {
  let i = 0;
  (function walk(node) {
    for (const c of Array.from(node.childNodes)) {
      if (c.nodeType === 3) {
        const frag = document.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach(tok => {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { frag.append(' '); return; }
          if (cls) {
            const s = document.createElement('span');
            s.className = cls; s.textContent = tok; frag.append(s);
          } else {
            const w = document.createElement('span'), inner = document.createElement('span');
            w.className = 'w'; inner.textContent = tok; inner.style.setProperty('--i', i++);
            w.append(inner); frag.append(w);
          }
        });
        c.replaceWith(frag);
      } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
    }
  })(el);
}

function initReveals() {
  if (!motion || !('IntersectionObserver' in window)) return;
  $$('[data-split]').forEach(el => splitWords(el));
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  $$('.rv,[data-split]').forEach(el => io.observe(el));

  /* statement: words ink in as the block is read */
  $$('.statement').forEach(el => {
    splitWords(el, 'sw');
    const words = $$('.sw', el);
    let last = -1;
    tasks.push(() => {
      const r = el.getBoundingClientRect(), vh = window.innerHeight;
      if (r.top > vh || r.bottom < 0) return;
      const p = clamp((vh * 0.86 - r.top) / (vh * 0.5 + r.height * 0.6));
      const n = Math.round(p * words.length * 10) / 10;
      if (n === last) return;
      last = n;
      words.forEach((w, i) => { w.style.opacity = clamp(n - i, 0.16, 1); });
    });
  });

  /* counters */
  const cio = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      cio.unobserve(e.target);
      const el = e.target, to = parseInt(el.dataset.count, 10), t0 = performance.now(), dur = 1700;
      (function step(now) {
        const p = clamp((now - t0) / dur);
        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 4)));
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    });
  }, { threshold: 0.4 });
  $$('[data-count]').forEach(el => { el.textContent = '0'; cio.observe(el); });
}

/* ------------------------------------------- stage: the GRP tank, drawn → built */
function initStage() {
  const stage = $('.stage');
  if (!stage) return;
  const canvas = $('.stage-canvas', stage), ctx = canvas.getContext('2d');
  const hero = $('.hero', stage), beats = $$('.beat', stage), rail = $('.rail', stage), railItems = $$('.rail li', stage);
  const hud = $('.stage-hud', stage), hudNum = $('.hud-val', stage), hudLab = $('.hud-label', stage);
  const LABELS = ['Drawing', 'Mould', 'Lamination', 'In service'];

  /* --- mesh: horizontal vessel with dished ends (surface of revolution about x) --- */
  const N = 40, L = 1.5, R = 1, D = 0.52, CS = 8, BS = 16, CAM = 7;
  const prof = [];
  for (let i = 0; i <= CS; i++) { const a = i / CS * Math.PI / 2; prof.push([-L - D * Math.cos(a), R * Math.sin(a), -Math.cos(a) / D, Math.sin(a) / R]); }
  for (let i = 1; i <= BS; i++) prof.push([-L + 2 * L * i / BS, R, 0, 1]);
  for (let i = 1; i <= CS; i++) { const a = (1 - i / CS) * Math.PI / 2; prof.push([L + D * Math.cos(a), R * Math.sin(a), Math.cos(a) / D, Math.sin(a) / R]); }
  const S = prof.length;
  const verts = [];                       // [x,y,z]
  for (let s = 0; s < S; s++) for (let j = 0; j < N; j++) {
    const th = j / N * Math.PI * 2;
    verts.push([prof[s][0], prof[s][1] * Math.cos(th), prof[s][1] * Math.sin(th)]);
  }
  const quads = [];                       // {v:[4 idx], n:[3], fx, band}
  for (let s = 0; s < S - 1; s++) for (let j = 0; j < N; j++) {
    const j2 = (j + 1) % N, th = (j + 0.5) / N * Math.PI * 2;
    let nx = (prof[s][2] + prof[s + 1][2]) / 2, nr = (prof[s][3] + prof[s + 1][3]) / 2;
    const len = Math.hypot(nx, nr) || 1; nx /= len; nr /= len;
    quads.push({
      v: [s * N + j, (s + 1) * N + j, (s + 1) * N + j2, s * N + j2],
      n: [nx, nr * Math.cos(th), nr * Math.sin(th)],
      fx: ((prof[s][0] + prof[s + 1][0]) / 2 + L + D) / (2 * (L + D)),
      band: s === CS + 3 || s === CS + 4,
      s
    });
  }
  /* manway nozzle on the crown */
  const M = 16, NZX = 0.62, NZR = 0.2, NZ0 = R * 0.97, NZ1 = R + 0.3, base = verts.length;
  for (const y of [NZ0, NZ1]) for (let j = 0; j < M; j++) {
    const th = j / M * Math.PI * 2;
    verts.push([NZX + NZR * Math.cos(th), y, NZR * Math.sin(th)]);
  }
  const nozzle = [];
  for (let j = 0; j < M; j++) {
    const j2 = (j + 1) % M, th = (j + 0.5) / M * Math.PI * 2;
    nozzle.push({ v: [base + j, base + M + j, base + M + j2, base + j2], n: [Math.cos(th), 0, Math.sin(th)], fx: (NZX + L + D) / (2 * (L + D)), band: false, s: -1 });
  }
  nozzle.push({ v: Array.from({ length: M }, (_, j) => base + M + j), n: [0, 1, 0], fx: (NZX + L + D) / (2 * (L + D)), band: false, s: -1, lid: true });

  const PX = new Float32Array(verts.length), PY = new Float32Array(verts.length), VX = new Float32Array(verts.length), VY = new Float32Array(verts.length), VZ = new Float32Array(verts.length);
  const LIGHT = (() => { const l = [-0.5, 0.72, -0.48], m = Math.hypot(...l); return l.map(v => v / m); })();
  const PAPER = [232, 228, 220], AMBER = [224, 170, 30], INK = [13, 19, 28];

  let w = 0, h = 0, dpr = 1, cx = 0, cy = 0, sc = 1, cyw = 1, syw = 0, cp = 1, sp = 0;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  }
  function project(x, y, z, out) {        // yaw about Y, then pitch toward the camera
    const x1 = x * cyw + z * syw, z1 = -x * syw + z * cyw;
    const y2 = y * cp + z1 * sp, z2 = -y * sp + z1 * cp;
    const d = CAM / (CAM + z2);
    out[0] = cx + x1 * sc * d; out[1] = cy - y2 * sc * d; out[2] = x1; out[3] = y2; out[4] = z2;
  }
  const tmp = [0, 0, 0, 0, 0], tA = [0, 0, 0, 0, 0], tB = [0, 0, 0, 0, 0];
  function line3(a, b) { project(a[0], a[1], a[2], tA); project(b[0], b[1], b[2], tB); ctx.moveTo(tA[0], tA[1]); ctx.lineTo(tB[0], tB[1]); }
  function path(q) {
    const v = q.v;
    ctx.moveTo(PX[v[0]], PY[v[0]]);
    for (let k = 1; k < v.length; k++) ctx.lineTo(PX[v[k]], PY[v[k]]);
    ctx.closePath();
  }
  const rgb = (c, k) => `rgb(${c[0] * k | 0},${c[1] * k | 0},${c[2] * k | 0})`;
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

  function draw(p, t, mx, my, intro) {
    const mobile = w < 820;
    const story = smooth(0.05, 0.16, p);
    cx = mobile ? w * 0.5 : lerp(w * 0.5, w * 0.7, story);
    cy = mobile ? lerp(h * 0.4, h * 0.33, story) : lerp(h * 0.5, h * 0.47, story);
    sc = mobile ? Math.min(w * 0.2, h * 0.15) : Math.min(w * 0.135, h * 0.2) * lerp(1, 0.9, story);
    const yaw = -0.55 + p * 6.42 + Math.sin(t * 0.00032) * 0.1 + mx * 0.2;
    const pitch = 0.36 + my * 0.1 + Math.sin(p * Math.PI) * 0.12;
    cyw = Math.cos(yaw); syw = Math.sin(yaw); cp = Math.cos(pitch); sp = Math.sin(pitch);

    const solid = smooth(0.30, 0.42, p);          // mould: hidden-line body
    const sweep = smooth(0.52, 0.78, p) * 1.2;    // laminate: paper skin travels along the vessel
    const finish = smooth(0.80, 0.92, p);         // gelcoat band
    const blueprint = 1 - smooth(0.30, 0.46, p);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineJoin = 'round';

    for (let i = 0; i < verts.length; i++) {
      const v = verts[i];
      project(v[0], v[1], v[2], tmp);
      PX[i] = tmp[0]; PY[i] = tmp[1]; VX[i] = tmp[2]; VY[i] = tmp[3]; VZ[i] = tmp[4];
    }

    /* blueprint furniture: centreline + dimension lines */
    if (blueprint > 0.01) {
      const E = L + D, a = blueprint * intro;
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(212,160,23,${0.55 * a})`;
      ctx.setLineDash([14, 5, 2, 5]);
      ctx.beginPath(); line3([-E - 0.7, 0, 0], [E + 0.7, 0, 0]); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = `rgba(139,155,174,${0.6 * a})`;
      ctx.beginPath();
      const yd = -R - 0.55;
      line3([-E, yd, 0], [E, yd, 0]);
      line3([-E, -0.15, 0], [-E, yd - 0.12, 0]); line3([E, -0.15, 0], [E, yd - 0.12, 0]);
      const xd = E + 0.5;
      line3([xd, -R, 0], [xd, R, 0]);
      line3([E - D, R, 0], [xd + 0.12, R, 0]); line3([E - D, -R, 0], [xd + 0.12, -R, 0]);
      ctx.stroke();
      ctx.fillStyle = `rgba(212,160,23,${0.9 * a})`;
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      project(0, yd - 0.22, 0, tA); ctx.fillText('L', tA[0], tA[1] + 4);
      project(xd + 0.24, 0, 0, tA); ctx.fillText('Ø', tA[0], tA[1] + 4);
    }

    const drawSet = (set, limit) => {
      const front = [];
      ctx.beginPath();
      let anyBack = false;
      for (const q of set) {
        if (q.s >= 0 && q.s > limit) continue;
        const v = q.v, n = q.n;
        let mxv = 0, myv = 0, mzv = 0;
        for (let k = 0; k < v.length; k++) { mxv += VX[v[k]]; myv += VY[v[k]]; mzv += VZ[v[k]]; }
        mxv /= v.length; myv /= v.length; mzv /= v.length;
        const nx1 = n[0] * cyw + n[2] * syw, nz1 = -n[0] * syw + n[2] * cyw;
        const ny2 = n[1] * cp + nz1 * sp, nz2 = -n[1] * sp + nz1 * cp;
        if (nx1 * mxv + ny2 * myv + nz2 * (mzv + CAM) < 0) {
          q._sh = clamp(nx1 * LIGHT[0] + ny2 * LIGHT[1] + nz2 * LIGHT[2]) * 0.72 + 0.28;
          front.push(q);
        } else if (solid < 0.98) { path(q); anyBack = true; }
      }
      if (anyBack) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(139,155,174,${0.2 * (1 - solid)})`;
        ctx.stroke();
      }
      for (const q of front) {
        const f = clamp((sweep - q.fx) / 0.1);
        ctx.beginPath(); path(q);
        if (f > 0) {
          let col = f < 1 ? mix(AMBER, PAPER, f) : PAPER;
          if (q.band && finish > 0) col = mix(col, AMBER, finish);
          const c = rgb(col, q._sh);
          ctx.fillStyle = c; ctx.fill();
          ctx.lineWidth = 1; ctx.strokeStyle = c; ctx.stroke();
        } else {
          if (solid > 0.01) { ctx.fillStyle = `rgba(${INK[0]},${INK[1]},${INK[2]},${solid})`; ctx.fill(); }
          ctx.lineWidth = 1;
          ctx.strokeStyle = `rgba(232,228,220,${lerp(0.42, 0.3, solid)})`;
          ctx.stroke();
        }
      }
    };
    drawSet(quads, Math.floor(intro * S));
    if (intro >= 1) drawSet(nozzle, S);
  }

  function progress() {
    const r = stage.getBoundingClientRect();
    const span = r.height - window.innerHeight;
    return span > 0 ? clamp(-r.top / span) : 0;
  }

  resize();
  window.addEventListener('resize', () => { resize(); if (!motion) draw(0.2, 0, 0, 0, 1); });

  if (!motion) { draw(0.2, 0, 0, 0, 1); return; }   // static blueprint behind the hero

  let p = progress(), mx = 0, my = 0, tmx = 0, tmy = 0, t0 = 0, active = -2, pct = -1;
  if (finePointer) window.addEventListener('pointermove', e => { tmx = e.clientX / window.innerWidth * 2 - 1; tmy = e.clientY / window.innerHeight * 2 - 1; }, { passive: true });

  tasks.push((y, t, dt) => {
    const r = stage.getBoundingClientRect();
    if (r.bottom < -50) return;
    if (!t0) t0 = t;
    p = damp(p, progress(), 6.5, dt);
    mx = damp(mx, tmx, 3, dt); my = damp(my, tmy, 3, dt);
    draw(p, t, mx, my, clamp((t - t0) / 1500));

    const idx = p < 0.11 ? -1 : Math.min(3, Math.floor((p - 0.11) / 0.2225));
    if (idx !== active) {
      active = idx;
      hero.classList.toggle('off', idx >= 0);
      beats.forEach((b, i) => b.classList.toggle('on', i === idx));
      railItems.forEach((b, i) => b.classList.toggle('on', i === idx));
      hud.classList.toggle('on', idx >= 0);
      rail.classList.toggle('on', idx >= 0);
      if (idx >= 0) hudLab.textContent = LABELS[idx];
    }
    const n = Math.round(clamp((p - 0.11) / 0.86) * 100);
    if (n !== pct) { pct = n; hudNum.textContent = String(n).padStart(3, '0'); }
  });
}

/* ------------------------------------ capabilities: image follows the pointer */
function initIndex() {
  const list = $('.index'), prev = $('.cap-preview');
  if (!list || !prev || !motion || !finePointer) return;
  const rows = $$('.row', list);
  let imgs = null, x = 0, y = 0, tx = 0, ty = 0, on = false, scale = 0.7;
  function build() {
    imgs = rows.map(r => {
      const src = $('img', r), im = new Image();
      im.src = src.currentSrc || src.src; im.alt = ''; im.decoding = 'async';
      prev.append(im); return im;
    });
  }
  rows.forEach((r, i) => r.addEventListener('pointerenter', () => {
    if (!imgs) build();
    imgs.forEach((im, k) => im.classList.toggle('on', k === i));
  }));
  list.addEventListener('pointerenter', e => { on = true; x = tx = e.clientX; y = ty = e.clientY; prev.classList.add('on'); });
  list.addEventListener('pointerleave', () => { on = false; prev.classList.remove('on'); });
  list.addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
  tasks.push((sy, t, dt) => {
    if (!on && scale < 0.71) return;
    const vx = tx - x;
    x = damp(x, tx, 9, dt); y = damp(y, ty, 9, dt);
    scale = damp(scale, on ? 1 : 0.7, 8, dt);
    /* sits beside the pointer so the row title stays readable; flips near the right edge */
    const pw = prev.offsetWidth, px = x + 28 + pw > window.innerWidth - 16 ? x - 28 - pw : x + 28;
    prev.style.transform = `translate3d(${px.toFixed(1)}px,${y.toFixed(1)}px,0) translateY(-50%) rotate(${clamp(vx * 0.03, -8, 8).toFixed(2)}deg) scale(${scale.toFixed(3)})`;
  });
}

/* -------------------------------------- projects: vertical scroll → horizontal */
function initHScroll() {
  const sec = $('.hs');
  if (!sec) return;
  const track = $('.hs-track', sec), bar = $('.hs-bar i', sec), cnt = $('.hs-count', sec);
  const cards = $$('.pcard:not(.end)', sec);
  const mq = matchMedia('(min-width:960px) and (min-height:620px)');
  let pinned = false, max = 0, cur = 0, lastN = 0;
  const setMeter = p => {
    bar.style.transform = `scaleX(${lerp(0.16, 1, p).toFixed(3)})`;
    const n = Math.round(p * (cards.length - 1)) + 1;
    if (n !== lastN) { lastN = n; cnt.textContent = String(n).padStart(2, '0'); }
  };
  function measure() {
    pinned = motion && mq.matches;
    sec.classList.toggle('is-pinned', pinned);
    if (pinned) {
      max = Math.max(0, track.scrollWidth - window.innerWidth);
      sec.style.height = (max + window.innerHeight) + 'px';
    } else {
      sec.style.height = ''; track.style.transform = '';
    }
  }
  measure();
  /* cards slide in sideways, so pull their images in before the track starts moving */
  if ('IntersectionObserver' in window) {
    const lio = new IntersectionObserver(es => {
      if (!es.some(e => e.isIntersecting)) return;
      lio.disconnect();
      $$('img[loading="lazy"]', track).forEach(im => { im.loading = 'eager'; });
    }, { rootMargin: '600px 0px' });
    lio.observe(sec);
  }
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  track.addEventListener('scroll', () => {
    if (pinned) return;
    const m = track.scrollWidth - track.clientWidth;
    setMeter(m > 0 ? clamp(track.scrollLeft / m) : 0);
  }, { passive: true });
  tasks.push((sy, t, dt) => {
    if (!pinned || !max) return;
    const r = sec.getBoundingClientRect();
    if (r.top > window.innerHeight || r.bottom < 0) return;
    const p = clamp(-r.top / max);
    cur = damp(cur, -p * max, 8, dt);
    if (Math.abs(cur + p * max) < 0.05) cur = -p * max;
    track.style.transform = `translate3d(${cur.toFixed(2)}px,0,0)`;
    setMeter(clamp(-cur / max));
  });
}

/* ------------------------------------------------------- client marquee */
function initMarquee() {
  if (!motion) return;
  $$('.marquee-set').forEach(set => {
    Array.from(set.children).forEach(item => {
      const clone = item.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll('img').forEach(img => { img.alt = ''; });
      set.appendChild(clone);
    });
    set.classList.add('is-cloned');
  });
}

/* -------------------------------------------------- cursor + magnetic pills */
function initCursor() {
  if (!motion || !finePointer) return;
  const c = document.createElement('div');
  c.className = 'cursor'; c.setAttribute('aria-hidden', 'true');
  document.body.append(c);
  let x = 0, y = 0, tx = 0, ty = 0, live = false;
  window.addEventListener('pointermove', e => {
    tx = e.clientX; ty = e.clientY;
    if (!live) { live = true; x = tx; y = ty; c.classList.add('live'); }
  }, { passive: true });
  root.addEventListener('mouseleave', () => { live = false; c.classList.remove('live'); });
  document.addEventListener('pointerover', e => {
    const lab = e.target.closest('[data-cursor]');
    const hov = e.target.closest('a,button,summary,label,input,select,textarea');
    c.classList.toggle('has-label', !!lab);
    c.classList.toggle('is-hover', !lab && !!hov);
    c.textContent = lab ? lab.dataset.cursor : '';
  });
  tasks.push((sy, t, dt) => {
    if (!live) return;
    x = damp(x, tx, 14, dt); y = damp(y, ty, 14, dt);
    c.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
  });

  $$('.magnet').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${((e.clientX - r.left - r.width / 2) * 0.28).toFixed(1)}px,${((e.clientY - r.top - r.height / 2) * 0.4).toFixed(1)}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}

/* ---------------------------------- inquiry form: mailto or WhatsApp hand-off */
function initForm() {
  const form = $('#inquiryForm');
  if (!form) return;
  const CONTACT_EMAIL = 'hussainengineering.sales@gmail.com';
  const WHATSAPP_NUMBER = '923368045770';
  const v = id => document.getElementById(id).value;
  const inquiryText = () => `New project inquiry submitted via the Hussain Engineering website.

Name: ${v('fname')}
Company: ${v('fcompany') || 'N/A'}
Email: ${v('femail')}
Type of Work: ${v('fcategory')}

Project Details:
${v('fmessage')}`;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const subject = encodeURIComponent('Project Inquiry from Website');
    const body = encodeURIComponent(inquiryText());
    const a = document.createElement('a');
    a.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    document.body.appendChild(a); a.click(); a.remove();

    /* fallback when no default mail app is configured on this device */
    const note = $('#mailFallback');
    const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${CONTACT_EMAIL}&su=${subject}&body=${body}`;
    note.innerHTML = 'Email app didn’t open? <a href="' + gmail + '" target="_blank" rel="noopener">Compose in Gmail</a> or write to <a href="mailto:' + CONTACT_EMAIL + '">' + CONTACT_EMAIL + '</a>.';
    note.hidden = false;
  });

  const wa = $('#waBtn');
  if (wa) wa.addEventListener('click', () => {
    if (!form.reportValidity()) return;
    window.open('https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(inquiryText()), '_blank', 'noopener');
  });
}

[initNav, initClock, initReveals, initStage, initIndex, initHScroll, initMarquee, initCursor, initForm].forEach(fn => {
  try { fn(); } catch (err) { root.classList.remove('motion'); console.error(err); }
});
requestAnimationFrame(frame);
})();
