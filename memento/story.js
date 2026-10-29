'use strict';
/* История KAPUSTKA (4–20 с) — четыре главы на той же красной линии.
   I  4.0–8.0   «Начинал с нуля»: линия падает в «плоский» пульс, на неё падает монета «0»
   II 8.0–12.5  «Тусил в Москва-Сити»: монета → луна, камера поднимается вдоль башен, линия растёт
   III 12.5–17  «Сейчас — военный»: огни гаснут, на цепочке опускается жетон, ровный пульс
   IV 17.0–20   «Но никогда не унываю»: цветовая волна, линия бьётся радостно, текст «танцует»
   Использует общие помощники из motion.js (камера, текст, частицы). */

function eOutBounce(x) {
  const n1 = 7.5625, d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
}
const ecgShape = u => -16 * gauss(u + 110, 22) + 24 * gauss(u + 26, 7) - 300 * gauss(u, 9) + 90 * gauss(u - 24, 8) - 38 * gauss(u - 110, 30);

// пульс-линия с «головой»: head(t) — x головы, beats — [[t, amp]]
function pulseLine(t, o) {
  const hx = o.head(t), x0 = hx - 3000;
  ctx.save(); plane(0);
  ctx.beginPath();
  for (let x = x0; x < hx; x += 3) {
    let y = o.y;
    for (const [tb, amp] of o.beats) { const u = x - o.head(tb); if (u > -220 && u < 220) y += amp * ecgShape(u); }
    if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  let hy = o.y;
  for (const [tb, amp] of o.beats) { const u = hx - o.head(tb); if (u > -220 && u < 220) hy += amp * ecgShape(u); }
  ctx.lineTo(hx, hy);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const g = ctx.createLinearGradient(x0, 0, hx, 0);
  g.addColorStop(0, 'rgba(255,35,48,0)'); g.addColorStop(0.6, `rgba(255,35,48,${0.6 * o.a})`); g.addColorStop(1, `rgba(255,35,48,${o.a})`);
  ctx.strokeStyle = g; ctx.shadowColor = 'rgba(255,20,40,0.95)'; ctx.shadowBlur = 24; ctx.lineWidth = o.w || 6; ctx.stroke();
  ctx.shadowBlur = 0; ctx.strokeStyle = `rgba(255,230,230,${0.8 * o.a})`; ctx.lineWidth = 1.6; ctx.stroke();
  let beat = 0; for (const [tb] of o.beats) beat += decay(t, tb, 6);
  const R = 60 + 50 * beat;
  const rg = ctx.createRadialGradient(hx, hy, 0, hx, hy, R);
  rg.addColorStop(0, `rgba(255,255,255,${o.a})`); rg.addColorStop(0.12, `rgba(255,90,90,${0.9 * o.a})`); rg.addColorStop(1, 'rgba(255,0,20,0)');
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(hx, hy, R, 0, 7); ctx.fill();
  ctx.restore();
}
function chapterLabel(txt, x, y, t0, t, col = '#ff3b4a') {
  const L = lay(txt, 700, 28, 'Inter Tight', 12);
  const k = eOutCubic(seg(t, t0, t0 + 0.4));
  if (k <= 0) return;
  ctx.save(); ctx.beginPath(); ctx.rect(x - 10, y - 30, (L.total + 80) * k, 60); ctx.clip();
  ctx.fillStyle = col; ctx.fillRect(x, y - 2, 44, 4);
  letters(L, x + 64 + L.total / 2, y, c => { ctx.fillStyle = col; ctx.fillText(c, 0, 0); });
  ctx.restore();
}

/* ---------------- I. НАЧИНАЛ С НУЛЯ ---------------- */
const COIN_R = 95, COIN_X = 560, LINE_Y1 = 330;
const rainDrops = (() => {
  const r = rand(501);
  return Array.from({ length: 160 }, () => ({ x: r() * 2400 - 200, y: r(), sp: 1500 + r() * 900, len: 40 + r() * 80, a: 0.05 + r() * 0.12, near: r() < 0.14 }));
})();
const dustI = mkDust(61, 70, 2400, 1400, 300, 3400);
function drawRain(t, gain, near) {
  ctx.save(); ctx.lineCap = 'round';
  for (const d of rainDrops) {
    if (d.near !== near) continue;
    const y = ((d.y * (H + 300) + t * d.sp * (near ? 1.4 : 1)) % (H + 300)) - 150, x = d.x - y * 0.18;
    ctx.strokeStyle = `rgba(170,185,210,${d.a * gain * (near ? 1.8 : 1)})`; ctx.lineWidth = near ? 3.5 : 1.4;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d.len * 0.18, y - d.len * (near ? 1.6 : 1)); ctx.stroke();
  }
  ctx.restore();
}
function camI(t) {
  const u = t - 4;
  cam.x = 20 + 30 * Math.sin(u * 0.5); cam.y = 20 + 6 * Math.sin(u * 0.8);
  cam.z = -1000 + 90 * eInOut(seg(u, 0, 3.3)) + 300 * eInCubic(seg(t, 7.4, 8.0));
  cam.roll = lerp(1.5, -1, eInOut(seg(u, 0, 3.4))) * DEG;
}
function coinState(t) {
  const rest = LINE_Y1 - COIN_R;
  const S = { x: COIN_X, y: rest, z: 0, rx: COIN_R, ry: COIN_R, ex: 0, ey: 0, glow: 0 };
  if (t < 5.35) {
    const phi = t * 16;
    if (t < 5.0) { const k = seg(t, 4.3, 5.0); S.y = lerp(-1300, rest, k * k); }
    else S.y = rest - 120 * Math.sin(Math.PI * seg(t, 5.0, 5.35));
    S.rx = COIN_R * Math.abs(Math.cos(phi)); S.ex = 16 * Math.sin(phi);
  } else if (t < 7.35) {
    const u = t - 5.35, phi = 5.35 * 16 + 16 * (1 - Math.exp(-1.2 * u)) / 1.2;
    const tilt = eInCubic(seg(t, 6.2, 6.85));
    const wob = (1 - tilt) * 0.06 * Math.sin(u * 30) * seg(t, 5.8, 6.2);
    S.rx = lerp(COIN_R * Math.abs(Math.cos(phi)), COIN_R, tilt); S.ry = lerp(COIN_R, COIN_R * 0.2, tilt);
    S.y = rest + tilt * COIN_R * 0.8 + wob * 40; S.ex = (1 - tilt) * 16 * Math.sin(phi); S.ey = tilt * 12;
  } else { // бросок к камере
    const k = seg(t, 7.35, 8.0), e = eInCubic(k);
    const th = 1.37 + (4 * Math.PI - 1.37) * eOutCubic(k);
    const camZ8 = -1000 + 90 + 300;
    S.z = lerp(0, camZ8 + 150, e);
    S.x = lerp(COIN_X, cam.x, e); S.y = lerp(rest + COIN_R * 0.8, cam.y, eOutCubic(k)) - 260 * Math.sin(Math.PI * k);
    S.rx = COIN_R; S.ry = COIN_R * Math.max(0.04, Math.abs(Math.cos(th))); S.ey = 12 * Math.sin(th);
    S.glow = Math.pow(k, 3);
  }
  return S;
}
function drawCoin(S) {
  const pr = P(S.x, S.y, S.z); if (!pr) return;
  const s = pr.s, rx = Math.max(1, S.rx * s), ry = Math.max(1, S.ry * s), ex = S.ex * s, ey = S.ey * s;
  ctx.save(); ctx.translate(pr.x, pr.y);
  // ребро
  ctx.fillStyle = '#4a4b52';
  ctx.beginPath(); ctx.ellipse(ex, ey, rx, ry, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-rx * 0 + 0, -ry); ctx.lineTo(ex, ey - ry); ctx.lineTo(ex, ey + ry); ctx.lineTo(0, ry); ctx.closePath();
  if (Math.abs(ey) > Math.abs(ex)) { ctx.beginPath(); ctx.moveTo(-rx, 0); ctx.lineTo(-rx + ex, ey); ctx.lineTo(rx + ex, ey); ctx.lineTo(rx, 0); ctx.closePath(); }
  ctx.fill();
  // лицевая сторона
  const g = ctx.createRadialGradient(-rx * 0.35, -ry * 0.4, 0, 0, 0, Math.max(rx, ry) * 1.1);
  g.addColorStop(0, '#f2f2f5'); g.addColorStop(0.5, '#a9abb3'); g.addColorStop(1, '#6b6d76');
  ctx.shadowColor = 'rgba(255,40,50,0.6)'; ctx.shadowBlur = 20;
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 7); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(60,60,68,0.6)'; ctx.lineWidth = Math.max(1, 5 * s);
  ctx.beginPath(); ctx.ellipse(0, 0, rx * 0.82, ry * 0.82, 0, 0, 7); ctx.stroke();
  if (rx > 6 && ry > 6) {
    ctx.save(); ctx.scale(rx / (COIN_R * s), ry / (COIN_R * s));
    ctx.font = `700 ${Math.round(120 * s)}px "Oswald"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillText('0', -2 * s, -2 * s);
    ctx.fillStyle = '#55575f'; ctx.fillText('0', 0, 0);
    ctx.restore();
  }
  if (S.glow > 0.01) {
    ctx.globalCompositeOperation = 'lighter';
    const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry) * 1.6);
    gg.addColorStop(0, `rgba(255,245,240,${S.glow})`); gg.addColorStop(0.6, `rgba(255,80,80,${0.6 * S.glow})`); gg.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, 0, Math.max(rx, ry) * 1.6, 0, 7); ctx.fill();
  }
  ctx.restore();
}
function chapterI(t) {
  camI(t);
  const u = t - 4;
  ctx.fillStyle = '#07080c'; ctx.fillRect(0, 0, W, H);
  bgGlow(W * 0.55, H * 0.8, 1000, 0.55, '35,45,70');
  drawRain(t, 1, false);
  beginWorld();
  drawDust(dustI, t, 1000, '150,170,205', 8, 0.7);
  // линия падает и становится почти плоской, со слабым пульсом
  {
    const drop = -760 * Math.exp(-u * 6) * Math.cos(u * 10);
    const scroll = u * 260;
    ctx.save(); plane(0); ctx.beginPath();
    for (let x = -2800; x <= 2800; x += 4) {
      const m = ((x + scroll) % 900 + 900) % 900 - 450;
      const y = LINE_Y1 + drop + 0.1 * ecgShape(m);
      if (x === -2800) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(255,40,52,0.8)'; ctx.shadowColor = 'rgba(255,20,40,0.8)'; ctx.shadowBlur = 16; ctx.lineWidth = 4; ctx.stroke();
    // искра контакта монеты
    const c = decay(t, 5.0, 6) + 0.5 * decay(t, 5.35, 8) + 0.6 * decay(t, 6.88, 7);
    if (c > 0.02) {
      const rg = ctx.createRadialGradient(COIN_X, LINE_Y1, 0, COIN_X, LINE_Y1, 160);
      rg.addColorStop(0, `rgba(255,220,210,${c})`); rg.addColorStop(1, 'rgba(255,30,40,0)');
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rg; ctx.fillRect(COIN_X - 160, LINE_Y1 - 160, 320, 320);
    }
    ctx.restore();
  }
  // текст
  const out = smooth(seg(t, 7.25, 7.7));
  ctx.save(); plane(0); ctx.globalAlpha = 1 - out; ctx.translate(0, -70 * out);
  const X0 = -790;
  chapterLabel('ГЛАВА I', X0, -340, 4.45, t);
  const words = [['НАЧИНАЛ', -205, '#eceef3'], ['С НУЛЯ', -40, null]];
  let li = 0;
  for (const [w, y, col] of words) {
    const L = lay(w, 700, 170, 'Oswald', 6);
    letters(L, X0 + L.total / 2, y, (c, i) => {
      const k = seg(t - 4.65 - li * 0.25 - i * 0.04, 0, 0.6);
      if (k <= 0) return;
      ctx.translate(0, -520 * (1 - eOutBounce(k)));
      ctx.globalAlpha *= clamp(k * 6);
      if (col) { ctx.fillStyle = col; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 20; ctx.fillText(c, 0, 0); }
      else hotLetter(c, 170, 0, 30);
    });
    li++;
  }
  const L3 = lay('в кармане — пусто, в голове — планы', 500, 40, 'Inter Tight', 2);
  letters(L3, X0 + L3.total / 2, 85, (c, i) => {
    const a = smooth(seg(t - 5.75 - i * 0.012, 0, 0.35)); if (a <= 0) return;
    ctx.globalAlpha *= a; ctx.translate(0, (1 - a) * 14); ctx.fillStyle = '#b4bccb'; ctx.fillText(c, 0, 0);
  });
  ctx.restore();
  drawCoin(coinState(t));
  ctx.restore();
  drawRain(t, 1, true);
}

/* ---------------- II. МОСКВА-СИТИ ---------------- */
const towers = (() => {
  const T = [
    { x: -1700, z: 3400, w: 420, top: -2600 }, { x: 950, z: 3700, w: 380, top: -2350 }, { x: 2500, z: 3000, w: 360, top: -1950 },
    { x: -500, z: 4300, w: 520, top: -3100, twist: true }, { x: -1150, z: 1650, w: 340, top: -2950 }, { x: 1350, z: 1850, w: 360, top: -3350, twist: true },
    { x: 260, z: 2500, w: 300, top: -2250 }, { x: -820, z: 520, w: 260, top: -2500 }, { x: 820, z: 760, w: 300, top: -2050 },
  ];
  const r = rand(77);
  for (let i = 0; i < 16; i++) T.push({ x: (r() - 0.5) * 9000, z: 5500 + r() * 2500, w: 300 + r() * 500, top: -300 - r() * 1600, far: true });
  T.forEach((tw, i) => { tw.id = i; });
  return T.sort((a, b) => b.z - a.z);
})();
const GROUND = 900;
const hash = (a, b, c) => { const v = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453; return v - Math.floor(v); };
const dustII = mkDust(71, 90, 4000, 2600, 400, 6000, 2, 6);
function camII(t) {
  const k = seg(t, 8.0, 12.3);
  cam.y = lerp(350, -2350, eInOut(k)); cam.z = lerp(-1100, -800, k);
  cam.x = lerp(-150, 150, k); cam.roll = lerp(-2.5, 2.5, eInOut(k)) * DEG;
}
function drawTower(tw, t, blackout) {
  const d = tw.w * 0.8, xl = tw.x - tw.w / 2, xr = tw.x + tw.w / 2;
  const a = P(xl, tw.top, tw.z), b = P(xr, GROUND, tw.z);
  if (!a || !b) return;
  const fog = clamp((tw.z - cam.z - 2500) / 6000) * 0.7;
  // боковая грань — настоящая перспектива
  const xs = tw.x > cam.x ? xl : xr;
  const sq = [P(xs, tw.top, tw.z), P(xs, tw.top, tw.z + d), P(xs, GROUND, tw.z + d), P(xs, GROUND, tw.z)];
  if (sq.every(Boolean)) {
    ctx.beginPath(); sq.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath();
    ctx.fillStyle = tw.x > cam.x ? '#0a0b12' : '#141625'; ctx.fill();
  }
  if (cam.y < tw.top) { // крыша видна сверху
    const rq = [P(xl, tw.top, tw.z), P(xr, tw.top, tw.z), P(xr, tw.top, tw.z + d), P(xl, tw.top, tw.z + d)];
    if (rq.every(Boolean)) { ctx.beginPath(); rq.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.fillStyle = '#1c1e2c'; ctx.fill(); }
  }
  // фасад
  const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
  g.addColorStop(0, '#1b2030'); g.addColorStop(0.5, '#10131d'); g.addColorStop(1, '#0a0b12');
  ctx.fillStyle = g; ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
  ctx.save(); ctx.beginPath(); ctx.rect(a.x, a.y, b.x - a.x, b.y - a.y); ctx.clip();
  if (tw.twist) { // закрученная башня: диагональные ленты
    ctx.strokeStyle = 'rgba(160,180,230,0.12)'; ctx.lineWidth = Math.max(1, 6 * a.s);
    for (let y = tw.top; y < GROUND + 600; y += 160) {
      const p1 = P(xl, y, tw.z), p2 = P(xr, y - 140, tw.z);
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    }
  }
  // окна (только видимые ряды)
  ctx.save(); plane(tw.z);
  const s = a.s, yMin = cam.y + (-H / 2 - 60) / s, yMax = cam.y + (H / 2 + 60) / s;
  const cols = Math.floor((tw.w - 30) / 34);
  for (let y = tw.top + 40; y < GROUND - 20; y += 46) {
    if (y < yMin || y > yMax) continue;
    const row = Math.round((y - tw.top) / 46), rowN = (y - tw.top) / (GROUND - tw.top);
    if (rowN < blackout * 1.15) continue;
    for (let j = 0; j < cols; j++) {
      const h = hash(row, j, tw.id);
      if (h > 0.42) continue;
      const al = (0.35 + 0.55 * ((h * 7) % 1)) * (1 - fog);
      ctx.fillStyle = h < 0.26 ? `rgba(255,200,140,${al})` : `rgba(175,205,255,${al})`;
      ctx.fillRect(xl + 18 + j * 34, y, 18, 26);
    }
  }
  ctx.restore();
  // отблеск стекла, бегущий вместе с камерой
  const ry = (tw.top + GROUND) / 2 - cam.y * 0.6;
  const rp = P(tw.x, ry, tw.z);
  if (rp) {
    const rg = ctx.createLinearGradient(0, rp.y - 300 * rp.s, 0, rp.y + 300 * rp.s);
    rg.addColorStop(0, 'rgba(255,255,255,0)'); rg.addColorStop(0.5, 'rgba(255,190,200,0.07)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg; ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
  }
  ctx.restore();
  // красная кромка-контровой свет
  ctx.fillStyle = `rgba(255,40,60,${0.35 * (1 - fog)})`;
  ctx.fillRect(tw.x > cam.x ? b.x - 2 : a.x, a.y, 2, b.y - a.y);
  if (fog > 0) { ctx.fillStyle = `rgba(30,10,20,${fog})`; ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y); }
  // авиа-огонь
  if (!tw.far && blackout < 0.05 && Math.floor(t * 1.4 + tw.id * 0.37) % 2 === 0) {
    const l = P(tw.x, tw.top - 20, tw.z);
    const rg = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, 26 * l.s + 4);
    rg.addColorStop(0, 'rgba(255,60,60,1)'); rg.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(l.x, l.y, 26 * l.s + 4, 0, 7); ctx.fill();
  }
}
function chapterII(t) {
  camII(t);
  const blackout = seg(t, 12.0, 12.42);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#0a0610'); sky.addColorStop(0.7, '#240a14'); sky.addColorStop(1, '#3d0d14');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  // луна: из монеты в небо (match cut по светлому кругу)
  {
    const k = eOutExpo(seg(t, 8.0, 8.7));
    const mx = lerp(W / 2, W * 0.76, k), my = lerp(H / 2, H * 0.2, k), mr = lerp(720, 70, k);
    const a = 1 - blackout * 0.6;
    const rg = ctx.createRadialGradient(mx, my, mr * 0.9, mx, my, mr * 3);
    rg.addColorStop(0, `rgba(255,120,120,${0.25 * a})`); rg.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = `rgba(255,236,230,${a})`; ctx.beginPath(); ctx.arc(mx, my, mr, 0, 7); ctx.fill();
  }
  beginWorld();
  drawDust(dustII, t, 2500, '255,170,120', 4, 0.8 * (1 - blackout));
  for (const tw of towers) drawTower(tw, t, blackout);
  // растущая линия-график
  {
    const headY = Math.max(cam.y - 160, -3600), y0 = GROUND;
    const k = seg(t, 8.25, 8.6);
    if (k > 0 && headY < y0) {
      const xf2 = y => 600 + 70 * Math.sin(y * 0.004) + 45 * Math.sin(y * 0.013) + 25 * Math.sign(Math.sin(y * 0.03));
      ctx.save(); plane(150); ctx.beginPath();
      for (let y = y0; y > headY; y -= 12) { const x = xf2(y); if (y === y0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.lineTo(xf2(headY), headY);
      ctx.globalAlpha = k * (1 - blackout);
      ctx.strokeStyle = '#ff2433'; ctx.shadowColor = 'rgba(255,20,40,1)'; ctx.shadowBlur = 26; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,235,235,0.9)'; ctx.lineWidth = 1.8; ctx.stroke();
      const hx = xf2(headY), rg = ctx.createRadialGradient(hx, headY, 0, hx, headY, 80);
      rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.15, 'rgba(255,90,90,0.9)'); rg.addColorStop(1, 'rgba(255,0,20,0)');
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(hx, headY, 80, 0, 7); ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
  // затемнение под текстом и сам текст (экранное пространство)
  const lg = ctx.createLinearGradient(0, 0, W * 0.62, 0);
  lg.addColorStop(0, 'rgba(0,0,0,0.65)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
  const ta = 1 - smooth(seg(t, 11.95, 12.35));
  ctx.save(); ctx.globalAlpha = ta;
  const drift = 1 + 0.03 * seg(t, 8.5, 12.4);
  ctx.translate(140, 0); ctx.scale(drift, drift);
  chapterLabel('ГЛАВА II', 0, 330, 8.45, t);
  const L1 = lay('ТУСИЛ В', 700, 150, 'Oswald', 6);
  letters(L1, L1.total / 2, 455, (c, i) => {
    const k = t - 8.65 - i * 0.035; if (k <= 0) return;
    const sp = spring(k, 2.2, 7); ctx.translate(0, (1 - sp) * 60); ctx.globalAlpha *= clamp(k / 0.1);
    ctx.fillStyle = '#f4f1f5'; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 20; ctx.fillText(c, 0, 0);
  });
  const L2 = lay('МОСКВА-СИТИ', 700, 160, 'Oswald', 6);
  const ign = t - 8.95;
  if (ign > 0) {
    const fl = ign < 0.32 ? [0.25, 0.9, 0.35, 1, 0.6, 1, 0.85][Math.floor(ign * 22) % 7] : 1; // неоновый поджиг
    letters(L2, L2.total / 2, 610, c => { ctx.globalAlpha *= fl; hotLetter(c, 160, 0.15 * fl, 46); });
  }
  const L3 = lay('ночи, огни, небоскрёбы', 500, 40, 'Inter Tight', 3);
  letters(L3, L3.total / 2, 745, (c, i) => {
    const a = smooth(seg(t - 9.6 - i * 0.015, 0, 0.35)); if (a <= 0) return;
    ctx.globalAlpha *= a; ctx.translate(0, (1 - a) * 14); ctx.fillStyle = 'rgba(255,225,215,0.85)'; ctx.fillText(c, 0, 0);
  });
  ctx.restore();
  // вспышка от монеты на входе
  const f = 1 - smooth(seg(t, 8.0, 8.45));
  if (f > 0) { ctx.fillStyle = `rgba(255,240,236,${0.85 * f})`; ctx.fillRect(0, 0, W, H); }
  if (blackout > 0) { ctx.fillStyle = `rgba(0,0,0,${0.85 * smooth(blackout)})`; ctx.fillRect(0, 0, W, H); }
}

/* ---------------- III. СЕЙЧАС — ВОЕННЫЙ ---------------- */
let camoC = null;
function camo() {
  if (camoC) return camoC;
  camoC = document.createElement('canvas'); camoC.width = 480; camoC.height = 270;
  const g = camoC.getContext('2d'), r = rand(909);
  g.fillStyle = '#1b1f15'; g.fillRect(0, 0, 480, 270);
  for (const col of ['#272d1d', '#11140b', '#333827', '#1f1a12']) {
    g.fillStyle = col;
    for (let i = 0; i < 26; i++) {
      const x = r() * 520 - 20, y = r() * 310 - 20;
      g.beginPath();
      for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2, rr2 = (22 + r() * 28) * (0.6 + 0.4 * Math.sin(a * 3 + i)); g.lineTo(x + Math.cos(a) * rr2 * 1.6, y + Math.sin(a) * rr2); }
      g.closePath(); g.fill();
    }
  }
  return camoC;
}
const dustIII = mkDust(81, 70, 2400, 1400, 300, 3400);
const TAG = { x: 470, L: 760, w: 200, h: 310 };
function camIII(t) {
  const k = seg(t, 12.5, 17.0);
  cam.x = lerp(-40, 20, k); cam.y = 6 * Math.sin(t * 0.9);
  cam.z = lerp(-1050, -930, eInOut(k)); cam.roll = lerp(-1.5, 1, k) * DEG;
}
function tagState(t) {
  const u = Math.max(0, t - 12.5);
  const pivotY = -900 - 1300 * (1 - spring(u, 1.3, 4.2));
  const ang = (12 * Math.exp(-u * 0.7) * Math.sin(2 * Math.PI * 0.55 * u) + 2 * Math.sin(u * 1.1)) * DEG;
  const yaw = (38 * Math.sin(2 * Math.PI * 0.22 * u + 0.6) * Math.exp(-u * 0.25) + 8 * Math.sin(u * 0.9)) * DEG;
  return { pivot: [TAG.x, pivotY], ang, yaw };
}
function drawTag(t) {
  const S = tagState(t);
  ctx.save(); plane(0);
  const hole = [S.pivot[0] + Math.sin(S.ang) * TAG.L, S.pivot[1] + Math.cos(S.ang) * TAG.L];
  // шариковая цепочка
  for (let k = 0; k <= TAG.L; k += 15) {
    const x = S.pivot[0] + Math.sin(S.ang) * k, y = S.pivot[1] + Math.cos(S.ang) * k;
    const g = ctx.createRadialGradient(x - 1.5, y - 1.5, 0, x, y, 5);
    g.addColorStop(0, '#f0f1f3'); g.addColorStop(1, '#5d6068');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 4.6, 0, 7); ctx.fill();
  }
  ctx.translate(hole[0], hole[1]); ctx.rotate(-S.ang);
  ctx.translate(0, TAG.h / 2 - 22);
  const cy = Math.cos(S.yaw), sy = Math.sin(S.yaw);
  ctx.transform(cy, sy * 0.16, 0, 1, 0, 0);
  const w = TAG.w, h = TAG.h, front = cy >= 0;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 40; ctx.shadowOffsetX = 20; ctx.shadowOffsetY = 26;
  rr(-w / 2, -h / 2, w, h, 46); ctx.fillStyle = '#6f727a'; ctx.fill(); ctx.restore();
  // металл: блик бежит по пластине при повороте
  const sx = -sy * w;
  const g = ctx.createLinearGradient(sx - w, -h / 2, sx + w, h / 2);
  g.addColorStop(0, '#7d8089'); g.addColorStop(0.42, '#c3c6cd'); g.addColorStop(0.5, '#f7f8fa'); g.addColorStop(0.58, '#b9bcc4'); g.addColorStop(1, '#6e717a');
  rr(-w / 2, -h / 2, w, h, 46); ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(40,42,48,0.7)'; ctx.lineWidth = 3; ctx.stroke();
  rr(-w / 2 + 14, -h / 2 + 14, w - 28, h - 28, 34); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.stroke();
  // отверстие
  ctx.fillStyle = '#121409'; ctx.beginPath(); ctx.arc(0, -h / 2 + 22, 11, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.stroke();
  if (front) { // выбитый текст
    const emboss = (txt, y, size, w8 = 700) => {
      ctx.font = `${w8} ${size}px "Oswald"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillText(txt, -1.2, y - 1.2);
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillText(txt, 1.4, y + 1.4);
      ctx.fillStyle = '#8e9199'; ctx.fillText(txt, 0, y);
    };
    emboss('KAPUSTKA', -40, 38); emboss('MEMENTO', 14, 30, 500); emboss('MORI', 50, 30, 500);
    ctx.fillStyle = 'rgba(200,20,35,0.85)'; ctx.fillRect(-46, 92, 92, 5);
  }
  ctx.restore();
}
function stencilWord(txt, X0, y, size, t0, t, red) {
  const L = lay(txt, 700, size, 'Oswald', 6);
  ctx.save();
  ctx.beginPath(); ctx.rect(X0 - 50, y - size, L.total + 100, size - 5); ctx.rect(X0 - 50, y + 4, L.total + 100, size); ctx.clip();
  letters(L, X0 + L.total / 2, y, (c, i) => {
    const k = t - t0 - i * 0.05; if (k <= 0) return;
    const sc = 1 + 0.6 * Math.exp(-k * 14); ctx.scale(sc, sc); ctx.globalAlpha *= clamp(k / 0.05);
    if (red) hotLetter(c, size, Math.exp(-k * 5) * 0.5, 30);
    else { ctx.fillStyle = '#e6e2cf'; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 18; ctx.fillText(c, 0, 0); }
  });
  ctx.restore();
}
function chapterIII(t) {
  camIII(t);
  shake(t, [[12.6, 6]]);
  ctx.fillStyle = '#0e110b'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha = 0.6; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(camo(), -160 - cam.x * 0.2, -90, W + 320, H + 180); ctx.restore();
  bgGlow(W * 0.6, H * 0.5, 1100, 0.35, '90,95,60');
  ctx.fillStyle = 'rgba(8,9,6,0.45)'; ctx.fillRect(0, 0, W, H);
  const fin = 1 - smooth(seg(t, 12.5, 12.8));
  beginWorld();
  drawDust(dustIII, t, 1000, '190,180,140', 10, 0.6);
  pulseLine(t, { head: x => -1300 + (x - 12.5) * 560, y: 360, a: 0.9, beats: [[13.5, 0.55], [14.5, 0.55], [15.5, 0.55], [16.5, 0.55]] });
  ctx.save(); plane(0);
  const X0 = -800;
  chapterLabel('ГЛАВА III', X0, -340, 12.95, t, '#ff4050');
  stencilWord('СЕЙЧАС', X0, -205, 150, 13.15, t, false);
  stencilWord('ВОЕННЫЙ', X0, -40, 175, 13.6, t, true);
  const L3 = lay('другая форма — тот же характер', 500, 40, 'Inter Tight', 2);
  letters(L3, X0 + L3.total / 2, 90, (c, i) => {
    const a = smooth(seg(t - 14.3 - i * 0.012, 0, 0.35)); if (a <= 0) return;
    ctx.globalAlpha *= a; ctx.translate(0, (1 - a) * 14); ctx.fillStyle = '#cfcab2'; ctx.fillText(c, 0, 0);
  });
  ctx.restore();
  drawTag(t);
  ctx.restore();
  if (fin > 0) { ctx.fillStyle = `rgba(0,0,0,${fin})`; ctx.fillRect(0, 0, W, H); }
}

