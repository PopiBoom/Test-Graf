'use strict';
/* Memento Mori — KAPUSTKA. 40 с, 1920×1080.
   0–4 пульс · 4–20 история (story.js) · 20–40 канал: сцены 2–5 работают в своих
   исходных таймкодах 4–24 и вызываются со сдвигом CH_OFF = 16 с.
   Весь ролик — чистая функция времени drawFrame(t): одинаково работает при просмотре,
   перемотке и покадровом рендере (?render). Сквозной герой — красная линия. */

const W = 1920, H = 1080, FPS = 60, DUR = 40, CH_OFF = 16;
const RENDER = new URLSearchParams(location.search).has('render');
if (RENDER) document.body.classList.add('render');

const display = document.getElementById('c');
const dctx = display.getContext('2d');
const buf = document.createElement('canvas'); buf.width = W; buf.height = H;
let ctx = buf.getContext('2d');

// ---------- математика ----------
const DEG = Math.PI / 180;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const smooth = k => k * k * (3 - 2 * k);
const eOutCubic = k => 1 - Math.pow(1 - k, 3);
const eInCubic = k => k * k * k;
const eInOut = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const eOutExpo = k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k));
const gauss = (x, s) => Math.exp(-(x * x) / (2 * s * s));
// пружина по времени k (с): 0 → 1 с затухающим перелётом
const spring = (k, f = 2.2, d = 7) => (k <= 0 ? 0 : 1 - Math.exp(-d * k) * Math.cos(f * 2 * Math.PI * k));
const decay = (t, t0, rate) => (t < t0 ? 0 : Math.exp(-(t - t0) * rate));
function rand(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0; let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- камера ----------
const cam = { x: 0, y: 0, z: -1000, f: 1000, roll: 0 };
let shakeX = 0, shakeY = 0;
function P(x, y, z) {
  const dz = z - cam.z;
  if (dz < 1) return null;
  const s = cam.f / dz;
  return { x: (x - cam.x) * s, y: (y - cam.y) * s, s, dz };
}
function beginWorld() { ctx.save(); ctx.translate(W / 2 + shakeX, H / 2 + shakeY); ctx.rotate(cam.roll); }
// переводит текущую систему координат в мировую плоскость z (внутри beginWorld)
function plane(z) { const s = cam.f / (z - cam.z); ctx.translate(-cam.x * s, -cam.y * s); ctx.scale(s, s); return s; }
function shake(t, hits) {
  shakeX = 0; shakeY = 0;
  for (const [t0, amp] of hits) {
    const e = decay(t, t0, 9) * amp;
    if (e < 0.05) continue;
    const u = t - t0;
    shakeX += e * Math.sin(u * 83 + t0); shakeY += e * Math.cos(u * 71 + t0 * 2);
  }
}

// ---------- видео KAPUSTKA ----------
const VID_FPS = 30, VID_N = 147, VID_DUR = VID_N / VID_FPS;
const vidEl = document.getElementById('vid');
let vidFrames = null;
function vid(t) {
  if (vidFrames) return vidFrames[Math.floor((((t % VID_DUR) + VID_DUR) % VID_DUR) * VID_FPS) % VID_N];
  return vidEl;
}
const ready = v => v && (v.tagName === 'VIDEO' ? v.readyState >= 2 : v.complete && v.naturalWidth > 0);

// ---------- текст ----------
const LAY = new Map();
function lay(str, w, size, fam, sp = 0) {
  const key = `${str}|${w}|${size}|${fam}|${sp}`;
  let L = LAY.get(key);
  if (L) return L;
  const f = `${w} ${size}px "${fam}"`;
  ctx.font = f;
  const ch = [...str], ws = ch.map(c => ctx.measureText(c).width);
  const total = ws.reduce((a, b) => a + b, 0) + sp * (ch.length - 1);
  const xs = []; let x = -total / 2;
  ch.forEach((c, i) => { xs.push(x + ws[i] / 2); x += ws[i] + sp; });
  L = { ch, xs, ws, total, font: f, size };
  LAY.set(key, L);
  return L;
}
function letters(L, x0, y0, fn) {
  ctx.font = L.font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  L.ch.forEach((c, i) => {
    if (c === ' ') return;
    ctx.save(); ctx.translate(x0 + L.xs[i], y0); fn(c, i, L.xs[i]); ctx.restore();
  });
}
function redFill(size) {
  const g = ctx.createLinearGradient(0, -size * 0.4, 0, size * 0.4);
  g.addColorStop(0, '#ff5a5a'); g.addColorStop(0.55, '#f01424'); g.addColorStop(1, '#a3000d');
  return g;
}
// красная буква со свечением и «раскалённым» белым при появлении
function hotLetter(c, size, heat, glow = 36) {
  ctx.shadowColor = 'rgba(255,20,40,0.85)'; ctx.shadowBlur = glow;
  ctx.fillStyle = redFill(size); ctx.fillText(c, 0, 0);
  if (heat > 0.02) {
    ctx.shadowBlur = 0; ctx.globalAlpha *= clamp(heat);
    ctx.fillStyle = '#fff4f2'; ctx.fillText(c, 0, 0);
  }
}
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
// размытая буква через маленький офскрин (ctx.filter на большом холсте слишком дорог)
const gC = document.createElement('canvas'), gX = gC.getContext('2d');
function blurGlyph(c, font, size, fill, blur) {
  const m = ctx.getTransform(), sc = Math.hypot(m.a, m.b) || 1;
  const px = size * sc, pad = Math.ceil(blur * 3 + 4);
  const w = Math.ceil(px * 1.3 + pad * 2), h = Math.ceil(px * 1.5 + pad * 2);
  if (gC.width < w || gC.height < h) { gC.width = Math.max(gC.width, w); gC.height = Math.max(gC.height, h); }
  gX.setTransform(1, 0, 0, 1, 0, 0); gX.clearRect(0, 0, w + 2, h + 2);
  gX.filter = blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : 'none';
  gX.font = font.replace(/[\d.]+px/, px.toFixed(1) + 'px'); gX.textAlign = 'center'; gX.textBaseline = 'middle';
  gX.fillStyle = fill; gX.fillText(c, w / 2, h / 2); gX.filter = 'none';
  ctx.save(); ctx.scale(1 / sc, 1 / sc); ctx.drawImage(gC, 0, 0, w, h, -w / 2, -h / 2, w, h); ctx.restore();
}

// ---------- частицы с глубиной резкости ----------
function mkDust(seed, n, X, Y, Z0, Z1, r0 = 1.5, r1 = 5) {
  const r = rand(seed);
  return Array.from({ length: n }, () => ({
    x: (r() - 0.5) * 2 * X, y: (r() - 0.5) * 2 * Y, z: lerp(Z0, Z1, r()),
    r: lerp(r0, r1, r()), a: 0.25 + r() * 0.6, ph: r() * 6.28, sp: 0.3 + r() * 0.8, hot: r() < 0.3,
  }));
}
function drawDust(D, t, focus, rgb = '255,50,60', rise = 25, gain = 1) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const p of D) {
    const pr = P(p.x + Math.sin(t * p.sp + p.ph) * 40, p.y - t * rise * p.sp + Math.cos(t * p.sp * 0.7 + p.ph) * 25, p.z);
    if (!pr || pr.dz < 40) continue;
    const core = p.r * pr.s;
    const coc = 28 * cam.f * Math.abs(1 / pr.dz - 1 / focus); // круг нерезкости
    const rad = Math.max(core, Math.min(coc, 160)) + 0.6;
    const a = p.a * gain * clamp(Math.pow(core / rad, 0.7), 0.06, 1) * clamp((7000 - pr.dz) / 2500);
    if (a < 0.01) continue;
    const col = p.hot ? '255,225,215' : rgb;
    const g = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, rad);
    g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(0.65, `rgba(${col},${a * 0.55})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pr.x, pr.y, rad, 0, 7); ctx.fill();
  }
  ctx.restore();
}

function bgGlow(x, y, r, a, rgb = '120,0,12') {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

/* =====================================================================
   СЦЕНА 1 · ПУЛЬС (0–4 с): из пиков ЭКГ вырастает MEMENTO MORI
   ===================================================================== */
const S1 = { head: t => -1150 + t * 600, beats: [0.5, 1.5, 2.5, 3.5], y: 150 };
const S1_CLIMB = S1.head(3.5) + 150;
const dust1Far = mkDust(11, 90, 2600, 1500, 300, 3600);
const dust1Near = mkDust(12, 16, 900, 600, -880, -500, 2, 4);
function ecg(x) {
  let y = 0;
  for (const tb of S1.beats) {
    const u = x - S1.head(tb);
    if (u < -220 || u > 220) continue;
    y += -16 * gauss(u + 110, 22) + 24 * gauss(u + 26, 7) - 300 * gauss(u, 9) + 90 * gauss(u - 24, 8) - 38 * gauss(u - 110, 30);
  }
  if (x > S1_CLIMB) { // после последнего удара линия не возвращается — уходит вверх графиком
    const d = x - S1_CLIMB;
    y += -d * 1.6 - 26 * Math.sin(d * 0.05) * Math.min(1, d / 60);
  }
  return y;
}
function camS1(t) {
  const w = eInCubic(seg(t, 3.55, 4.0));
  cam.x = S1.head(t) * 0.1 + 760 * w;
  cam.y = -30 + 8 * Math.sin(t * 1.3) - 420 * w;
  cam.z = -1080 + 150 * eInOut(seg(t, 0, 3.6)) + 260 * w;
  cam.roll = lerp(-2.2, 0.8, eInOut(seg(t, 0, 3.5))) * DEG + 7 * DEG * w;
}
const clockC = document.createElement('canvas'); clockC.width = clockC.height = 640;
function drawClock(t, a) {
  const keep = ctx; ctx = clockC.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 640, 640);
  ctx.translate(320, 320); ctx.scale(320 / 1600, 320 / 1600);
  drawClockFace(t);
  ctx = keep;
  ctx.globalAlpha = a; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(clockC, -1600, -1700, 3200, 3200);
  ctx.globalAlpha = 1;
}
function drawClockFace(t) {
  for (let i = 0; i < 60; i++) {
    const major = i % 5 === 0;
    ctx.save(); ctx.rotate(i * 6 * DEG);
    ctx.fillStyle = major ? 'rgba(255,235,235,0.24)' : 'rgba(255,235,235,0.10)';
    ctx.fillRect(major ? -7 : -3, -1500, major ? 14 : 6, major ? 130 : 60);
    ctx.restore();
  }
  const st = t * 2, idx = Math.floor(st), fr = st - idx;
  ctx.save(); ctx.rotate((idx + spring(fr * 0.5, 3, 12)) * 6 * DEG + 200 * DEG);
  ctx.fillStyle = 'rgba(255,40,52,0.55)'; ctx.fillRect(-5, -1420, 10, 1720);
  ctx.beginPath(); ctx.arc(0, 0, 30, 0, 7); ctx.fill();
  ctx.restore();
}
function drawECG(t) {
  const hx = S1.head(t), x0 = hx - 2800;
  ctx.save(); plane(0);
  ctx.beginPath();
  for (let x = x0; x < hx; x += 3) { const y = S1.y + ecg(x); if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
  const hy = S1.y + ecg(hx); ctx.lineTo(hx, hy);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const g = ctx.createLinearGradient(x0, 0, hx, 0);
  g.addColorStop(0, 'rgba(255,35,48,0)'); g.addColorStop(0.6, 'rgba(255,35,48,0.6)'); g.addColorStop(1, 'rgba(255,35,48,1)');
  ctx.strokeStyle = g; ctx.shadowColor = 'rgba(255,20,40,0.95)'; ctx.shadowBlur = 26; ctx.lineWidth = 6; ctx.stroke();
  const g2 = ctx.createLinearGradient(x0, 0, hx, 0);
  g2.addColorStop(0, 'rgba(255,220,220,0)'); g2.addColorStop(0.75, 'rgba(255,220,220,0.4)'); g2.addColorStop(1, 'rgba(255,240,240,0.95)');
  ctx.shadowBlur = 0; ctx.strokeStyle = g2; ctx.lineWidth = 1.8; ctx.stroke();
  // «голова» линии
  let beat = 0; for (const tb of S1.beats) beat += decay(t, tb, 6);
  const rg = ctx.createRadialGradient(hx, hy, 0, hx, hy, 70 + 60 * beat);
  rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.12, 'rgba(255,90,90,0.9)'); rg.addColorStop(1, 'rgba(255,0,20,0)');
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rg;
  ctx.beginPath(); ctx.arc(hx, hy, 70 + 60 * beat, 0, 7); ctx.fill();
  ctx.restore();
}
function drawTitle1(t) {
  const L = lay('MEMENTO MORI', 700, 210, 'Oswald', 10);
  ctx.save(); plane(0);
  letters(L, 0, -40, (c, i, x) => {
    const tb = i < 7 ? 0.5 : 1.5;
    const k = t - tb - Math.abs(x - S1.head(tb)) / 3200 + 0.04;
    if (k <= 0) return;
    const sp = spring(k, 2.0, 6.5);
    ctx.translate(0, (1 - sp) * 200);
    ctx.scale(1 + (1 - clamp(sp)) * 0.3, Math.max(0.002, sp));
    hotLetter(c, 210, Math.exp(-k * 4.5));
  });
  const L2 = lay('ПОМНИ: ВРЕМЯ НЕ ЖДЁТ', 600, 44, 'Inter Tight', 16);
  letters(L2, 0, 300, (c, i, x) => {
    const a = smooth(seg(t - 2.5 - Math.abs(x) / 1800, 0, 0.4));
    if (a <= 0) return;
    ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 24);
    if (a < 0.98) blurGlyph(c, L2.font, 44, '#efe4e4', (1 - a) * 8);
    else { ctx.fillStyle = '#efe4e4'; ctx.fillText(c, 0, 0); }
  });
  ctx.restore();
}
function scene1(t) {
  camS1(t);
  bgGlow(W * 0.5, H * 0.55, 1100, 0.55);
  beginWorld();
  ctx.save(); plane(1900); drawClock(t, 0.7 * smooth(seg(t, 0, 0.9))); ctx.restore();
  drawDust(dust1Far, t, 1000);
  drawECG(t);
  drawTitle1(t);
  drawDust(dust1Near, t, 1000, '255,60,70', 15, 0.8);
  ctx.restore();
}

/* =====================================================================
   СЦЕНА 2 · КОНТЕНТ (4–8 с): пролёт сквозь ленту постов вдоль линии-графика
   ===================================================================== */
const CH = { chart: 430, video: 560, text: 380, gift: 470, poll: 400, quote: 360 };
const cards = (() => {
  const r = rand(42);
  const types = ['chart', 'video', 'text', 'gift', 'poll', 'video', 'quote', 'text', 'gift', 'video', 'poll', 'chart', 'quote', 'video', 'gift', 'chart', 'video', 'text'];
  return types.map((ty, i) => {
    const side = i % 2 ? 1 : -1;
    return { ty, side, x: side * (640 + r() * 340), y: (r() - 0.5) * 720, z: -1150 + i * 250, rot: (r() - 0.5) * 12 * DEG, seed: i * 13 + 5 };
  });
})();
const dust2 = mkDust(21, 130, 2200, 1300, -1400, 4200);
const floorX = z => 70 * Math.sin(z * 0.0017);
const floorY = z => 620 - (0.045 * (z + 1400) + 45 * Math.sin(z * 0.0042) + 22 * Math.sin(z * 0.013));
const FLOOR_END = 2600;
const cardC = document.createElement('canvas'), cardX = cardC.getContext('2d');
function s2z(u) {
  let z = -1500 + (4000 / 3) * (1 - Math.exp(-3 * u)) + 160 * u;
  const n = 60, a = 3.0, b = Math.min(u, 4.0);
  if (b > a) { const dx = (b - a) / n; for (let i = 0; i < n; i++) { const s = smooth(seg(a + (i + 0.5) * dx, 3.0, 4.0)); z += 3500 * s * s * dx; } }
  return z;
}
function camS2(t) {
  const u = t - 4;
  cam.z = s2z(u);
  cam.x = 70 * Math.sin(u * 0.9) * (1 - smooth(seg(u, 2.6, 3.8))) + floorX(FLOOR_END) * smooth(seg(u, 2.6, 3.8));
  cam.y = -12 * Math.sin(u * 1.1) - 640 * eInCubic(seg(u, 3.2, 4.0));
  cam.roll = 7.8 * DEG * Math.exp(-u * 3.5) + 2.2 * DEG * Math.sin(u * 1.3) * (1 - Math.exp(-u * 3));
}
function avatar(x, y, r, t) {
  const v = vid(t);
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip();
  ctx.fillStyle = '#a0101a'; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  if (ready(v)) ctx.drawImage(v, x - r, y - r, r * 2, r * 2);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,50,60,0.9)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, r + 2, 0, 7); ctx.stroke();
}
function drawCard(c, t) {
  const w = 480, h = CH[c.ty];
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 24;
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, '#221a1d'); g.addColorStop(1, '#100b0d');
  rr(-w / 2, -h / 2, w, h, 30); ctx.fillStyle = g; ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,60,72,0.32)'; ctx.lineWidth = 2; rr(-w / 2, -h / 2, w, h, 30); ctx.stroke();
  const top = -h / 2 + 30, left = -w / 2 + 30, bw = w - 60;
  avatar(left + 28, top + 28, 28, t + c.seed * 0.1);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff'; ctx.font = '700 26px "Inter Tight"'; ctx.fillText('Memento Mori', left + 72, top + 15);
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '500 20px "Inter Tight"'; ctx.fillText('канал', left + 72, top + 44);
  const by = top + 82;
  const r = rand(c.seed);
  if (c.ty === 'chart') {
    rr(left, by, bw, 270, 16); ctx.fillStyle = 'rgba(255,255,255,0.035)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(left, by + i * 54); ctx.lineTo(left + bw, by + i * 54); ctx.stroke(); }
    let v = 0.25; const pts = [];
    for (let i = 0; i < 14; i++) {
      const o = v; v = clamp(v + (r() - 0.38) * 0.22, 0.08, 0.92);
      const x = left + 22 + i * ((bw - 44) / 13), y1 = by + 250 - o * 230, y2 = by + 250 - v * 230;
      const up = v > o; ctx.fillStyle = up ? 'rgba(255,240,240,0.85)' : '#e8162a';
      ctx.fillRect(x - 3, Math.min(y1, y2) - 12, 2, Math.abs(y1 - y2) + 24);
      ctx.fillRect(x - 9, Math.min(y1, y2), 16, Math.max(4, Math.abs(y1 - y2)));
      pts.push([x, y2]);
    }
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = '#ff2a3a'; ctx.lineWidth = 3; ctx.shadowColor = 'rgba(255,20,40,0.9)'; ctx.shadowBlur = 14; ctx.stroke(); ctx.shadowBlur = 0;
  } else if (c.ty === 'video') {
    const v = vid(t + c.seed * 0.37);
    ctx.save(); rr(left, by, bw, bw, 16); ctx.clip();
    if (ready(v)) ctx.drawImage(v, left, by, bw, bw);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(left, by, bw, bw);
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.arc(0, by + bw / 2, 44, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-14, by + bw / 2 - 22); ctx.lineTo(24, by + bw / 2); ctx.lineTo(-14, by + bw / 2 + 22); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(left + 16, by + bw - 22, bw - 32, 5);
    ctx.fillStyle = '#ff2a3a'; ctx.fillRect(left + 16, by + bw - 22, (bw - 32) * (((t * 0.2 + c.seed * 0.1) % 1)), 5);
  } else if (c.ty === 'text') {
    [1, 0.93, 0.97, 0.62].forEach((k, i) => { rr(left, by + i * 32, bw * k, 14, 7); ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fill(); });
    ['🔥', '💀', '🖤'].forEach((e, i) => {
      rr(left + i * 96, by + 150, 84, 46, 23); ctx.fillStyle = 'rgba(255,40,55,0.16)'; ctx.fill();
      ctx.font = '24px "Noto Color Emoji"'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(e, left + i * 96 + 42, by + 174);
    });
  } else if (c.ty === 'quote') { // реальный пост канала
    ctx.fillStyle = '#f3eaea'; ctx.font = '600 25px "Inter Tight"'; ctx.textAlign = 'left';
    ['В советском союзе был', 'такой ритуал — наслаждаться', 'банкой энергетика.'].forEach((l, i) => ctx.fillText(l, left, by + 14 + i * 36));
    ['😂', '🔥'].forEach((e, i) => {
      rr(left + i * 96, by + 136, 84, 46, 23); ctx.fillStyle = 'rgba(255,40,55,0.16)'; ctx.fill();
      ctx.font = '24px "Noto Color Emoji"'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(e, left + i * 96 + 42, by + 160);
    });
  } else if (c.ty === 'gift') {
    ctx.textAlign = 'center';
    ctx.font = '104px "Noto Color Emoji"'; ctx.fillText('🎁', 0, by + 66);
    ctx.font = '700 58px "Oswald"'; ctx.fillStyle = '#ff2a3a'; ctx.shadowColor = 'rgba(255,20,40,0.8)'; ctx.shadowBlur = 18;
    ctx.fillText(c.seed % 2 ? 'ТУРНИР' : 'РОЗЫГРЫШ', 0, by + 178); ctx.shadowBlur = 0;
    rr(-140, by + 222, 280, 58, 29); ctx.fillStyle = '#e0101e'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '800 22px "Inter Tight"'; ctx.fillText('УЧАСТВОВАТЬ', 0, by + 252);
  } else if (c.ty === 'poll') {
    [0.74, 0.46, 0.22].forEach((k, i) => {
      const y = by + i * 74;
      rr(left, y, bw * (0.45 + r() * 0.2), 12, 6); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fill();
      rr(left, y + 26, bw, 18, 9); ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fill();
      rr(left, y + 26, bw * k, 18, 9); ctx.fillStyle = i === 0 ? '#e8162a' : 'rgba(255,60,70,0.45)'; ctx.fill();
    });
  }
}
function drawFloor(t) {
  const u = t - 4;
  const z0 = Math.max(cam.z + 40, -1400);
  // линия вдоль пола: кусками, толщина — по перспективе
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(255,20,40,0.9)'; ctx.shadowBlur = 20; ctx.strokeStyle = '#ff2433';
  const step = 25; let prev = null, chunk = [];
  const flush = () => {
    if (chunk.length < 2) return;
    ctx.beginPath(); chunk.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.lineWidth = Math.max(1, 7 * chunk[0].s); ctx.stroke();
  };
  for (let z = z0; z <= FLOOR_END; z += step) {
    const p = P(floorX(z), floorY(z), z); if (!p) continue;
    chunk.push(p);
    if (chunk.length >= 6) { flush(); chunk = [chunk[chunk.length - 1]]; }
    prev = p;
  }
  // вертикальный взлёт в конце — переход к розыгрышам
  const L = 5200 * eInCubic(seg(u, 3.05, 4.0));
  const pEnd = P(floorX(FLOOR_END), floorY(FLOOR_END), FLOOR_END);
  if (pEnd) chunk.push(pEnd);
  flush();
  if (L > 0 && pEnd) {
    const pTop = P(floorX(FLOOR_END), floorY(FLOOR_END) - L, FLOOR_END);
    ctx.beginPath(); ctx.moveTo(pEnd.x, pEnd.y); ctx.lineTo(pTop.x, pTop.y);
    ctx.lineWidth = 7 * pEnd.s; ctx.stroke();
    ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,230,230,0.9)'; ctx.lineWidth = 2 * pEnd.s; ctx.stroke();
  }
  ctx.restore();
  // свечи вдоль графика
  const r = rand(5);
  for (let z = -1350; z < FLOOR_END - 100; z += 150) {
    const side = r() < 0.5 ? -1 : 1, h = 40 + r() * 120, up = r() < 0.55;
    if (z < cam.z + 60) continue;
    const x = floorX(z) + side * 55, yb = floorY(z) - 14;
    const a = P(x, yb - h, z), b = P(x, yb, z); if (!a || !b) continue;
    const w = 22 * a.s;
    ctx.fillStyle = up ? 'rgba(255,235,235,0.75)' : 'rgba(232,22,42,0.9)';
    ctx.fillRect(a.x - w / 2, a.y, w, b.y - a.y);
    ctx.fillRect(a.x - w * 0.08, a.y - 18 * a.s, w * 0.16, b.y - a.y + 36 * a.s);
  }
}
function drawText2(t) {
  const u = t - 4, TZ = 1400;
  const dz = TZ - cam.z;
  if (dz < 140) return;
  const fade = clamp((dz - 140) / 380);
  ctx.save(); plane(TZ); ctx.globalAlpha = fade;
  const L1 = lay('РАЗНЫЙ', 800, 90, 'Inter Tight', 30);
  letters(L1, 0, -215, (c, i) => {
    const k = u - 0.5 - i * 0.04; if (k <= 0) return;
    const sp = spring(k, 2.4, 7); ctx.scale(sp, sp); ctx.fillStyle = '#fff'; ctx.fillText(c, 0, 0);
  });
  const L2 = lay('КОНТЕНТ', 700, 300, 'Oswald', 8);
  letters(L2, 0, 15, (c, i) => {
    const k = u - 1.0 - Math.abs(i - 3) * 0.045; if (k <= 0) return;
    const sc = 1 + 1.6 * Math.exp(-k * 10);
    ctx.globalAlpha = fade * clamp(k / 0.1); ctx.scale(sc, sc);
    hotLetter(c, 300, Math.exp(-k * 4), 40);
  });
  const L3 = lay('ЛИЧНЫЙ БЛОГ С ЮМОРОМ', 600, 46, 'Inter Tight', 16);
  const wk = eOutCubic(seg(u, 1.55, 2.15));
  if (wk > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(-L3.total / 2 - 20, 140, (L3.total + 40) * wk, 80); ctx.clip();
    letters(L3, 0, 182, c => { ctx.fillStyle = '#efe4e4'; ctx.fillText(c, 0, 0); });
    ctx.restore();
    ctx.fillStyle = '#ff2433';
    ctx.fillRect(-L3.total / 2 - 40 - 140 * wk, 180, 140 * wk, 4); ctx.fillRect(L3.total / 2 + 40, 180, 140 * wk, 4);
  }
  ctx.restore();
}
function scene2(t) {
  camS2(t);
  const u = t - 4;
  bgGlow(W * 0.5, H * 0.5, 1200, 0.5);
  beginWorld();
  const focus = Math.max(300, 1400 - cam.z);
  drawDust(dust2, t, focus);
  drawFloor(t);
  const items = cards.map(c => ({ z: c.z, c })).concat([{ z: 1400, text: true }]).sort((a, b) => b.z - a.z);
  for (const it of items) {
    if (it.text) { drawText2(t); continue; }
    const c = it.c;
    const fl = 14 * Math.sin(t * 0.9 + c.seed);
    const pr = P(c.x, c.y + fl, c.z);
    if (!pr || pr.dz < 90) continue;
    const fade = clamp((pr.dz - 90) / 260) * clamp((5600 - pr.dz) / 1600);
    if (fade <= 0) continue;
    const coc = Math.min(16, 9000 * Math.abs(1 / pr.dz - 1 / focus));
    const q = clamp(pr.s / (1 + coc * 0.6), 0.03, 1.6), pad = 70;
    const cw = Math.ceil((480 + pad * 2) * q), chh = Math.ceil((CH[c.ty] + pad * 2) * q);
    if (cardC.width < cw || cardC.height < chh) { cardC.width = Math.max(cardC.width, cw); cardC.height = Math.max(cardC.height, chh); }
    const keep = ctx; ctx = cardX;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cw + 2, chh + 2);
    ctx.setTransform(q, 0, 0, q, cw / 2, chh / 2); drawCard(c, t);
    ctx = keep;
    ctx.save(); ctx.translate(pr.x, pr.y); ctx.scale(pr.s, pr.s);
    const yaw = -c.side * 18 * DEG;
    ctx.transform(Math.cos(yaw), c.side * Math.sin(-yaw) * 0.18, 0, 1, 0, 0);
    ctx.rotate(c.rot); ctx.scale(1 / q, 1 / q);
    ctx.globalAlpha = fade; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cardC, 0, 0, cw, chh, -cw / 2, -chh / 2, cw, chh);
    ctx.restore();
  }
  ctx.restore();
  // скоростные штрихи на разгоне
  const sp = 4000 * Math.exp(-3 * u) + 3500 * Math.pow(smooth(seg(u, 3, 4)), 2);
  if (sp > 900) {
    const r = rand(77); ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 40; i++) {
      const ang = r() * Math.PI * 2, d0 = 300 + r() * 700, len = (sp / 4000) * (120 + r() * 300);
      const ph = ((t * (1.5 + r()) + r()) % 1);
      const d = d0 + ph * 800;
      ctx.strokeStyle = `rgba(255,${r() < 0.5 ? 220 : 60},${r() < 0.5 ? 220 : 70},${0.18 * (1 - ph)})`;
      ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(W / 2 + Math.cos(ang) * d, H / 2 + Math.sin(ang) * d);
      ctx.lineTo(W / 2 + Math.cos(ang) * (d + len), H / 2 + Math.sin(ang) * (d + len)); ctx.stroke();
    }
    ctx.restore();
  }
}

/* =====================================================================
   СЦЕНА 3 · РОЗЫГРЫШИ (8–12 с): линия обвязывает подарок, крышка вылетает
   ===================================================================== */
const dust3 = mkDust(31, 90, 2400, 1400, 400, 3600);
const sparks = (() => {
  const r = rand(303);
  return Array.from({ length: 150 }, () => ({
    vx: (r() - 0.5) * 1500, vy: -700 - r() * 1500, vz: (r() - 0.5) * 900, life: 0.8 + r() * 1.2,
    c: r() < 0.45 ? '255,235,225' : r() < 0.8 ? '255,40,55' : '255,150,90', w: 2 + r() * 3, d: r() * 0.12,
  }));
})();
function boxState(t) {
  const B = { x: 0, y: 260, z: 0, sx: 1, sy: 1, yaw: (24 + 12 * seg(t, 8, 12)) * DEG, roll: 0 };
  if (t < 9.0) {
    const k = seg(t, 8.42, 9.0);
    B.y = lerp(-2300, 260, k * k);
    B.sy = 1 + 0.14 * k * k; B.sx = 1 / Math.sqrt(B.sy);
  } else {
    const u = t - 9.0;
    B.sy = 1 - 0.24 * Math.exp(-u * 9) * Math.cos(2 * Math.PI * 3 * u);
    // дрожь перед открытием
    for (const h of [9.5, 9.75]) { const k = seg(t, h, h + 0.14); B.y -= 26 * Math.sin(Math.PI * k); }
    B.roll = 3.5 * DEG * Math.sin(2 * Math.PI * 9 * (t - 9.5)) * decay(t, 9.5, 3) * (t > 9.5 ? 1 : 0);
    const ant = seg(t, 9.84, 10.0), rel = t >= 10 ? Math.exp(-(t - 10) * 7) * Math.cos(2 * Math.PI * 2.6 * (t - 10)) : 0;
    B.sy *= (t < 10 ? 1 - 0.12 * smooth(ant) : 1 + 0.18 * rel);
    B.sx = 1 / Math.sqrt(B.sy);
  }
  return B;
}
function xf(p, B, pivot = [0, 0, 0]) {
  let x = p[0] * B.sx, y = p[1] * B.sy, z = p[2] * B.sx;
  const cr = Math.cos(B.roll), sr = Math.sin(B.roll);
  [x, y] = [x * cr - y * sr, x * sr + y * cr];
  const c = Math.cos(B.yaw), s = Math.sin(B.yaw);
  return [B.x + pivot[0] + x * c + z * s, B.y + pivot[1] + y, B.z + pivot[2] - x * s + z * c];
}
const FACES = [
  { n: [0, 0, -1], v: [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1]], band: 'u' },
  { n: [0, 0, 1], v: [[1, -1, 1], [-1, -1, 1], [-1, 1, 1], [1, 1, 1]], band: 'u' },
  { n: [-1, 0, 0], v: [[-1, -1, 1], [-1, -1, -1], [-1, 1, -1], [-1, 1, 1]], band: 'u' },
  { n: [1, 0, 0], v: [[1, -1, -1], [1, -1, 1], [1, 1, 1], [1, 1, -1]], band: 'u' },
  { n: [0, -1, 0], v: [[-1, -1, 1], [1, -1, 1], [1, -1, -1], [-1, -1, -1]], band: 'top' },
];
const LIGHT = (() => { const v = [-0.45, -0.75, -0.55]; const l = Math.hypot(...v); return v.map(a => a / l); })();
function rotN(n, B) {
  const cr = Math.cos(B.roll), sr = Math.sin(B.roll);
  let [x, y, z] = [n[0] * cr - n[1] * sr, n[0] * sr + n[1] * cr, n[2]];
  const c = Math.cos(B.yaw), s = Math.sin(B.yaw);
  return [x * c + z * s, y, -x * s + z * c];
}
// рисует коробку: half = [hx, hy, hz], y-диапазон локально от y0 (верх) до y1 (низ)
function drawCuboid(B, half, y0, y1, pivot, opts) {
  const [hx, , hz] = half;
  const faces = [];
  for (const f of FACES) {
    if (f.band === 'top' && opts.noTop) continue;
    const wv = f.v.map(([a, b, c]) => xf([a * hx, b < 0 ? y0 : y1, c * hz], B, pivot));
    const n = rotN(f.n, B);
    const ctr = wv.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4, s[2] + p[2] / 4], [0, 0, 0]);
    const view = [ctr[0] - cam.x, ctr[1] - cam.y, ctr[2] - cam.z];
    if (n[0] * view[0] + n[1] * view[1] + n[2] * view[2] >= 0) continue;
    const pv = wv.map(p => P(...p)); if (pv.some(p => !p)) continue;
    faces.push({ f, n, pv, wv, depth: Math.hypot(...view) });
  }
  faces.sort((a, b) => b.depth - a.depth);
  for (const F of faces) {
    const lit = Math.max(0, -(F.n[0] * LIGHT[0] + F.n[1] * LIGHT[1] + F.n[2] * LIGHT[2]));
    const rim = Math.max(0, F.n[0] * 0.85 + F.n[2] * 0.4);
    const b = 0.35 + 0.9 * lit;
    const col = `rgb(${Math.round(30 * b + 150 * rim * opts.rim)},${Math.round(23 * b + 8 * rim)},${Math.round(27 * b + 12 * rim)})`;
    ctx.beginPath(); F.pv.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
    ctx.strokeStyle = `rgba(255,${120 + 100 * lit},${120 + 100 * lit},${0.12 + 0.25 * lit})`; ctx.lineWidth = 1.5; ctx.stroke();
    // лента
    if (opts.ribbon > 0) {
      const q = F.pv, bl = (u, v) => ({
        x: lerp(lerp(q[0].x, q[1].x, u), lerp(q[3].x, q[2].x, u), v),
        y: lerp(lerp(q[0].y, q[1].y, u), lerp(q[3].y, q[2].y, u), v),
      });
      const quad = (u0, u1, v0, v1) => { const a = [bl(u0, v0), bl(u1, v0), bl(u1, v1), bl(u0, v1)]; ctx.beginPath(); a.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.fill(); };
      const rb = 0.5 + 0.7 * lit;
      ctx.save(); ctx.fillStyle = `rgb(${Math.round(230 * rb)},${Math.round(16 * rb)},${Math.round(34 * rb)})`;
      ctx.shadowColor = 'rgba(255,20,40,0.7)'; ctx.shadowBlur = 14;
      const R = opts.ribbon;
      if (F.f.band === 'top') { quad(0.43, 0.57, 0.5 - R / 2, 0.5 + R / 2); quad(0.5 - R / 2, 0.5 + R / 2, 0.43, 0.57); }
      else quad(0.43, 0.57, 0, R);
      ctx.restore();
    }
  }
  return faces;
}
function drawBow(B, lidPivot, k, t) {
  const p = xf([0, -40, 0], B, lidPivot); const pr = P(...p); if (!pr || k <= 0) return;
  const sc = spring(k, 2.4, 6) * pr.s;
  ctx.save(); ctx.translate(pr.x, pr.y); ctx.scale(sc, sc); ctx.rotate(-0.08 + B.roll);
  ctx.shadowColor = 'rgba(255,20,40,0.85)'; ctx.shadowBlur = 22; ctx.fillStyle = '#e3122a';
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(s * 40, -110, s * 140, -90, s * 110, -10);
    ctx.bezierCurveTo(s * 90, 30, s * 30, 10, 0, 0); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * 70, 70); ctx.lineTo(s * 40, 76); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#ff4152'; ctx.beginPath(); ctx.ellipse(0, -4, 22, 18, 0, 0, 7); ctx.fill();
  ctx.restore();
}
function camS3(t) {
  const up = eOutCubic(seg(t, 8.0, 8.9));
  const pull = eOutCubic(seg(t, 10.0, 10.9)), push = eInCubic(seg(t, 11.45, 12.0));
  cam.x = lerp(-40, 40, seg(t, 8.9, 11.5)) + 20 * Math.sin(t * 0.8);
  cam.y = lerp(780, -110, up) - 130 * pull + 80 * push;
  cam.z = -1000 - 60 * seg(t, 9.0, 10.0) - 320 * pull + 380 * push;
  cam.roll = (1.5 * Math.sin(t * 0.9) - 2.5 * push) * DEG;
}
function scene3(t) {
  camS3(t);
  shake(t, [[9.0, 9], [10.0, 14]]);
  bgGlow(W * 0.5, H * 0.62, 1100, 0.6);
  const open = t >= 10;
  beginWorld();
  drawDust(dust3, t, 1000);
  const B = boxState(t);
  const HB = [170, 150, 170];
  const rib = eOutCubic(seg(t, 8.72, 9.12));
  // пол: контактная тень и отражённое свечение
  ctx.save(); plane(0);
  const hgt = Math.max(0, 260 - B.y);
  ctx.translate(B.x, 262); ctx.scale(1, 0.16);
  const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, 330 + hgt * 0.2);
  sh.addColorStop(0, `rgba(0,0,0,${0.85 * clamp(1 - hgt / 1800)})`); sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(0, 0, 330 + hgt * 0.2, 0, 7); ctx.fill();
  if (open) {
    const gl = 0.5 + 0.5 * decay(t, 10, 2);
    const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, 900);
    rg.addColorStop(0, `rgba(255,30,45,${0.35 * gl})`); rg.addColorStop(1, 'rgba(255,0,20,0)');
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, 900, 0, 7); ctx.fill();
  }
  ctx.restore();
  // линия: снизу вверх, затем втягивается в ленту
  {
    const yb = t < 8.7 ? 4000 : lerp(4000, 260, eInCubic(seg(t, 8.7, 9.05)));
    const yt = lerp(-3200, -120, eInCubic(seg(t, 8.95, 9.2)));
    if (yb > yt + 2 && t < 9.2) {
      ctx.save(); plane(0); ctx.lineCap = 'round';
      ctx.strokeStyle = '#ff2433'; ctx.shadowColor = 'rgba(255,20,40,0.95)'; ctx.shadowBlur = 26; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(0, yb); ctx.lineTo(0, yt); ctx.stroke();
      ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,235,235,0.95)'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.restore();
    }
  }
  // лучи из открытой коробки (за коробкой и буквами)
  const mouth = xf([0, -300, 0], B);
  const pm = P(...mouth);
  if (open && pm) {
    const I = 0.35 + 0.65 * decay(t, 10, 2.2);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const rg = ctx.createRadialGradient(pm.x, pm.y, 0, pm.x, pm.y, 1100);
    rg.addColorStop(0, `rgba(255,220,210,${0.55 * I})`); rg.addColorStop(0.25, `rgba(255,40,55,${0.35 * I})`); rg.addColorStop(1, 'rgba(255,0,20,0)');
    ctx.fillStyle = rg;
    for (let i = 0; i < 11; i++) {
      const a = -Math.PI / 2 + (i - 5) * 0.2 + 0.05 * Math.sin(t * 1.5 + i);
      const wdt = 0.05 + 0.03 * Math.sin(i * 2.1);
      ctx.beginPath(); ctx.moveTo(pm.x, pm.y);
      ctx.lineTo(pm.x + Math.cos(a - wdt) * 1400, pm.y + Math.sin(a - wdt) * 1400);
      ctx.lineTo(pm.x + Math.cos(a + wdt) * 1400, pm.y + Math.sin(a + wdt) * 1400); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  // тело коробки (без крышки сверху — открытая горловина)
  drawCuboid(B, HB, -300, 0, [0, 0, 0], { ribbon: rib, rim: 1, noTop: true });
  // горловина: тёмная внутренность / свечение после открытия
  {
    const q = [[-1, -1, 1], [1, -1, 1], [1, -1, -1], [-1, -1, -1]].map(([a, , c]) => P(...xf([a * 162, -300, c * 162], B)));
    if (q.every(Boolean) && cam.y < B.y - 300 * B.sy) {
      ctx.beginPath(); q.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath();
      ctx.fillStyle = '#080506'; ctx.fill();
      if (open && pm) {
        const I = 0.5 + 0.5 * decay(t, 10, 2);
        const g = ctx.createRadialGradient(pm.x, pm.y, 0, pm.x, pm.y, 160 * pm.s);
        g.addColorStop(0, `rgba(255,240,230,${I})`); g.addColorStop(0.5, `rgba(255,50,60,${0.8 * I})`); g.addColorStop(1, 'rgba(120,0,10,0.4)');
        ctx.fillStyle = g; ctx.fill();
      }
    }
  }
  // крышка
  if (!open) {
    const lift = t > 9.84 ? -18 * smooth(seg(t, 9.84, 10.0)) : 0;
    const LB = { ...B };
    const piv = [0, -300 * B.sy + lift, 0];
    LB.sy = 1;
    drawCuboid(LB, [182, 0, 182], -40, 32, piv, { ribbon: clamp(rib * 1.4), rim: 1 });
    drawBow(LB, piv, seg(t, 9.0, 10.0) > 0 ? t - 9.05 : 0, t);
    if (lift < -2 && pm) { // свет из щели
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(pm.x, pm.y, 0, pm.x, pm.y, 300 * pm.s);
      g.addColorStop(0, `rgba(255,80,80,${0.6 * seg(t, 9.84, 10)})`); g.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0 - W, 0 - H, W * 2, H * 2); ctx.restore();
    }
  }
  // искры
  if (open) {
    const m = xf([0, -300, 0], B);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const s of sparks) {
      const u = t - 10 - s.d; if (u <= 0 || u > s.life) continue;
      const pos = uu => [m[0] + s.vx * uu, m[1] + s.vy * uu + 900 * uu * uu, m[2] + s.vz * uu];
      const a = P(...pos(Math.max(0, u - 0.035))), b = P(...pos(u)); if (!a || !b) continue;
      const al = 1 - u / s.life;
      ctx.strokeStyle = `rgba(${s.c},${al})`; ctx.lineWidth = s.w * b.s;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.restore();
  }
  // крышка улетает
  if (open) {
    const u = t - 10;
    const LB = { ...B, sy: 1, sx: 1, roll: u * 9.5 };
    const piv = [600 * u, -300 - 1750 * u + 850 * u * u, -120 * u];
    if (u < 1.2) {
      drawCuboid(LB, [182, 0, 182], -40, 32, piv, { ribbon: 1, rim: 1 });
      drawBow(LB, piv, 2, t);
    }
  }
  // буквы вылетают из коробки
  const L = lay('РОЗЫГРЫШИ', 700, 200, 'Oswald', 8);
  ctx.save(); plane(0);
  ctx.font = L.font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  L.ch.forEach((c, i) => {
    const k0 = t - 10.04 - i * 0.045;
    if (k0 <= 0) return;
    const k = eOutCubic(clamp(k0 / 0.55));
    const fx = L.xs[i], fy = -470;
    const x = (1 - k) * (1 - k) * mouth[0] + 2 * (1 - k) * k * fx * 0.3 + k * k * fx;
    const y = (1 - k) * (1 - k) * (mouth[1] - 10) + 2 * (1 - k) * k * -1050 + k * k * fy;
    const land = k0 > 0.55 ? spring(k0 - 0.55, 2.8, 7) : 0;
    ctx.save(); ctx.translate(x, y);
    ctx.rotate((1 - k) * (i % 2 ? 1 : -1) * 3.2);
    const sc = lerp(0.25, 1, k) * (k0 > 0.55 ? 1 + 0.12 * (1 - land) : 1);
    ctx.scale(sc, sc * (k0 > 0.55 ? 1 - 0.1 * (1 - land) : 1));
    hotLetter(c, 200, Math.exp(-k0 * 2.5), 40);
    ctx.restore();
  });
  const L4 = lay('И ТУРНИРЫ ПО BRAWL STARS', 700, 40, 'Inter Tight', 10);
  letters(L4, 0, -228, (c, i) => {
    const k = t - 10.72 - i * 0.012; if (k <= 0) return;
    const sp = spring(k, 2.4, 7); ctx.scale(sp, sp); ctx.fillStyle = '#ff8a92'; ctx.fillText(c, 0, 0);
  });
  const L2 = lay('ЗАБИРАЙ СВОЁ, ПОКА ЕСТЬ ВРЕМЯ', 600, 42, 'Inter Tight', 12);
  letters(L2, 0, -300, (c, i, x) => {
    const a = smooth(seg(t - 10.6 - (x + L2.total / 2) / 4000, 0, 0.3));
    if (a <= 0) return;
    ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 18); ctx.fillStyle = '#f1e6e6'; ctx.fillText(c, 0, 0);
  });
  ctx.restore();
  ctx.restore();
  // хвост ленты превращается в лезвие косы
  drawScythe(t);
}
const SL = { ang: -32 * DEG };
SL.d = [Math.cos(SL.ang), Math.sin(SL.ang)];
SL.n = [-SL.d[1], SL.d[0]];
function drawScythe(t) {
  if (t < 11.55) return;
  const R = 2600, C = [W / 2 - SL.n[0] * R, H / 2 - SL.n[1] * R];
  const phc = Math.atan2(SL.n[1], SL.n[0]);
  const k = Math.pow(seg(t, 11.55, 12.0), 1.5);
  const lead = phc + 0.42 - 1.0 * k, trail = lead + 0.22 + 0.3 * k;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath();
  const N = 60;
  for (let i = 0; i <= N; i++) { const a = lerp(lead, trail, i / N); ctx.lineTo(C[0] + Math.cos(a) * R, C[1] + Math.sin(a) * R); }
  for (let i = N; i >= 0; i--) { const q = i / N, a = lerp(lead, trail, q), th = 46 * Math.sin(Math.PI * Math.pow(q, 0.6)); ctx.lineTo(C[0] + Math.cos(a) * (R - th), C[1] + Math.sin(a) * (R - th)); }
  ctx.closePath();
  ctx.shadowColor = 'rgba(255,30,45,1)'; ctx.shadowBlur = 40;
  ctx.fillStyle = 'rgba(255,60,70,0.95)'; ctx.fill();
  ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,245,240,0.9)'; ctx.lineWidth = 3;
  ctx.beginPath(); for (let i = 0; i <= N; i++) { const a = lerp(lead, trail, i / N); ctx.lineTo(C[0] + Math.cos(a) * R, C[1] + Math.sin(a) * R); } ctx.stroke();
  ctx.restore();
}

/* =====================================================================
   СЦЕНЫ 4–5 · ВЛАДЕЛЕЦ и ФИНАЛ (12–20 с)
   ===================================================================== */
const dust4 = mkDust(41, 70, 2200, 1300, 300, 3200);
const dust4Near = mkDust(42, 14, 1000, 600, -850, -450, 2, 4);
const blurC = document.createElement('canvas'); blurC.width = blurC.height = 80;
const bctx = blurC.getContext('2d');
function camS45(t) {
  if (t < 16) {
    const k = (t - 12) / 4;
    cam.x = lerp(-70, 50, k); cam.y = 6 * Math.sin(t * 0.9);
    cam.z = lerp(-1080, -950, eInOut(k)); cam.roll = lerp(1.6, -0.6, eInOut(k)) * DEG;
  } else {
    const k = eInOut(seg(t, 16, 17.4));
    cam.x = lerp(50, 0, k) + 5 * Math.sin((t - 16) * 0.7);
    cam.y = lerp(6 * Math.sin(16 * 0.9), 0, k);
    cam.z = lerp(-950, -1010, k) + 22 * seg(t, 17.4, 20);
    cam.roll = lerp(-0.6, 0, k) * DEG;
  }
}
function bgVideo(t, alpha) {
  const v = vid(t); if (!ready(v)) return;
  bctx.filter = 'blur(3px)'; bctx.drawImage(v, -10, -10, 100, 100);
  ctx.save(); ctx.globalAlpha = alpha; ctx.imageSmoothingQuality = 'high';
  const sz = 2400;
  ctx.drawImage(blurC, W / 2 - sz / 2 - cam.x * 0.25, H / 2 - sz / 2 - cam.y * 0.25, sz, sz);
  ctx.restore();
  ctx.fillStyle = 'rgba(6,3,4,0.62)'; ctx.fillRect(0, 0, W, H);
}
const FINAL_BEATS = [16.5, 17.25, 18.0, 22.0];
function avatarState(t) {
  const sl = 1 - eOutExpo(seg(t, 12.02, 12.75));
  let x = 330 - SL.d[0] * 260 * sl, y = -10 - SL.d[1] * 260 * sl, size = 640 * (1 + 0.12 * sl), rad = 28;
  let yaw = lerp(-16, -6, seg(t, 12, 15.3)) * DEG;
  const k = eInOut(seg(t, 15.3, 16.4));
  x = lerp(x, 0, k); y = lerp(y, -200, k); size = lerp(size, 300, k); rad = lerp(rad, 150, k); yaw = lerp(yaw, 0, k);
  let pulse = 0; for (const tb of FINAL_BEATS) pulse += 0.055 * decay(t, tb, 7);
  return { x, y, size: size * (1 + pulse), rad: rad * (1 + pulse), yaw, k, pulse };
}
function drawAvatarCard(t) {
  const A = avatarState(t), v = vid(t);
  ctx.save(); plane(0); ctx.translate(A.x, A.y);
  ctx.transform(Math.cos(A.yaw), Math.sin(A.yaw) * 0.22, 0, 1, 0, 0);
  const h = A.size / 2;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 70; ctx.shadowOffsetY = 34;
  rr(-h, -h, A.size, A.size, A.rad); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
  ctx.save(); rr(-h, -h, A.size, A.size, A.rad); ctx.clip();
  if (ready(v)) ctx.drawImage(v, -h, -h, A.size, A.size);
  const sh = -A.yaw / (16 * DEG);
  const g = ctx.createLinearGradient(-h, 0, h, 0);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${0.4 * sh})`);
  ctx.fillStyle = g; ctx.fillRect(-h, -h, A.size, A.size);
  // блик пробегает при раскрытии
  const sw = seg(t, 12.25, 13.1);
  if (sw > 0 && sw < 1) {
    const px = lerp(-h * 2.2, h * 2.2, eInOut(sw));
    const bg = ctx.createLinearGradient(px - 160, -160, px + 160, 160);
    bg.addColorStop(0, 'rgba(255,255,255,0)'); bg.addColorStop(0.5, 'rgba(255,235,235,0.28)'); bg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = bg; ctx.fillRect(-h, -h, A.size, A.size);
  }
  ctx.restore();
  ctx.strokeStyle = `rgba(255,40,52,${0.95 - 0.6 * A.k})`; ctx.lineWidth = 3;
  ctx.shadowColor = 'rgba(255,30,40,0.95)'; ctx.shadowBlur = 30;
  rr(-h, -h, A.size, A.size, A.rad); ctx.stroke();
  ctx.restore();
}
function drawOwnerText(t) {
  const out = eInCubic(seg(t, 15.15, 15.75));
  if (out >= 1) return;
  ctx.save(); plane(0);
  ctx.translate(-900 * out, 0); ctx.globalAlpha = 1 - out;
  const X0 = -840;
  const L0 = lay('ВЛАДЕЛЕЦ КАНАЛА', 600, 34, 'Inter Tight', 12);
  const w0 = eOutCubic(seg(t, 12.75, 13.25));
  if (w0 > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(X0 - 10, -200, (L0.total + 20) * w0, 80); ctx.clip();
    letters(L0, X0 + L0.total / 2, -162, c => { ctx.fillStyle = '#ffb3b8'; ctx.fillText(c, 0, 0); });
    ctx.restore();
  }
  let L1 = lay('KAPUSTKA', 700, 180, 'Oswald', 6);
  if (L1.total > 760) L1 = lay('KAPUSTKA', 700, Math.floor(180 * 760 / L1.total), 'Oswald', 6);
  letters(L1, X0 + L1.total / 2, -20, (c, i) => {
    const k = t - 13.0 - i * 0.035; if (k <= 0) return;
    const e = eOutExpo(clamp(k / 0.45));
    ctx.translate(-SL.d[0] * 240 * (1 - e), -SL.d[1] * 240 * (1 - e));
    ctx.globalAlpha *= clamp(k / 0.08);
    hotLetter(c, L1.size, Math.exp(-k * 3.5), 40);
  });
  const ul = eInOut(seg(t, 13.45, 14.0));
  if (ul > 0) {
    ctx.save(); ctx.fillStyle = '#ff2433'; ctx.shadowColor = 'rgba(255,20,40,0.9)'; ctx.shadowBlur = 18;
    ctx.fillRect(X0, 82, L1.total * ul, 6);
    // по линии бежит импульс
    const px = X0 + L1.total * ((t - 14.0) * 0.6 % 1);
    if (t > 14) { const g = ctx.createRadialGradient(px, 85, 0, px, 85, 40); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,40,40,0)'); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(px - 40, 45, 80, 80); }
    ctx.restore();
  }
  const L2 = lay('t.me/memento_mori_osn', 600, 32, 'Inter Tight', 3);
  const a2 = smooth(seg(t, 14.1, 14.6));
  if (a2 > 0) { ctx.globalAlpha *= a2; letters(L2, X0 + L2.total / 2, 150 + 14 * (1 - a2), c => { ctx.fillStyle = 'rgba(255,225,225,0.8)'; ctx.fillText(c, 0, 0); }); }
  ctx.restore();
}
function drawRing(t) {
  const appear = seg(t, 16.0, 17.0);
  if (appear <= 0) return;
  const A = avatarState(t);
  const R = A.size / 2 + 26;
  let amp = 1; for (const tb of FINAL_BEATS) amp += 1.3 * decay(t, tb, 5);
  ctx.save(); plane(0); ctx.translate(A.x, A.y);
  ctx.beginPath();
  const sweep = eInOut(appear) * Math.PI * 2, a0 = Math.PI / 2;
  for (let i = 0; i <= 420; i++) {
    const a = a0 + sweep * i / 420;
    const d = Math.atan2(Math.sin(a + Math.PI / 2), Math.cos(a + Math.PI / 2)) * R; // длина дуги от верхней точки
    const out = amp * (10 * gauss(d + 58, 10) - 12 * gauss(d + 16, 4) + 62 * gauss(d, 5) - 22 * gauss(d - 14, 5) + 12 * gauss(d - 55, 14));
    const r = R + out;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = '#ff2433'; ctx.shadowColor = 'rgba(255,20,40,1)'; ctx.shadowBlur = 24 + 30 * (amp - 1); ctx.lineWidth = 5; ctx.stroke();
  ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,235,235,0.9)'; ctx.lineWidth = 1.6; ctx.stroke();
  // ударная волна финального удара
  const sk = seg(t, 18.0, 19.1);
  if (sk > 0 && sk < 1) {
    const e = eOutCubic(sk);
    ctx.beginPath(); ctx.arc(0, 0, R + 1700 * e, 0, 7);
    ctx.strokeStyle = `rgba(255,60,70,${0.75 * (1 - sk)})`; ctx.lineWidth = 2 + 26 * (1 - sk);
    ctx.shadowColor = 'rgba(255,20,40,0.9)'; ctx.shadowBlur = 40; ctx.stroke();
  }
  ctx.restore();
}
function drawCursor(t) {
  const k = eInOut(seg(t, 17.3, 17.92));
  if (k <= 0) return;
  const out = seg(t, 18.6, 19.3);
  const bx = 70, by = 290;
  const x = lerp(760, bx, k) + 80 * Math.sin(Math.PI * k) + 260 * eInCubic(out), y = lerp(560, by, k) - 60 * Math.sin(Math.PI * k) + 120 * eInCubic(out);
  const press = 1 - 0.16 * Math.sin(Math.PI * seg(t, 17.94, 18.12));
  ctx.save(); plane(0); ctx.translate(x, y); ctx.scale(1.25 * press, 1.25 * press);
  ctx.globalAlpha = 1 - out;
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 46); ctx.lineTo(11, 35); ctx.lineTo(19, 54); ctx.lineTo(27, 50); ctx.lineTo(19, 32); ctx.lineTo(34, 32); ctx.closePath();
  ctx.fillStyle = '#fff'; ctx.fill(); ctx.shadowBlur = 0; ctx.lineWidth = 2.5; ctx.strokeStyle = '#111'; ctx.stroke();
  ctx.restore();
}
function drawFinalText(t) {
  ctx.save(); plane(0);
  const heat = decay(t, 18.0, 3.5);
  const L = lay('MEMENTO MORI', 700, 132, 'Oswald', 8);
  const k = seg(t, 16.15, 17.0);
  if (k > 0) {
    const e = eOutCubic(k);
    ctx.font = L.font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    L.ch.forEach((c, i) => {
      if (c === ' ') return;
      ctx.save(); ctx.translate(L.xs[i] * (1 + (1 - e) * 0.9), 75);
      const s = 1 + 0.05 * heat; ctx.scale(s, s);
      const e2 = smooth(seg(e, 0.55, 1));
      if (e2 < 1) { ctx.globalAlpha = e * (1 - e2); blurGlyph(c, L.font, 132, '#f01424', (1 - e) * 14); }
      if (e2 > 0) { ctx.globalAlpha = e2; hotLetter(c, 132, heat * 0.85 + (1 - e) * 0.5, 34 + 30 * heat); }
      ctx.restore();
    });
  }
  const L2 = lay('TELEGRAM-КАНАЛ  ·  ВЛАДЕЛЕЦ KAPUSTKA', 600, 30, 'Inter Tight', 7);
  const w2 = eOutCubic(seg(t, 16.75, 17.3));
  if (w2 > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(-L2.total / 2 - 10, 140, (L2.total + 20) * w2, 60); ctx.clip();
    letters(L2, 0, 168, c => { ctx.fillStyle = 'rgba(255,236,236,0.8)'; ctx.fillText(c, 0, 0); });
    ctx.restore();
  }
  // кнопка
  const bk = t - 17.15;
  if (bk > 0) {
    const sp = spring(bk, 1.8, 6.5);
    const press = 1 - 0.07 * Math.sin(Math.PI * seg(t, 17.94, 18.14));
    ctx.save(); ctx.translate(0, 268 + (1 - clamp(sp)) * 50); ctx.scale(sp * press, sp * press);
    ctx.globalAlpha = clamp(bk / 0.15);
    const mk = eInOut(seg(t, 18.45, 18.9)); // после клика кнопка превращается в ссылку
    const bw = lerp(430, 600, mk), bh = 86;
    ctx.shadowColor = `rgba(255,20,40,${0.6 + 0.4 * heat})`; ctx.shadowBlur = 40 + 50 * heat;
    const g = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2); g.addColorStop(0, '#ff2b3b'); g.addColorStop(1, '#c4000f');
    rr(-bw / 2, -bh / 2, bw, bh, bh / 2); ctx.fillStyle = g; ctx.fill(); ctx.shadowBlur = 0;
    const rk = seg(t, 18.0, 18.6);
    if (rk > 0 && rk < 1) {
      ctx.save(); rr(-bw / 2, -bh / 2, bw, bh, bh / 2); ctx.clip();
      ctx.fillStyle = `rgba(255,255,255,${0.45 * (1 - rk)})`; ctx.beginPath(); ctx.arc(70, 22, 30 + 360 * eOutCubic(rk), 0, 7); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#fff'; ctx.font = '800 32px "Inter Tight"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const a1 = clamp(1 - mk * 2), a2 = clamp(mk * 2 - 1), ga = ctx.globalAlpha;
    if (a1 > 0) { ctx.globalAlpha = ga * a1; ctx.letterSpacing = '5px'; ctx.fillText('ПОДПИСАТЬСЯ', 3, 2 - 14 * mk); }
    if (a2 > 0) { ctx.globalAlpha = ga * a2; ctx.font = '700 34px "Inter Tight"'; ctx.letterSpacing = '1px'; ctx.fillText('t.me/memento_mori_osn', 0, 2 + 14 * (1 - a2)); }
    ctx.letterSpacing = '0px'; ctx.globalAlpha = ga;
    ctx.restore();
  }
  const L3 = lay('Помни о смерти. Не забудь подписаться.', 500, 36, 'Inter Tight', 2);
  letters(L3, 0, 385, (c, i) => {
    const a = smooth(seg(t - 18.35 - i * 0.014, 0, 0.35));
    if (a <= 0) return;
    ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 16);
    const col = i < 15 ? '#ff6b75' : 'rgba(255,240,240,0.85)';
    if (a < 0.98) blurGlyph(c, L3.font, 36, col, (1 - a) * 6);
    else { ctx.fillStyle = col; ctx.fillText(c, 0, 0); }
  });
  ctx.restore();
}
function scene45(t) {
  camS45(t);
  shake(t, [[12.0, 16], [13.0, 5], [18.0, 11]]);
  bgVideo(t, 0.9);
  bgGlow(W * 0.5, H * 0.5, 1200, 0.45 + 0.25 * decay(t, 18, 1.5), '150,0,15');
  beginWorld();
  // дальний план: контурное KAPUSTKA
  {
    const a = (t < 16 ? 1 : 1 - seg(t, 16, 16.8)) * smooth(seg(t, 12.05, 12.6));
    if (a > 0) {
      ctx.save(); plane(1800);
      ctx.font = '700 900px "Oswald"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeStyle = `rgba(255,40,52,${0.22 * a})`; ctx.lineWidth = 7;
      ctx.strokeText('KAPUSTKA', lerp(500, -500, seg(t, 12, 16.8)), 40);
      ctx.restore();
    }
  }
  drawDust(dust4, t, 1000, '255,50,60', 40);
  if (t < 16.6) drawOwnerText(t);
  drawRing(t);
  drawAvatarCard(t);
  if (t > 16) { drawFinalText(t); drawCursor(t); }
  drawDust(dust4Near, t, 1000, '255,70,80', 30, 0.7);
  ctx.restore();
}

