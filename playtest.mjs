// Live play-test for Nusantara Skies (headless Playwright Chromium).
// Serves game/ on :8080 first (run `node serve.ts` in the repo root).
// Loads the game, starts it, and proves keyboard + mouse input change the
// flight state, pause/restart work, and zero console errors occur.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(String(err)));

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail ?? '' });
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  (' + detail + ')' : ''));
}

await page.goto('http://localhost:8080/', { waitUntil: 'load' });
await page.waitForTimeout(800);
const title = await page.title();
check('page title', title.includes('Nusantara Skies'), title);
check('title screen shown', await page.evaluate(() => window.__game.screen === 'title'));

await page.keyboard.press('Enter');
await page.waitForTimeout(500);
check('Enter starts the flight', await page.evaluate(() => window.__game.screen === 'flying'));

const before = await page.evaluate(() => ({
  z: window.__game.z, speed: window.__game.speed, heading: window.__game.heading,
  throttle: window.__game.throttle,
}));

// W raises the throttle; ArrowLeft banks and turns the plane.
await page.keyboard.down('KeyW');
await page.keyboard.down('ArrowLeft');
await page.waitForTimeout(1500);
await page.keyboard.up('ArrowLeft');
await page.keyboard.up('KeyW');
const afterKeys = await page.evaluate(() => ({
  z: window.__game.z, speed: window.__game.speed, heading: window.__game.heading,
  throttle: window.__game.throttle, bank: window.__game.bank,
}));
check('plane moves forward', afterKeys.z > before.z + 50, 'z ' + before.z.toFixed(0) + ' -> ' + afterKeys.z.toFixed(0));
check('W raises throttle', afterKeys.throttle > before.throttle, 'thr ' + before.throttle + ' -> ' + afterKeys.throttle.toFixed(2));
check('ArrowLeft turns the plane', Math.abs(afterKeys.heading - before.heading) > 2, 'hdg ' + before.heading.toFixed(1) + ' -> ' + afterKeys.heading.toFixed(1));
check('speed responds', afterKeys.speed > before.speed, before.speed.toFixed(0) + ' -> ' + afterKeys.speed.toFixed(0) + ' km/h');

// Mouse: hold the left button and drag left; the plane must bank/turn.
const beforeMouse = await page.evaluate(() => window.__game.heading);
await page.mouse.move(640, 360);
await page.mouse.down();
await page.mouse.move(440, 380, { steps: 12 });
await page.waitForTimeout(900);
await page.mouse.up();
const afterMouse = await page.evaluate(() => ({ heading: window.__game.heading, bank: window.__game.bank }));
check('mouse drag steers', Math.abs(afterMouse.heading - beforeMouse) > 1 || Math.abs(afterMouse.bank) > 3,
  'hdg ' + beforeMouse.toFixed(1) + ' -> ' + afterMouse.heading.toFixed(1) + ', bank ' + afterMouse.bank.toFixed(1));

// Pause freezes the world; R restarts the run.
await page.keyboard.press('KeyP');
await page.waitForTimeout(200);
check('P pauses', await page.evaluate(() => window.__game.screen === 'paused'));
const pausedZ = await page.evaluate(() => window.__game.z);
await page.waitForTimeout(600);
check('paused world is frozen', await page.evaluate(() => window.__game.z) === pausedZ);
await page.keyboard.press('KeyP');
await page.waitForTimeout(200);
check('P resumes', await page.evaluate(() => window.__game.screen === 'flying'));
await page.keyboard.press('KeyR');
await page.waitForTimeout(300);
check('R restarts the run', await page.evaluate(() => window.__game.screen === 'flying' && window.__game.score === 0 && window.__game.fuel > 99));

check('zero console errors', errors.length === 0, errors.join(' | '));

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(failed === 0 ? 'ALL PLAY-TESTS PASSED' : failed + ' PLAY-TEST(S) FAILED');
process.exit(failed === 0 ? 0 : 1);
