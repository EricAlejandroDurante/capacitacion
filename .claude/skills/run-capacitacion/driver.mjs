// driver.mjs — render the capacitacion static landing in headless Chromium,
// screenshot it, dump console errors, and assert the key content is present.
//
// Usage:
//   node driver.mjs [url]
// Defaults to http://localhost:8000 (serve the page with
// `python3 -m http.server 8000` from the repo root first).
// A file:// URL also works: node driver.mjs "file://$PWD/index.html"
//
// Exit 0 = page rendered and assertions passed; exit 1 = something failed.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] || 'http://localhost:8000';
const outDir = process.env.SHOTS_DIR || '/tmp/shots';
mkdirSync(outDir, { recursive: true });
const outFile = `${outDir}/capacitacion.png`;

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const consoleErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push(String(e)));

// 'load' (not 'networkidle'): Google Fonts is an external request that may
// stall/fail offline — we don't want the page wait to hang on it.
await page.goto(url, { waitUntil: 'load', timeout: 30000 });
await page.waitForSelector('h1', { timeout: 10000 });

const title = await page.title();
const h1 = (await page.textContent('h1'))?.replace(/\s+/g, ' ').trim();
const lang = await page.getAttribute('html', 'lang');
const badge = await page.locator('.badge', { hasText: 'En preparación' }).count();

await page.screenshot({ path: outFile, fullPage: true });
await browser.close();

// Font-load failures are external (offline) noise, not page bugs — surface
// them but don't fail on them.
const fontNoise = (e) => /fonts\.g(oogleapis|static)\.com/.test(e) || /ERR_(NAME_NOT_RESOLVED|NETWORK|INTERNET)/.test(e);
const realErrors = consoleErrors.filter((e) => !fontNoise(e));

const checks = {
  titleHasCapacitacion: !!title && title.includes('Capacitación'),
  h1HasLideres: /líderes/i.test(h1 || ''),
  langIsEsCL: lang === 'es-CL',
  badgePresent: badge > 0,
  noRealConsoleErrors: realErrors.length === 0,
};
const pass = Object.values(checks).every(Boolean);

console.log(
  JSON.stringify(
    { url, title, h1, lang, badgePresent: badge > 0, consoleErrors, checks, screenshot: outFile, status: pass ? 'PASS' : 'FAIL' },
    null,
    2,
  ),
);
process.exit(pass ? 0 : 1);
