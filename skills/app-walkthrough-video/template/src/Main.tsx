import React from 'react';
import {
  AbsoluteFill, Audio, Freeze, Img, OffthreadVideo, Sequence, interpolate, spring,
  staticFile, useCurrentFrame, useVideoConfig, Easing,
} from 'remotion';
import {loadFont} from '@remotion/fonts';

loadFont({family: 'Montserrat', url: staticFile('fonts/Montserrat.ttf'), weight: '100 900'});
loadFont({family: 'Noto Sans Khmer', url: staticFile('fonts/NotoSansKhmer.ttf'), weight: '100 900'});

const FONT = "Montserrat, 'Noto Sans Khmer', system-ui, sans-serif";
// Brand (name, url, tagline, accent colours) comes from timeline.brand, written by build_timeline.py.
export type Brand = {name: string; url: string; tagline?: string; accent: [string, string]};
const DEFAULT_BRAND: Brand = {name: 'App', url: '', accent: ['#7c5cff', '#22d3ee']};
export const BrandCtx = React.createContext<Brand>(DEFAULT_BRAND);
const useBrand = () => React.useContext(BrandCtx);
const grad = (b: Brand) => `linear-gradient(90deg,${b.accent[0]},${b.accent[1]})`;
const rgba = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

type Zoom = {t0: number; t1: number; cx: number; cy: number; scale: number; box?: number[]};
type CursorPt = {t: number; x: number; y: number; click?: boolean};
type Seg = {
  kind: 'clip' | 'card' | 'slot' | 'faq' | 'end' | 'montage' | 'brand';
  start: number; dur: number;
  src?: string; srcFrom?: number; rate?: number; holdAt?: number;
  zooms?: Zoom[]; cursor?: CursorPt[];
  label?: {text: string; t0: number; t1: number};
  badge?: string; chapter?: string; title?: string; lines?: string[];
  q?: string; a?: string; parts?: Seg[];
};
export type Caption = {start: number; end: number; text: string};
export type Timeline = {
  captions?: Caption[];
  sfx?: {at: number; name: string; vol?: number}[];
  durationFrames: number;
  segments: Seg[];
  audio: {src: string; start: number; volume?: number}[];
  music?: {src: string; volume: number; duck: [number, number][]};
  brand?: Brand;
};

const ease = Easing.bezier(0.45, 0, 0.2, 1);

