// Покадровый рендер: node tools/render.js <outDir> [from] [to] [workers] [sub]
// Требует запущенный статический сервер на :8765 из папки memento.
const { chromium } = require('playwright');
const fs = require('fs');
const [out = 'frames', from = '0', to = '1199', workers = '4', sub = '5'] = process.argv.slice(2);
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--disable-web-security', '--autoplay-policy=no-user-gesture-required'] });
  const a = +from, b = +to, nw = +workers;
  const t0 = Date.now();
  await Promise.all(Array.from({ length: nw }, async (_, w) => {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    page.on('pageerror', e => console.error('pageerror', e.message));
    page.on('console', m => { if (m.type() === 'error') console.error('console', m.text()); });
    await page.goto('http://127.0.0.1:8765/index.html?render');
    await page.evaluate(() => window.ready);
    const canvas = await page.$('#c');
    for (let i = a + w; i <= b; i += nw) {
      await page.evaluate(([i, s]) => window.renderFrame(i, s), [i, +sub]);
      await canvas.screenshot({ path: `${out}/f${String(i).padStart(5, '0')}.png` });
      if (w === 0 && ((i - a) / nw) % 30 === 0) console.log('frame', i, ((Date.now() - t0) / 1000).toFixed(1) + 's');
    }
    await page.close();
  }));
  await browser.close();
  console.log('done', ((Date.now() - t0) / 1000).toFixed(1) + 's');
})();
