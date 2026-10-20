// Website footage: a smooth top-to-bottom tour with a label at each section, plus optional
// language switcher and phone-menu takes. Config: project.json "site" (references/recording.md).
//   clips/site-tour   (labels: "Hero" + one per stop)     clips/site-lang   clips/site-mobile
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { Recorder, clickMark } from './recorder.mjs';

const ROOT = process.env.WALK_PROJECT;
const P = JSON.parse(fs.readFileSync(path.join(ROOT, 'project.json'), 'utf8'));
const S = P.site; if (!S?.url) { console.log('project.json has no site.url'); process.exit(1); }
const OUT = path.join(ROOT, 'clips');
const chrome = P.chrome || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find((p) => fs.existsSync(p));
const args = S.host_map ? [`--host-resolver-rules=${S.host_map}`] : [];   // e.g. "MAP example.com 1.2.3.4" if local DNS blocks it
const browser = await chromium.launch({ executablePath: chrome, headless: true, args });

async function smoothScrollTo(page, y, ms) {
  await page.evaluate(async ([y, ms]) => {
    const y0 = scrollY, t0 = performance.now();
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    await new Promise((res) => { const step = (now) => { const t = Math.min(1, (now - t0) / ms); scrollTo(0, y0 + (y - y0) * ease(t)); t < 1 ? requestAnimationFrame(step) : res(); }; requestAnimationFrame(step); });
  }, [y, ms]);
}
const sectionY = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().top + scrollY - 70 : null; }, sel);

{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  await page.goto(S.url, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(2500);
  if (!S.stops?.length) {
    const ids = await page.evaluate(() => [...document.querySelectorAll('[id]')].map((e) => `#${e.id}`));
    console.log('No site.stops yet. Section ids on the page:', ids.join(' '));
  }
  const rec = new Recorder(page, `${OUT}/site-tour`); await rec.start();
  await page.waitForTimeout(3500); rec.mark('label', { text: 'Hero' });
  for (const [sel, label, hold = 3500] of S.stops || []) {
    const y = await sectionY(page, sel); if (y == null) { console.log('missing section', sel); continue; }
    rec.mark('scroll', { to: sel }); await smoothScrollTo(page, y, 1800);
    rec.mark('label', { text: label }); await page.waitForTimeout(hold);
  }
  await rec.stop();
  if (S.lang_switch?.length) {     // [[selector, label], ...]
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(800);
    const rl = new Recorder(page, `${OUT}/site-lang`); await rl.start(); await page.waitForTimeout(1500);
    for (const [sel, label] of S.lang_switch) await clickMark(rl, page, sel, label, { post: 2600 });
    await rl.stop();
  }
  await ctx.close();
}
if (S.mobile_menu) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(S.url, { waitUntil: 'networkidle', timeout: 120000 }); await page.waitForTimeout(2000);
  const rm = new Recorder(page, `${OUT}/site-mobile`, { width: 608, height: 1080 }); await rm.start();
  await page.waitForTimeout(1800);
  await clickMark(rm, page, S.mobile_menu, 'Menu', { post: 2500 }); await page.waitForTimeout(1500);
  await rm.stop(); await ctx.close();
}
await browser.close();
console.log('site footage ->', OUT);