// Camera: piecewise zoom toward a target box, eased in and out.
function camera(frame: number, zooms: Zoom[] = []) {
  let s = 1, cx = 960, cy = 540;
  for (const z of zooms) {
    const inn = interpolate(frame, [z.t0, z.t0 + 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
    const out = interpolate(frame, [z.t1 - 12, z.t1], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
    const k = Math.min(inn, out);
    if (k > 0) { s = 1 + (z.scale - 1) * k; cx = 960 + (z.cx - 960) * k; cy = 540 + (z.cy - 540) * k; }
  }
  // keep the scaled frame covering the viewport
  const half = (v: number, lim: number) => Math.min(lim - lim / (2 * s), Math.max(lim / (2 * s), v));
  cx = half(cx, 1920); cy = half(cy, 1080);
  return {s, tx: 960 - cx * s, ty: 540 - cy * s};
}

function cursorAt(frame: number, pts: CursorPt[] = []) {
  if (!pts.length) return null;
  if (frame <= pts[0].t) return {x: pts[0].x, y: pts[0].y, click: 0};
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (frame >= a.t && frame <= b.t) {
      const k = interpolate(frame, [a.t, b.t], [0, 1], {easing: ease});
      return {x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, click: 0};
    }
  }
  const l = pts[pts.length - 1];
  return {x: l.x, y: l.y, click: 0};
}

const Cursor: React.FC<{pts?: CursorPt[]; cam: {s: number; tx: number; ty: number}}> = ({pts, cam}) => {
  const f = useCurrentFrame(); const B = useBrand();
  const c = cursorAt(f, pts);
  if (!c) return null;
  const x = c.x * cam.s + cam.tx, y = c.y * cam.s + cam.ty;
  const clicks = (pts || []).filter((p) => p.click && f >= p.t && f < p.t + 14);
  return (
    <>
      {clicks.map((p, i) => {
        const k = (f - p.t) / 14;
        return <div key={i} style={{position: 'absolute', left: x - 34, top: y - 34, width: 68, height: 68, borderRadius: 99,
          border: `3px solid ${rgba(B.accent[0], 0.9)}`, transform: `scale(${0.4 + k})`, opacity: 1 - k}} />;
      })}
      <svg style={{position: 'absolute', left: x - 4, top: y - 2, filter: 'drop-shadow(0 3px 6px rgba(0,0,0,.55))'}} width="34" height="42" viewBox="0 0 17 21">
        <path d="M1 1 L1 16 L5 12.5 L8 19.5 L10.6 18.4 L7.7 11.6 L13 11.6 Z" fill="#fff" stroke="#111" strokeWidth="1.1" strokeLinejoin="round" />
      </svg>
    </>
  );
};

const Label: React.FC<{text: string; t0: number; t1: number}> = ({text, t0, t1}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig(); const B = useBrand();
  if (f < t0 || f > t1) return null;
  const inS = spring({frame: f - t0, fps, config: {damping: 18, stiffness: 140}});
  const out = interpolate(f, [t1 - 8, t1], [1, 0], {extrapolateLeft: 'clamp'});
  return (
    <div style={{position: 'absolute', left: 48, top: 40, display: 'flex', alignItems: 'center', gap: 14,
      transform: `translateX(${(1 - inS) * -60}px) scale(${0.9 + 0.1 * inS})`, transformOrigin: 'left center', opacity: Math.min(inS, out)}}>
      <div style={{width: 8, height: 50 * inS, borderRadius: 4, background: grad(B), boxShadow: `0 0 18px ${rgba(B.accent[0], 0.8)}`}} />
      <div style={{position: 'relative', overflow: 'hidden', fontFamily: FONT, fontWeight: 800, fontSize: 36, color: '#fff', background: 'rgba(12,12,16,0.86)',
        padding: '10px 24px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 10px 30px rgba(0,0,0,.45)', lineHeight: 1.35}}>
        {text}
        <div style={{position: 'absolute', top: 0, bottom: 0, width: 90, left: interpolate(f - t0, [6, 26], [-120, 900], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
          background: 'linear-gradient(100deg, transparent, rgba(255,255,255,.35), transparent)', transform: 'skewX(-18deg)'}} />
      </div>
    </div>
  );
};

const Spotlight: React.FC<{zooms?: Zoom[]; cam: {s: number; tx: number; ty: number}}> = ({zooms, cam}) => {
  const f = useCurrentFrame(); const B = useBrand();
  const z = (zooms || []).find((z) => z.box && f >= z.t0 + 6 && f <= z.t1 - 4);
  if (!z) return null;
  const [bx, by, bw, bh] = z.box!;
  const pad = 10;
  const x = (bx - pad) * cam.s + cam.tx, y = (by - pad) * cam.s + cam.ty, w = (bw + 2 * pad) * cam.s, h = (bh + 2 * pad) * cam.s;
  const k = interpolate(f, [z.t0 + 6, z.t0 + 16], [0, 1], {extrapolateRight: 'clamp'});
  const out = interpolate(f, [z.t1 - 12, z.t1 - 4], [1, 0], {extrapolateLeft: 'clamp'});
  const pulse = 0.5 + 0.5 * Math.sin((f - z.t0) / 5);
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 16, opacity: Math.min(k, out),
      border: `3px solid ${rgba(B.accent[0], 0.95)}`, boxShadow: `0 0 0 9999px rgba(0,0,0,${0.28 * Math.min(k, out)}), 0 0 ${18 + 14 * pulse}px ${rgba(B.accent[0], 0.85)}, inset 0 0 14px ${rgba(B.accent[1], 0.35)}`,
      transform: `scale(${1.08 - 0.08 * k})`}} />
  );
};