/* ---------------- IV. НО НИКОГДА НЕ УНЫВАЮ ---------------- */
const dustIV = mkDust(91, 120, 2600, 1500, -400, 3400, 2, 5);
const IV_BEATS = [17.0, 17.5, 18.0, 18.5, 19.0, 19.5];
function camIV(t) {
  cam.x = 20 * Math.sin(t * 0.8); cam.y = -10;
  cam.z = -1000 + 60 * seg(t, 17, 19.4) + 720 * eInCubic(seg(t, 19.45, 20.0));
  cam.roll = (1.2 * Math.sin(t * 1.3) - 4 * eInCubic(seg(t, 19.45, 20))) * DEG;
}
function chapterIV(t) {
  camIV(t);
  shake(t, [[17.0, 14], [18.0, 4], [19.0, 4]]);
  ctx.fillStyle = '#0b0405'; ctx.fillRect(0, 0, W, H);
  bgGlow(W * 0.5, H * 0.5, 1150, 0.8 + 0.15 * decay(t, 17, 2), '170,0,22');
  // медленно вращающиеся лучи — энергия
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(W / 2, H * 0.55); ctx.rotate(t * 0.12);
  for (let i = 0; i < 14; i++) {
    ctx.rotate(Math.PI * 2 / 14);
    ctx.fillStyle = 'rgba(255,60,70,0.045)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-90, -1400); ctx.lineTo(90, -1400); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  beginWorld();
  drawDust(dustIV, t, 1000, '255,70,80', 170, 1);
  pulseLine(t, { head: x => -900 + (x - 17) * 700, y: 345, a: 1, w: 7, beats: IV_BEATS.map(b => [b, 1]) });
  ctx.save(); plane(0);
  const L1 = lay('НО НИКОГДА', 800, 96, 'Inter Tight', 26);
  letters(L1, 0, -215, (c, i) => {
    const k = t - 17.05 - i * 0.03; if (k <= 0) return;
    const sp = spring(k, 2.4, 7); ctx.scale(sp, sp); ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20; ctx.fillText(c, 0, 0);
  });
  const L2 = lay('НЕ УНЫВАЮ', 700, 270, 'Oswald', 8);
  letters(L2, 0, 10, (c, i) => {
    const k = t - 17.5 - i * 0.04; if (k <= 0) return;
    const sc = 1 + 1.5 * Math.exp(-k * 10);
    let hop = 0;
    for (const tb of [18.0, 18.5, 19.0]) { const q = (t - tb - i * 0.03) / 0.28; if (q > 0 && q < 1) hop += Math.sin(Math.PI * q); }
    ctx.translate(0, -50 * hop); ctx.rotate(0.06 * hop * (i % 2 ? 1 : -1));
    ctx.globalAlpha *= clamp(k / 0.08); ctx.scale(sc, sc * (1 + 0.08 * hop));
    hotLetter(c, 270, Math.exp(-k * 4) + 0.3 * hop, 44);
  });
  const L3 = lay('что бы ни случилось', 600, 46, 'Inter Tight', 6);
  letters(L3, 0, 200, (c, i) => {
    const a = smooth(seg(t - 18.2 - i * 0.015, 0, 0.3)); if (a <= 0) return;
    ctx.globalAlpha *= a; ctx.translate(0, (1 - a) * 16); ctx.fillStyle = '#ffe3e3'; ctx.fillText(c, 0, 0);
  });
  ctx.restore();
  ctx.restore();
}

function story(t) {
  if (t < 8) chapterI(t);
  else if (t < 12.5) chapterII(t);
  else if (t < 17) chapterIII(t);
  else if (t < 17.5) { // цветовая волна от центра: хаки → бренд
    chapterIII(t);
    const r = 2300 * eOutCubic(seg(t, 17.0, 17.5));
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, 7); ctx.clip();
    chapterIV(t);
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,70,80,0.9)'; ctx.shadowColor = 'rgba(255,20,40,1)'; ctx.shadowBlur = 40; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, 7); ctx.stroke(); ctx.restore();
  } else chapterIV(t);
}