// ---------- переход-разрез косой (12.0–12.75) ----------
let freeze3 = null;
function getFreeze3() {
  if (freeze3) return freeze3;
  freeze3 = document.createElement('canvas'); freeze3.width = W; freeze3.height = H;
  const keep = ctx; ctx = freeze3.getContext('2d');
  ctx.fillStyle = '#060405'; ctx.fillRect(0, 0, W, H);
  scene3(11.995);
  ctx = keep;
  return freeze3;
}
function slashCut(t) {
  const gap = 2700 * eOutExpo(seg(t, 12.03, 12.75));
  const img = getFreeze3();
  const [nx, ny] = SL.n, [dx, dy] = SL.d, cx = W / 2, cy = H / 2;
  for (const side of [-1, 1]) {
    const o = side * gap / 2;
    ctx.save();
    ctx.beginPath();
    const e0 = [cx + nx * o, cy + ny * o], far = side * 3000;
    ctx.moveTo(e0[0] - dx * 3000, e0[1] - dy * 3000); ctx.lineTo(e0[0] + dx * 3000, e0[1] + dy * 3000);
    ctx.lineTo(e0[0] + dx * 3000 + nx * far, e0[1] + dy * 3000 + ny * far); ctx.lineTo(e0[0] - dx * 3000 + nx * far, e0[1] - dy * 3000 + ny * far);
    ctx.closePath(); ctx.clip();
    ctx.translate(nx * o, ny * o);
    ctx.drawImage(img, 0, 0);
    ctx.fillStyle = `rgba(0,0,0,${0.55 * seg(t, 12.0, 12.6)})`; ctx.fillRect(-200, -200, W + 400, H + 400);
    ctx.restore();
    // светящиеся кромки разреза
    const ea = 1 - seg(t, 12.1, 12.7);
    if (ea > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255,60,70,${ea})`; ctx.shadowColor = 'rgba(255,20,40,1)'; ctx.shadowBlur = 30; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(e0[0] - dx * 3000, e0[1] - dy * 3000); ctx.lineTo(e0[0] + dx * 3000, e0[1] + dy * 3000); ctx.stroke();
      ctx.restore();
    }
  }
  // сам взмах — белая черта через весь кадр
  const lk = seg(t, 12.0, 12.07), la = 1 - seg(t, 12.08, 12.35);
  if (la > 0) {
    const L = 2400 * eOutCubic(lk);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - dx * 1200, cy - dy * 1200); ctx.lineTo(cx - dx * 1200 + dx * L, cy - dy * 1200 + dy * L);
    ctx.strokeStyle = `rgba(255,40,55,${la})`; ctx.shadowColor = 'rgba(255,20,40,1)'; ctx.shadowBlur = 50; ctx.lineWidth = 26; ctx.stroke();
    ctx.shadowBlur = 0; ctx.strokeStyle = `rgba(255,250,250,${la})`; ctx.lineWidth = 6; ctx.stroke();
    ctx.restore();
  }
}

// ---------- кадр ----------
let vignette = null;
function drawVignette() {
  if (!vignette) {
    vignette = document.createElement('canvas'); vignette.width = W; vignette.height = H;
    const v = vignette.getContext('2d');
    const g = v.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.85)');
    v.fillStyle = g; v.fillRect(0, 0, W, H);
  }
  ctx.drawImage(vignette, 0, 0);
}
function drawFrame(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over';
  shakeX = shakeY = 0;
  ctx.fillStyle = '#060405'; ctx.fillRect(0, 0, W, H);
  const c = t - CH_OFF;
  if (t < 4) scene1(t);
  else if (t < 20) story(t);
  else if (c < 8) scene2(c);
  else if (c < 12) scene3(c);
  else { scene45(c); if (c < 12.75) slashCut(c); }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  drawVignette();
  // единичные экспозиционные подъёмы на главных ударах (не строб)
  let lift = 0;
  for (const [t0, a] of [[4.0, 0.08], [17.0, 0.16], [20.0, 0.16], [26.0, 0.2], [28.0, 0.22], [34.0, 0.16]]) lift += a * decay(t, t0, 7);
  if (lift > 0.004) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,70,80,${lift})`; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
  const fadeIn = 1 - smooth(seg(t, 0, 0.45));
  if (fadeIn > 0) { ctx.fillStyle = `rgba(0,0,0,${fadeIn})`; ctx.fillRect(0, 0, W, H); }
}

const grain = [0, 1, 2].map(i => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), im = g.createImageData(256, 256), r = rand(99 + i);
  for (let j = 0; j < im.data.length; j += 4) { const v = r() * 255; im.data[j] = im.data[j + 1] = im.data[j + 2] = v; im.data[j + 3] = 255; }
  g.putImageData(im, 0, 0); return c;
});
function postGrain(fi) {
  const r = rand(fi * 7 + 1), ox = Math.floor(r() * 256), oy = Math.floor(r() * 256);
  dctx.save(); dctx.globalCompositeOperation = 'overlay'; dctx.globalAlpha = 0.09;
  dctx.translate(-ox, -oy); dctx.fillStyle = dctx.createPattern(grain[fi % 3], 'repeat'); dctx.fillRect(0, 0, W + 256, H + 256);
  dctx.restore();
}