const Captions: React.FC<{caps?: Caption[]}> = ({caps}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const c = (caps || []).find((c) => f >= c.start && f < c.end);
  if (!c) return null;
  const k = spring({frame: f - c.start, fps, config: {damping: 16, stiffness: 180}});
  const prog = interpolate(f, [c.start, c.end - 4], [0, 100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 54, display: 'flex', justifyContent: 'center', pointerEvents: 'none'}}>
      <div style={{maxWidth: 1560, textAlign: 'center', padding: '12px 30px 14px', borderRadius: 18, background: 'rgba(8,8,12,0.78)',
        border: '1px solid rgba(255,255,255,.1)', boxShadow: '0 12px 36px rgba(0,0,0,.5)', transform: `translateY(${(1 - k) * 24}px) scale(${0.94 + 0.06 * k})`, opacity: k}}>
        <div style={{position: 'relative', fontFamily: FONT, fontWeight: 800, fontSize: 44, lineHeight: 1.45, whiteSpace: 'pre-line', textShadow: '0 2px 6px rgba(0,0,0,.6)'}}>
          <div style={{color: 'rgba(255,255,255,.62)'}}>{c.text}</div>
          <div style={{position: 'absolute', inset: 0, color: '#ffffff', clipPath: `inset(0 ${100 - prog}% 0 0)`}}>{c.text}</div>
        </div>
      </div>
    </div>
  );
};

const Headline: React.FC<{text: string; t0: number; t1: number}> = ({text, t0, t1}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig(); const B = useBrand();
  if (f < t0 || f > t1) return null;
  const k = spring({frame: f - t0, fps, config: {damping: 11, stiffness: 160, mass: 0.8}});
  const out = interpolate(f, [t1 - 8, t1], [1, 0], {extrapolateLeft: 'clamp'});
  const u = interpolate(f - t0, [6, 22], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 70, display: 'flex', justifyContent: 'center', opacity: out}}>
      <div style={{textAlign: 'center', padding: '18px 44px 22px', borderRadius: 26, background: 'rgba(7,7,11,0.86)', border: '1px solid rgba(255,255,255,.14)',
        boxShadow: `0 24px 70px rgba(0,0,0,.6), 0 0 60px ${rgba(B.accent[0], 0.25)}`, transform: `scale(${0.6 + 0.4 * k}) rotate(${(1 - k) * -3}deg)`, opacity: Math.min(1, k * 1.4)}}>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 74, lineHeight: 1.25, color: '#fff', letterSpacing: -1}}>{text}</div>
        <div style={{height: 8, borderRadius: 4, margin: '12px auto 0', width: `${u * 100}%`, background: grad(B), boxShadow: `0 0 20px ${rgba(B.accent[1], 0.6)}`}} />
      </div>
    </div>
  );
};

const BrandSeg: React.FC<{seg: Seg}> = ({seg}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig(); const B = useBrand();
  const k = spring({frame: f, fps, config: {damping: 9, stiffness: 120}});
  const k2 = spring({frame: f - 8, fps, config: {damping: 14}});
  const burst = interpolate(f, [0, 22], [0, 1], {extrapolateRight: 'clamp', easing: ease});
  return (
    <AbsoluteFill>
      <Bg />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <div style={{position: 'absolute', width: 1400 * burst, height: 1400 * burst, borderRadius: '50%', border: `3px solid ${rgba(B.accent[0], 0.5)}`, opacity: 1 - burst}} />
        <div style={{position: 'absolute', width: 900 * burst, height: 900 * burst, borderRadius: '50%', background: `radial-gradient(circle, ${rgba(B.accent[0], 0.45)}, transparent 65%)`}} />
        <Img src={staticFile('logo.png')} style={{width: 260, height: 260, transform: `scale(${k}) rotate(${(1 - k) * -40}deg)`}} />
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 150, color: '#fff', marginTop: 10, transform: `translateY(${(1 - k2) * 50}px)`, opacity: k2}}>{B.name}</div>
        <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 40, color: '#c4b5fd', marginTop: 4, opacity: k2}}>{seg.title || B.tagline || ''}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Badge: React.FC<{text: string}> = ({text}) => (
  <div style={{position: 'absolute', right: 48, top: 40, fontFamily: FONT, fontWeight: 800, fontSize: 30, color: '#fff',
    background: 'rgba(12,12,16,0.8)', padding: '8px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)'}}>⏩ {text}</div>
);

