// Recording harness: launch the app on a clean demo profile, drive it with Playwright over CDP,
// and record each scene with the CDP screencast recorder (recorder.mjs).
// Configured by <project>/project.json "app" (see references/recording.md). Scenes import it as:
//   const H = await import(process.env.WALK_HARNESS);   // set by scripts/rec.sh
import { chromium } from 'playwright-core';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Recorder } from './recorder.mjs';

export const ROOT = process.env.WALK_PROJECT;
if (!ROOT || !fs.existsSync(path.join(ROOT, 'project.json'))) throw new Error('WALK_PROJECT must point at a project with project.json');
export const P = JSON.parse(fs.readFileSync(path.join(ROOT, 'project.json'), 'utf8'));
const A = P.app || {};
export const KIND = A.kind || 'web';
export const [WIN_W, WIN_H] = A.window || [1440, 810];
const CDP = A.cdp_port || 9433, INSPECT = A.inspect_port || 9434;
export const CLIPS = path.join(ROOT, 'clips');
export const QC = path.join(ROOT, 'build', 'qc');
fs.mkdirSync(QC, { recursive: true });
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Evaluate JS in an Electron app's main process (needs --inspect). `electron`, `BrowserWindow`, `app` are in scope.
export async function main(js) {
  if (KIND !== 'electron') throw new Error('main() is Electron-only');
  const list = await (await fetch(`http://127.0.0.1:${INSPECT}/json/list`)).json();
  const ws = new WebSocket(list[0].webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  const expr = `(async () => { const electron = require('electron'); const { BrowserWindow, app } = electron; ${js} })()`;
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, includeCommandLineAPI: true, awaitPromise: true, returnByValue: true } }));
  const res = await new Promise((r) => ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id === 1) r(d.result?.result?.value ?? d.result); }));
  ws.close(); return res;
}

const alive = async () => { try { await fetch(`http://127.0.0.1:${CDP}/json/version`); return true; } catch { return false; } };

// Start the app detached with a clean environment. fresh: wipe the profile first.
export async function launch({ fresh = false } = {}) {
  const profile = A.profile || '/tmp/walk-demo/profile';
  try { execFileSync('pkill', ['-f', profile]); } catch {}
  await sleep(1000);
  if (fresh) fs.rmSync(profile, { recursive: true, force: true });
  fs.mkdirSync(profile, { recursive: true });
  // Clean env: no shell secrets, no ELECTRON_RUN_AS_NODE (it makes Electron run as plain Node and exit).
  const env = { PATH: A.path_env || '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin', LANG: 'en_US.UTF-8',
    HOME: A.home || process.env.HOME, USER: process.env.USER, LOGNAME: process.env.USER, SHELL: '/bin/zsh', TMPDIR: process.env.TMPDIR || '/tmp', ...(A.env || {}) };
  const log = fs.openSync(path.join(path.dirname(profile), 'app.log'), 'a');
  if (KIND === 'electron') {
    const args = [`--user-data-dir=${profile}`, `--remote-debugging-port=${CDP}`, `--inspect=${INSPECT}`, ...(A.args || [])];
    if (A.path.endsWith('.app') && process.platform === 'darwin') {
      // `open -n` hands the process to launchd, so it survives this script exiting.
      execFileSync('/usr/bin/env', ['-i', ...Object.entries(env).map(([k, v]) => `${k}=${v}`), '/usr/bin/open', '-n', '-a', A.path,
        '--stdout', path.join(path.dirname(profile), 'app.log'), '--stderr', path.join(path.dirname(profile), 'app.log'), '--args', ...args]);
    } else {
      spawn(A.path, args, { env, detached: true, stdio: ['ignore', log, log] }).unref();
    }
  } else {
    const chrome = A.chrome || P.chrome || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    spawn(chrome, [`--user-data-dir=${profile}`, `--remote-debugging-port=${CDP}`, `--window-size=${WIN_W},${WIN_H + 87}`, '--no-first-run',
      '--no-default-browser-check', ...(A.args || []), `--app=${A.url}`], { env, detached: true, stdio: ['ignore', log, log] }).unref();
  }
  for (let i = 0; i < 60 && !(await alive()); i++) await sleep(500);
  await sleep(A.boot_ms ?? 5000);
  if (KIND === 'electron') {
    // Stop fullscreen / maximize from changing the recorded size.
    await main(`const w = BrowserWindow.getAllWindows().find(x => x.isVisible()); if (!w) return 0; if (w.isFullScreen()) w.setFullScreen(false); w.setFullScreenable(false);
      if (!globalThis.__walkLock) { globalThis.__walkLock = true; w.on('resize', () => { const b = w.getContentBounds(); if (b.width !== ${WIN_W} || b.height !== ${WIN_H}) setTimeout(() => { if (w.isMaximized()) w.unmaximize(); w.setContentSize(${WIN_W}, ${WIN_H}); }, 50); }); }
      w.setContentSize(${WIN_W}, ${WIN_H}); w.setPosition(30, 40); return 1`);
  }
}

// Make native "open folder/file" dialogs return a fixed path (Electron), so pickers never block a take.
export async function stubPicker(p) {
  await main(`globalThis.__pick=${JSON.stringify(p)}; electron.dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [globalThis.__pick] }); electron.dialog.showOpenDialogSync = () => [globalThis.__pick]; return 1`);
}