// моушн-блюр: усреднение sub подкадров в пределах выдержки 180°
function renderAt(t, sub = 1) {
  const fi = Math.round(t * FPS);
  dctx.setTransform(1, 0, 0, 1, 0, 0);
  if (sub <= 1) { drawFrame(clamp(t, 0, DUR - 1e-4)); dctx.globalAlpha = 1; dctx.drawImage(buf, 0, 0); }
  else {
    const shutter = 0.5 / FPS;
    for (let k = 0; k < sub; k++) {
      drawFrame(clamp(t + ((k + 0.5) / sub - 0.5) * shutter, 0, DUR - 1e-4));
      dctx.globalAlpha = 1 / (k + 1); dctx.drawImage(buf, 0, 0);
    }
    dctx.globalAlpha = 1;
  }
  postGrain(fi);
}

// ---------- загрузка ----------
async function loadAll() {
  await Promise.all([
    document.fonts.load('700 100px "Oswald"', 'MEMENTO РОЗЫГРЫШИ'),
    document.fonts.load('800 50px "Inter Tight"', 'РАЗНЫЙ Memento'),
    document.fonts.load('600 50px "Inter Tight"', 'ПОМНИ ВЛАДЕЛЕЦ'),
    document.fonts.load('500 50px "Inter Tight"', 'Помни канал'),
    document.fonts.load('700 50px "Inter Tight"', 'Memento Mori'),
    document.fonts.load('50px "Noto Color Emoji"', '🔥🎁'),
  ]);
  if (RENDER) {
    vidFrames = await Promise.all(Array.from({ length: VID_N }, (_, i) => new Promise((res, rej) => {
      const im = new Image(); im.onload = () => res(im); im.onerror = rej;
      im.src = `assets/frames/f${String(i + 1).padStart(3, '0')}.jpg`;
    })));
  }
}