const ClipSeg: React.FC<{seg: Seg}> = ({seg}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const cam = camera(f, seg.zooms);
  const fromFrame = Math.round((seg.srcFrom || 0) * fps);
  const video = (seg as any).freeze
    ? <Freeze frame={0}><OffthreadVideo src={staticFile(seg.src!)} startFrom={fromFrame} muted /></Freeze>
    : <OffthreadVideo src={staticFile(seg.src!)} startFrom={fromFrame} playbackRate={seg.rate || 1} muted />;
  if ((seg as any).portrait) {
    return (
      <AbsoluteFill>
        <Bg />
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
          <div style={{width: 540, height: 960, borderRadius: 44, overflow: 'hidden', border: '10px solid #1c1c22', boxShadow: '0 30px 80px rgba(0,0,0,.6)'}}>
            <div style={{width: 608, height: 1080, transform: 'scale(0.8888)', transformOrigin: '0 0', marginLeft: -6}}>{video}</div>
          </div>
        </AbsoluteFill>
        {seg.label ? <Label {...seg.label} /> : null}
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{background: '#0a0a0a', overflow: 'hidden'}}>
      <AbsoluteFill style={{transformOrigin: '0 0', transform: `translate(${cam.tx}px,${cam.ty}px) scale(${cam.s})`}}>{video}</AbsoluteFill>
      <Spotlight zooms={seg.zooms} cam={cam} />
      <Cursor pts={seg.cursor} cam={cam} />
      {seg.badge ? <Badge text={seg.badge} /> : null}
      {seg.label ? <Label {...seg.label} /> : null}
      {(seg as any).head ? <Headline {...(seg as any).head} /> : null}
    </AbsoluteFill>
  );
};

const Bg: React.FC = () => {
  const f = useCurrentFrame(); const B = useBrand();
  return (
    <AbsoluteFill style={{background: '#07070b'}}>
      <AbsoluteFill style={{background: `radial-gradient(900px 600px at ${30 + Math.sin(f / 90) * 6}% 20%, ${rgba(B.accent[0], 0.28)}, transparent 60%),
        radial-gradient(800px 600px at ${75 + Math.cos(f / 110) * 6}% 85%, ${rgba(B.accent[1], 0.18)}, transparent 60%)`}} />
    </AbsoluteFill>
  );
};

const CardSeg: React.FC<{seg: Seg}> = ({seg}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig(); const B = useBrand();
  const k = spring({frame: f, fps, config: {damping: 20}});
  const out = interpolate(f, [seg.dur - 8, seg.dur], [1, 0], {extrapolateLeft: 'clamp'});
  return (
    <AbsoluteFill style={{opacity: out}}>
      <Bg />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color: '#fff', transform: `translateY(${(1 - k) * 40}px)`, opacity: k}}>
        <div style={{fontSize: 40, fontWeight: 800, letterSpacing: /^[A-Z ]+$/.test((seg as any).word || 'CHAPTER') ? 8 : 0, color: B.accent[0], lineHeight: 1.4}}>{((seg as any).word || 'CHAPTER')} {seg.chapter}</div>
        <div style={{fontSize: 96, fontWeight: 800, marginTop: 18, textAlign: 'center', maxWidth: 1600, lineHeight: 1.25}}>{seg.title}</div>
        <div style={{width: 160 * k, height: 6, borderRadius: 3, background: grad(B), marginTop: 34}} />
      </AbsoluteFill>
      <AbsoluteFill style={{background: `linear-gradient(100deg, transparent 0%, ${rgba(B.accent[0], 0.9)} 42%, ${rgba(B.accent[1], 0.9)} 58%, transparent 100%)`,
        transform: `translateX(${interpolate(f, [0, 16], [-110, 110], {extrapolateRight: 'clamp', easing: ease})}%) skewX(-12deg)`, opacity: interpolate(f, [0, 3, 13, 16], [0, 1, 1, 0], {extrapolateRight: 'clamp'})}} />
    </AbsoluteFill>
  );
};

const SlotSeg: React.FC<{seg: Seg}> = ({seg}) => (
  <AbsoluteFill>
    <Bg />
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color: '#fff'}}>
      <div style={{border: '4px dashed #f59e0b', borderRadius: 28, padding: '50px 70px', maxWidth: 1400, background: 'rgba(0,0,0,.4)'}}>
        <div style={{fontSize: 30, fontWeight: 800, color: '#f59e0b', letterSpacing: 4}}>FOOTAGE SLOT · RECORD PER SHOT LIST</div>
        <div style={{fontSize: 64, fontWeight: 800, marginTop: 14}}>{seg.title}</div>
        {(seg.lines || []).map((l, i) => <div key={i} style={{fontSize: 34, marginTop: 14, color: '#d4d4d8'}}>{l}</div>)}
      </div>
    </AbsoluteFill>
    {seg.label ? <Label {...seg.label} /> : null}
  </AbsoluteFill>
);

