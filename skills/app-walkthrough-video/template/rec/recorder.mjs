// CDP screencast recorder: works on any Playwright Page (Chrome or Electron).
// Frames arrive only when pixels change; each frame is held until the next one,
// then ffmpeg rebuilds a constant 30fps video. Also logs named events
// (clicks, labels) on the same clock so the edit can place zooms and labels.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export class Recorder {
  constructor(page, outDir, { width = 1920, height = 1080 } = {}) {
    this.page = page; this.outDir = outDir; this.w = width; this.h = height;
    this.frames = []; this.events = []; this.n = 0;
  }
  async start() {
    fs.rmSync(this.outDir, { recursive: true, force: true });
    fs.mkdirSync(path.join(this.outDir, 'f'), { recursive: true });
    this.cdp = await this.page.context().newCDPSession(this.page);
    this.cdp.on('Page.screencastFrame', async (e) => {
      if (this.stopped) return;
      const file = path.join(this.outDir, 'f', String(this.n++).padStart(6, '0') + '.jpg');
      fs.writeFileSync(file, Buffer.from(e.data, 'base64'));
      this.frames.push({ file, t: e.metadata.timestamp });
      try { await this.cdp.send('Page.screencastFrameAck', { sessionId: e.sessionId }); } catch {}
    });
    await this.cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: this.w, maxHeight: this.h, everyNthFrame: 1 });
    this.t0 = Date.now() / 1000;
  }
  now() { return Date.now() / 1000 - this.t0; }
  mark(type, data = {}) { this.events.push({ t: +this.now().toFixed(3), type, ...data }); }
  async stop() {
    this.mark('end');
    await new Promise((r) => setTimeout(r, 300));
    await this.cdp.send('Page.stopScreencast').catch(() => {});
    this.stopped = true;
    const end = Date.now() / 1000;
    const lines = [];
    const fr = this.frames;
    for (let i = 0; i < fr.length; i++) {
      const next = i + 1 < fr.length ? fr[i + 1].t : end;
      lines.push(`file '${fr[i].file}'`, `duration ${Math.max(0.001, next - fr[i].t).toFixed(4)}`);
    }
    if (fr.length) lines.push(`file '${fr[fr.length - 1].file}'`);
    const list = path.join(this.outDir, 'frames.txt');
    fs.writeFileSync(list, lines.join('\n'));
    // Offset between recorder clock and first frame, so events line up with video t=0.
    const lead = fr.length ? fr[0].t - this.t0 : 0;
    const events = this.events.map((e) => ({ ...e, t: +(e.t - lead).toFixed(3) }));
    fs.writeFileSync(path.join(this.outDir, 'events.json'), JSON.stringify(events, null, 1));
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list,
      '-vf', `scale=${this.w}:${this.h}:force_original_aspect_ratio=decrease,pad=${this.w}:${this.h}:(ow-iw)/2:(oh-ih)/2:color=0x0a0a0a,fps=30,format=yuv420p`,
      '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', path.join(this.outDir, 'clip.mp4')]);
    fs.rmSync(path.join(this.outDir, 'f'), { recursive: true, force: true });
    return path.join(this.outDir, 'clip.mp4');
  }
}

// Click with an event mark (box centre in CSS px, scaled to video px) so post can zoom + draw cursor.
export async function clickMark(rec, page, locator, label, opts = {}) {
  const loc = typeof locator === 'string' ? page.locator(locator).first() : locator;
  await loc.waitFor({ state: 'visible', timeout: opts.timeout ?? 15000 });
  const b = await loc.boundingBox();
  const vp = await page.evaluate(() => [innerWidth, innerHeight]);
  const sx = rec.w / vp[0], sy = rec.h / vp[1];
  rec.mark('click', { label, x: Math.round((b.x + b.width / 2) * sx), y: Math.round((b.y + b.height / 2) * sy),
    box: [b.x * sx, b.y * sy, b.width * sx, b.height * sy].map(Math.round) });
  await page.waitForTimeout(opts.pre ?? 450);
  await loc.click(opts.click ?? {});
  await page.waitForTimeout(opts.post ?? 600);
}