window.renderFrame = (i, sub = 5) => renderAt(i / FPS, sub);
window.ready = loadAll().then(() => { renderAt(0); return true; });

if (!RENDER) {
  const music = document.getElementById('music');
  const pp = document.getElementById('pp'), scrub = document.getElementById('scrub'), tc = document.getElementById('tc');
  const start = document.getElementById('start');
  let playing = false;
  const syncVideo = () => { try { vidEl.currentTime = music.currentTime % VID_DUR; } catch (e) { /* видео ещё грузится */ } };
  const play = () => {
    if (music.currentTime >= DUR - 0.05) music.currentTime = 0;
    syncVideo(); music.play(); vidEl.play().catch(() => {}); playing = true; pp.textContent = '❚❚'; start.style.display = 'none';
  };
  const pause = () => { music.pause(); vidEl.pause(); playing = false; pp.textContent = '▶'; };
  start.addEventListener('click', play);
  pp.addEventListener('click', () => (playing ? pause() : play()));
  scrub.addEventListener('input', () => { music.currentTime = +scrub.value; syncVideo(); });
  addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); } });
  music.addEventListener('ended', pause);
  const loop = () => {
    const t = Math.min(music.currentTime, DUR - 1e-3);
    renderAt(t, 1);
    if (playing) { scrub.value = t; }
    tc.textContent = t.toFixed(2);
    requestAnimationFrame(loop);
  };
  window.ready.then(() => requestAnimationFrame(loop));
}