const FaqSeg: React.FC<{seg: Seg}> = ({seg}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig(); const B = useBrand();
  const k = spring({frame: f, fps, config: {damping: 20}});
  const k2 = spring({frame: f - 10, fps, config: {damping: 20}});
  return (
    <AbsoluteFill>
      <Bg />
      <AbsoluteFill style={{justifyContent: 'center', padding: '0 180px', fontFamily: FONT, color: '#fff'}}>
        <div style={{fontSize: 34, fontWeight: 800, letterSpacing: 6, color: B.accent[0]}}>FAQ</div>
        <div style={{fontSize: 72, fontWeight: 800, marginTop: 12, lineHeight: 1.3, opacity: k, transform: `translateX(${(1 - k) * -40}px)`}}>{seg.q}</div>
        <div style={{fontSize: 46, marginTop: 30, color: '#d4d4d8', lineHeight: 1.3, opacity: k2, transform: `translateX(${(1 - k2) * -40}px)`}}>{seg.a}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const EndSeg: React.FC<{seg: Seg}> = ({seg}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig(); const B = useBrand();
  const k = spring({frame: f, fps, config: {damping: 16}});
  return (
    <AbsoluteFill>
      <Bg />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color: '#fff'}}>
        <Img src={staticFile('logo.png')} style={{width: 220, height: 220, transform: `scale(${k})`}} />
        <div style={{fontSize: 110, fontWeight: 800, marginTop: 20}}>{B.name}</div>
        <div style={{fontSize: 44, marginTop: 24, color: '#d4d4d8'}}>{seg.title || 'Download at'}</div>
        <div style={{fontSize: 64, fontWeight: 800, marginTop: 8, color: B.accent[0]}}>{B.url}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Fade: React.FC<{dur: number; on?: boolean; children: React.ReactNode}> = ({dur, on = true, children}) => {
  const f = useCurrentFrame();
  if (!on) return <AbsoluteFill>{children}</AbsoluteFill>;
  const o = Math.min(interpolate(f, [0, 6], [0, 1], {extrapolateRight: 'clamp'}), interpolate(f, [dur - 6, dur], [1, 0], {extrapolateLeft: 'clamp'}));
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

export const Main: React.FC<{timeline: Timeline}> = ({timeline}) => {
  const f = useCurrentFrame();
  const m = timeline.music;
  return (
    <BrandCtx.Provider value={{...DEFAULT_BRAND, ...(timeline.brand || {})}}><AbsoluteFill style={{background: '#000'}}>
      {timeline.segments.map((seg, i) => (
        <Sequence key={i} from={seg.start} durationInFrames={seg.dur} premountFor={30}>
          <Fade dur={seg.dur} on={seg.kind !== 'clip'}>
            {seg.kind === 'clip' ? <ClipSeg seg={seg} /> :
             seg.kind === 'card' ? <CardSeg seg={seg} /> :
             seg.kind === 'slot' ? <SlotSeg seg={seg} /> :
             seg.kind === 'faq' ? <FaqSeg seg={seg} /> :
             seg.kind === 'end' ? <EndSeg seg={seg} /> :
             seg.kind === 'brand' ? <BrandSeg seg={seg} /> : null}
          </Fade>
        </Sequence>
      ))}
      <Captions caps={timeline.captions} />
      {(timeline.sfx || []).map((x, i) => (
        <Sequence key={'s' + i} from={x.at} durationInFrames={45} layout="none"><Audio src={staticFile(`sfx/${x.name}.wav`)} volume={x.vol ?? 0.3} /></Sequence>
      ))}
      {timeline.audio.map((a, i) => (
        <Sequence key={'a' + i} from={a.start}><Audio src={staticFile(a.src)} volume={a.volume ?? 1} /></Sequence>
      ))}
      {m ? <Audio src={staticFile(m.src)} loop volume={(fr) => {
        const ducked = m.duck.some(([a, b]) => fr >= a - 6 && fr <= b + 10);
        return ducked ? m.volume * 0.35 : m.volume;
      }} /> : null}
    </AbsoluteFill></BrandCtx.Provider>
  );
};
