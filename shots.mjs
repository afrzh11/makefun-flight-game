// Take the game's staged screenshots with headless Chromium (Playwright).
// Serves game/ on :8080 first (run `node serve.ts` in the repo root), then
// for each entry in shots.json opens ?shot=<name>&seed=1 at 1280x720, waits
// for window.__shotReady, and saves a JPEG into screenshots/.
import { chromium } from 'playwright';
import { readFileSync, statSync } from 'node:fs';

const shots = JSON.parse(readFileSync('/home/hatch/workspace/makefun-flight-game/shots.json', 'utf8'));
const browser = await chromium.launch({
  executablePath: '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(String(err)));
for (const shot of shots) {
  const url = `http://localhost:8080/${shot.query}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 30000 });
  await page.waitForTimeout(200);
  const out = `/home/hatch/workspace/makefun-flight-game/screenshots/${shot.name}`;
  await page.screenshot({ path: out, type: 'jpeg', quality: 82 });
  const size = statSync(out).size;
  console.log(shot.name, size, 'bytes', size > 262144 ? 'OVER 256KiB!' : 'ok');
}
console.log('console errors:', errors.length ? errors : 'none');
await browser.close();
console.log('done');