export async function connect() {
  const b = await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`);
  const match = A.page_match || (KIND === 'web' ? A.url : 'app://');
  const pages = b.contexts().flatMap((c) => c.pages());
  const page = pages.find((p) => p.url().startsWith(match)) || pages.find((p) => !p.url().startsWith('devtools'));
  if (!page) throw new Error(`no page matching ${match}`);
  if (KIND === 'web') await page.setViewportSize({ width: WIN_W, height: WIN_H }).catch(() => {});
  // App-specific prep on every connect, e.g. "await window.api.zoom.set(1)" (project.json app.on_connect).
  if (A.on_connect) await page.evaluate(`(async () => { ${A.on_connect} })()`).catch((e) => console.log('on_connect failed:', e.message));
  await page.waitForTimeout(300);
  return { b, page };
}

// Blur anything matching the privacy patterns, continuously (text nodes and inputs).
export async function redact(page) {
  const pats = ['[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\\.[A-Za-z0-9.]+', ...(P.redact || [])];
  await page.evaluate((src) => {
    if (window.__walkRedact) return; window.__walkRedact = true;
    const re = new RegExp(src, 'i');
    const scan = () => {
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n; while ((n = w.nextNode())) { if (re.test(n.nodeValue) && n.parentElement) n.parentElement.style.filter = 'blur(7px)'; }
      for (const el of document.querySelectorAll('input,textarea')) if (re.test(el.value || '')) el.style.filter = 'blur(7px)';
    };
    scan(); new MutationObserver(scan).observe(document.body, { subtree: true, childList: true, characterData: true });
  }, pats.join('|'));
  for (const css of P.redact_css || []) await page.addStyleTag({ content: `${css}{filter:blur(14px)!important}` });
}

// One recorded take. Marks: shot(id) starts a shot the edit can find; click/box add zoom + cursor targets;
// speed(from/to) marks a wait to fast-forward; label(text) is a free marker.
export class Scene {
  constructor(page, name) { this.page = page; this.name = name; this.rec = new Recorder(page, path.join(CLIPS, name)); }
  async start() {
    if (KIND === 'electron') await main(`const w = BrowserWindow.getAllWindows().find(x => x.isVisible()); if (w.isFullScreen()) w.setFullScreen(false); if (w.isMaximized()) w.unmaximize(); w.setContentSize(${WIN_W}, ${WIN_H}); return 1`);
    await this.page.waitForTimeout(700);
    await redact(this.page); await this.rec.start(); globalThis.__scene = this; await this.page.waitForTimeout(300);
  }
  async stop() { if (this.stopped) return; this.stopped = true; globalThis.__scene = null; return this.rec.stop(); }
  shot(id) { this.rec.mark('shot', { id }); console.log(`[${this.name}] shot ${id} @${this.rec.now().toFixed(1)}`); }
  label(text) { this.rec.mark('label', { text }); }
  speedFrom() { this.rec.mark('speed', { from: true }); }
  speedTo() { this.rec.mark('speed', { to: true }); }
  wait(ms) { return this.page.waitForTimeout(ms); }
  loc(sel) { return typeof sel === 'string' ? this.page.locator(sel).filter({ visible: true }).first() : sel; }
  async box(sel, label, type = 'focus') {
    const b = await this.loc(sel).boundingBox({ timeout: 2500 }).catch(() => null);
    if (!b) { console.log('  (no box for', label, ')'); return; }
    // CSS px -> video px from the real viewport (app zoom / devicePixelRatio can make it differ from the window size)
    const [vw, vh] = await this.page.evaluate(() => [innerWidth, innerHeight]);
    const sx = this.rec.w / vw, sy = this.rec.h / vh;
    this.rec.mark(type, { label, x: Math.round((b.x + b.width / 2) * sx), y: Math.round((b.y + b.height / 2) * sy),
      box: [b.x * sx, b.y * sy, b.width * sx, b.height * sy].map(Math.round) });
  }
  async click(sel, label = '', { pre = 500, post = 700, timeout = 20000, button } = {}) {
    const loc = this.loc(sel);
    await loc.waitFor({ state: 'visible', timeout });
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    await this.box(loc, label, 'click');
    await this.page.waitForTimeout(pre);
    await loc.click(button ? { button } : {});
    await this.page.waitForTimeout(post);
  }
  async type(text, { delay = 38, post = 400 } = {}) { this.rec.mark('type', { text }); await this.page.keyboard.type(text, { delay }); await this.page.waitForTimeout(post); }
  async key(k, post = 600) { this.rec.mark('key', { key: k }); await this.page.keyboard.press(k); await this.page.waitForTimeout(post); }
  async waitFor(sel, timeout = 180000) { await this.loc(sel).waitFor({ state: 'visible', timeout }); }
  async waitGone(sel, timeout = 300000) { await this.loc(sel).waitFor({ state: 'hidden', timeout }); }
}

// Run scenes by name from a scenes object: node scenes.mjs c04,c05 [--launch]
export async function runScenes(scenes) {
  const names = (process.argv[2] || '').split(',').filter(Boolean);
  if (!names.length) { console.log('scenes:', Object.keys(scenes).join(', ')); process.exit(0); }
  if (process.argv.includes('--launch')) await launch({ fresh: true });
  let { page } = await connect();
  try {
    for (const n of names) {
      if (!scenes[n]) throw new Error(`no scene ${n}`);
      page = (await scenes[n](page)) || page;
      await page.screenshot({ path: path.join(QC, `end_${n}.png`) });
    }
  } catch (e) {
    console.error(e);
    if (globalThis.__scene) { const n = globalThis.__scene.name; try { await globalThis.__scene.stop(); console.error('saved partial take', n); } catch {} }
    process.exit(1);
  }
  process.exit(0);
}
