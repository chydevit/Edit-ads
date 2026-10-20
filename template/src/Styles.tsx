// Two alternative looks for the product film, driven by the same slide data as Product.tsx.
//   Neon  – dark, fast, full-bleed glowing screenshots, mask-reveal headlines, light-streak cuts.
//   Paper – warm editorial paper, neo-brutalist cards with hard shadows, highlighter accents, page-push transitions.
import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {loadFont} from '@remotion/fonts';
import type {Slide} from './Product';
import {BrandCtx, brandOf, useBrand, FilmData, Brand} from './Brand';

loadFont({family: 'Kantumruy Pro', url: staticFile('fonts/KantumruyPro.ttf'), weight: '100 900'});
loadFont({family: 'Montserrat', url: staticFile('fonts/Montserrat.ttf'), weight: '100 900'});
const FONT = "Montserrat, 'Kantumruy Pro', system-ui, sans-serif";
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
type Img_ = {src: string; crop?: number[]};
type Data = FilmData & {slides: Slide[]};

const full = (img: Img_, B: Brand) => img.crop || [0, 0, B.shotW, B.shotH];
const fit = (img: Img_, maxW: number, maxH: number, B: Brand) => {
  const [, , w, h] = full(img, B); const s = Math.min(maxW / w, maxH / h);
  return {w: Math.round(w * s), h: Math.round(h * s)};
};
// The crop region of a screenshot, scaled into a w×h box, with an optional push-in zoom.
const Crop: React.FC<{img: Img_; w: number; h: number; zoom?: number}> = ({img, w, h, zoom = 1}) => {
  const B = useBrand(); const [x, y, cw] = full(img, B); const s = w / cw;
  return (
    <div style={{width: w, height: h, overflow: 'hidden', position: 'relative', background: '#0b0b10'}}>
      <Img src={staticFile(`shots/${img.src}.png`)} style={{position: 'absolute', width: B.shotW * s, left: -x * s, top: -y * s,
        transform: `scale(${zoom})`, transformOrigin: `${(x + cw / 2) * s}px ${(y + h / s / 2) * s}px`}} />
    </div>
  );
};
// Approximate rendered width (in ems) of a line: Khmer vowels/signs and subscript consonants take no advance.
const ems = (l: string) => l.replace(/\u17D2./g, '').replace(/[\u17B6-\u17D3\u17DD]/g, '').split('').reduce((a, c) => a + (/[\u1780-\u17FF]/.test(c) ? 0.9 : /[A-Z0-9]/.test(c) ? 0.82 : c === ' ' ? 0.32 : 0.7), 0);
// Largest font size up to `base` at which every headline line fits `width` without wrapping.
const fitSize = (lines: string[], base: number, width: number) => Math.min(base, ...lines.map((l) => width / Math.max(1, ems(l))));
const countUp = (big: string, f: number, at: number) => {
  const n = big.match(/^(\d+)(.*)$/);
  return n ? `${Math.round(Number(n[1]) * interpolate(f, [at, at + 30], [0, 1], {...clamp, easing: ease}))}${n[2]}` : big;
};
const cuts = (slides: Slide[], overlap: number) => {
  let at = 0; return slides.map((s) => { const from = at; at += s.dur - overlap; return from; });
};

/* ------------------------------------------------------------------ NEON */
const N = {bg: '#07060d', violet: '#7c6dff', cyan: '#5eead4', ink: '#f5f3ff', mute: '#a1a1b5'};

const NeonBg: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: N.bg}}>
      <AbsoluteFill style={{opacity: 0.07, backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
        backgroundSize: '80px 80px', backgroundPosition: `${-f * 0.6}px ${-f * 0.3}px`}} />
      <AbsoluteFill style={{background: `radial-gradient(900px 700px at ${70 + Math.sin(f / 50) * 6}% 40%, rgba(124,109,255,.30), transparent 60%),
        radial-gradient(700px 600px at 10% 100%, rgba(45,212,191,.18), transparent 60%), radial-gradient(1400px 900px at 50% 50%, transparent 50%, rgba(0,0,0,.7))`}} />
    </AbsoluteFill>
  );
};

const NeonHead: React.FC<{s: Slide; idx: number; size?: number; align?: 'left' | 'center'; width?: number}> = ({s, idx, size: base = 92, align = 'left', width = 660}) => {
  const f = useCurrentFrame();
  const lines = (s.head || '').split('\n');
  const size = fitSize(lines, base, width);
  const r = (i: number) => interpolate(f, [3 + i * 4, 17 + i * 4], [0, 1], {...clamp, easing: ease});
  return (
    <div style={{fontFamily: FONT, textAlign: align}}>
      {s.kicker ? (
        <div style={{display: 'flex', alignItems: 'center', gap: 16, justifyContent: align === 'center' ? 'center' : 'flex-start', marginBottom: 22, opacity: r(0)}}>
          <span style={{fontSize: 22, fontWeight: 800, color: N.cyan, letterSpacing: 2}}>{String(idx + 1).padStart(2, '0')}</span>
          <span style={{width: 60 * r(0), height: 2, background: N.cyan}} />
          <span style={{fontSize: 24, fontWeight: 800, color: N.ink, letterSpacing: /^[A-Z ]+$/.test(s.kicker) ? 3 : 0}}>{s.kicker}</span>
        </div>
      ) : null}
      {lines.map((l, i) => (
        <div key={i} style={{overflow: 'hidden', paddingBottom: 6}}>
          <div style={{fontSize: size, fontWeight: 900, lineHeight: 1.32, whiteSpace: 'nowrap', color: l === s.accent ? N.cyan : N.ink,
            textShadow: l === s.accent ? '0 0 40px rgba(94,234,212,.45)' : 'none', transform: `translateY(${(1 - r(i + 1)) * 110}%)`}}>{l}</div>
        </div>
      ))}
      {s.sub ? (
        <div style={{marginTop: 26, fontSize: 29, fontWeight: 600, lineHeight: 1.55, color: N.mute, maxWidth: 700, borderLeft: align === 'left' ? `4px solid ${N.violet}` : 'none',
          paddingLeft: align === 'left' ? 22 : 0, margin: align === 'center' ? '26px auto 0' : undefined, opacity: r(lines.length + 1),
          transform: `translateX(${(1 - r(lines.length + 1)) * -30}px)`}}>{s.sub}</div>
      ) : null}
    </div>
  );
};

const NeonPanel: React.FC<{img: Img_; maxW: number; maxH: number; delay?: number; dur: number}> = ({img, maxW, maxH, delay = 4, dur}) => {
  const f = useCurrentFrame();
  const {w, h} = fit(img, maxW, maxH, useBrand());
  const reveal = interpolate(f, [delay, delay + 16], [100, 0], {...clamp, easing: ease});
  const zoom = interpolate(f, [delay, dur], [1.14, 1], {...clamp, easing: Easing.out(Easing.quad)});
  return (
    <div style={{position: 'relative', clipPath: `inset(0 0 0 ${reveal}%)`, borderRadius: 16, overflow: 'hidden',
      boxShadow: '0 0 0 1.5px rgba(124,109,255,.7), 0 0 90px rgba(124,109,255,.35), 0 40px 120px rgba(0,0,0,.8)'}}>
      <Crop img={img} w={w} h={h} zoom={zoom} />
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(124,109,255,.10), transparent 30%, transparent 75%, rgba(7,6,13,.35))'}} />
    </div>
  );
};

const NeonSlide: React.FC<{s: Slide; idx: number}> = ({s, idx}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig(); const B = useBrand();
  let body: React.ReactNode = null;
  if (s.kind === 'hero') {
    body = (
      <AbsoluteFill style={{flexDirection: 'row', alignItems: 'center', padding: '0 90px 0 110px', gap: 60}}>
        <div style={{width: 660, flexShrink: 0}}><NeonHead s={s} idx={idx} /></div>
        <div style={{flex: 1, display: 'flex', justifyContent: 'center'}}>{s.img ? <NeonPanel img={s.img} maxW={1040} maxH={820} dur={s.dur} /> : null}</div>
      </AbsoluteFill>
    );
  } else if (s.kind === 'dark') {
    // Section opener: giant outlined chapter word behind, screenshot dimmed full-bleed.
    const z = interpolate(f, [0, s.dur], [1.08, 1.0]);
    body = (
      <AbsoluteFill>
        {s.img ? <AbsoluteFill style={{opacity: 0.22, filter: 'blur(2px) saturate(1.3)'}}><Crop img={s.img} w={1920} h={1080 * (s.img.crop ? 1 : 1)} zoom={z} /></AbsoluteFill> : null}
        <AbsoluteFill style={{background: 'linear-gradient(90deg, rgba(7,6,13,.96) 30%, rgba(7,6,13,.55))'}} />
        <div style={{position: 'absolute', right: -40, bottom: -90, fontFamily: FONT, fontWeight: 900, fontSize: 520, color: 'transparent',
          WebkitTextStroke: '2px rgba(124,109,255,.35)', transform: `translateX(${(1 - spring({frame: f, fps, config: {damping: 30}})) * 200}px)`}}>
          {String(idx + 1).padStart(2, '0')}</div>
        <AbsoluteFill style={{justifyContent: 'center', padding: '0 140px'}}>
          <div style={{display: 'inline-flex', alignItems: 'center', gap: 14, marginBottom: 34}}>
            <Img src={staticFile(B.logo)} style={{width: 48, height: 48}} />
            <span style={{fontFamily: FONT, fontWeight: 900, fontSize: 32, color: N.ink}}>{B.name}</span>
          </div>
          <div style={{width: 1000}}><NeonHead s={s} idx={idx} size={104} width={1000} /></div>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  } else if (s.kind === 'stats') {
    body = (
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <NeonHead s={s} idx={idx} size={60} align="center" width={1600} />
        <div style={{display: 'flex', marginTop: 80}}>
          {(s.cards || []).map((c, i) => {
            const k = spring({frame: f - 12 - i * 6, fps, config: {damping: 16}});
            const shown = countUp(c.big, f, 12 + i * 6);
            return (
              <div key={i} style={{width: 520, textAlign: 'center', borderLeft: i ? '1.5px solid rgba(255,255,255,.14)' : 'none', opacity: k, transform: `translateY(${(1 - k) * 50}px)`}}>
                <div style={{fontFamily: FONT, fontWeight: 900, fontSize: shown.length > 4 ? 96 : 170, lineHeight: 1.1, color: i === 1 ? N.ink : N.cyan,
                  textShadow: i === 1 ? '0 0 50px rgba(124,109,255,.8)' : '0 0 50px rgba(94,234,212,.5)'}}>{shown}</div>
                <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 28, color: N.mute, marginTop: 14, lineHeight: 1.5, whiteSpace: 'pre-line'}}>{c.small}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  } else if (s.kind === 'steps') {
    const line = interpolate(f, [10, 60], [0, 1], {...clamp, easing: ease});
    body = (
      <AbsoluteFill style={{alignItems: 'center', paddingTop: 110}}>
        <NeonHead s={s} idx={idx} size={66} align="center" width={1600} />
        <div style={{position: 'relative', display: 'flex', gap: 44, marginTop: 80}}>
          <div style={{position: 'absolute', left: 190, top: 296, height: 3, width: 1260 * line, background: `linear-gradient(90deg, ${N.violet}, ${N.cyan})`, boxShadow: `0 0 20px ${N.violet}`}} />
          {(s.imgs || []).map((im, i) => {
            const k = spring({frame: f - 14 - i * 10, fps, config: {damping: 15}});
            return (
              <div key={i} style={{width: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: k, transform: `translateY(${(1 - k) * 40}px)`}}>
                <div style={{borderRadius: 12, overflow: 'hidden', boxShadow: '0 0 0 1.5px rgba(124,109,255,.6), 0 20px 60px rgba(0,0,0,.7)'}}><Crop img={im} w={380} h={238} /></div>
                <div style={{marginTop: 34, width: 56, height: 56, borderRadius: 28, background: N.bg, border: `3px solid ${N.cyan}`, color: N.cyan, fontFamily: FONT, fontWeight: 900, fontSize: 26,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 24px rgba(94,234,212,.6)`, zIndex: 2}}>{i + 1}</div>
                <div style={{marginTop: 18, fontFamily: FONT, fontWeight: 800, fontSize: 30, color: N.ink, textAlign: 'center', lineHeight: 1.4}}>{im.cap}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  } else if (s.kind === 'two') {
    body = (
      <AbsoluteFill style={{alignItems: 'center', paddingTop: 100}}>
        <NeonHead s={s} idx={idx} size={66} align="center" width={1600} />
        <div style={{display: 'flex', gap: 60, marginTop: 70}}>
          {(s.imgs || []).map((im, i) => {
            const [t, ...rest] = (im.cap || '').split('\n');
            return (
              <div key={i} style={{display: 'flex', flexDirection: 'column', marginTop: i ? 50 : 0}}>
                <NeonPanel img={im} maxW={780} maxH={440} delay={10 + i * 8} dur={s.dur} />
                <div style={{marginTop: 26, fontFamily: FONT}}>
                  <div style={{fontWeight: 900, fontSize: 36, color: i ? N.cyan : N.violet}}>{t}</div>
                  <div style={{fontWeight: 600, fontSize: 26, color: N.mute, marginTop: 4}}>{rest.join(' ')}</div>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  } else if (s.kind === 'fan') {
    // Carousel: each theme takes the front in turn.
    const ims = s.imgs || []; const per = s.dur / ims.length;
    const cur = Math.min(ims.length - 1, Math.floor(f / per));
    body = (
      <AbsoluteFill style={{flexDirection: 'row', alignItems: 'center', padding: '0 0 0 110px'}}>
        <div style={{width: 640, flexShrink: 0}}><NeonHead s={s} idx={idx} /></div>
        <div style={{flex: 1, position: 'relative', height: 900}}>
          {ims.map((im, i) => {
            const rel = ((i - cur) + ims.length) % ims.length;
            const k = spring({frame: f - Math.floor(cur * per), fps, config: {damping: 18}});
            const pos = rel === 0 ? 0 : rel;
            const x = 120 + pos * 170 - (rel === 0 ? (1 - k) * -170 : 0), y = 170 - pos * 60;
            return (
              <div key={i} style={{position: 'absolute', left: x, top: y, zIndex: 10 - pos, opacity: pos === 0 ? 1 : 0.55 - pos * 0.12,
                transform: `scale(${1 - pos * 0.1})`, transformOrigin: 'left center', filter: pos ? 'blur(1.5px)' : 'none'}}>
                <div style={{borderRadius: 14, overflow: 'hidden', boxShadow: '0 0 0 1.5px rgba(124,109,255,.6), 0 40px 100px rgba(0,0,0,.8)'}}><Crop img={im} w={880} h={495} /></div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  } else if (s.kind === 'tiles' || s.kind === 'end') {
    const pulse = 0.5 + 0.5 * Math.sin(f / 9);
    body = (
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <div style={{position: 'relative', marginBottom: 40, transform: `scale(${spring({frame: f, fps, config: {damping: 12}})})`}}>
          <div style={{position: 'absolute', inset: -40, borderRadius: '50%', boxShadow: `0 0 ${60 + pulse * 40}px rgba(124,109,255,.7)`, border: '2px solid rgba(124,109,255,.5)'}} />
          <Img src={staticFile(B.logo)} style={{width: 120, height: 120, position: 'relative'}} />
        </div>
        <NeonHead s={s} idx={idx} size={60} align="center" width={1600} />
        <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 18, width: 1400, marginTop: 44}}>
          {(s.tiles || []).map((t, i) => {
            const k = spring({frame: f - 14 - i * 3, fps, config: {damping: 14}});
            return <div key={i} style={{padding: '18px 34px', borderRadius: 999, border: '1.5px solid rgba(94,234,212,.5)', background: 'rgba(94,234,212,.06)',
              fontFamily: FONT, fontWeight: 800, fontSize: 30, color: N.ink, opacity: k, transform: `translateY(${(1 - k) * 30}px)`}}>{t}</div>;
          })}
        </div>
        {s.footer ? <div style={{marginTop: 60, fontFamily: FONT, fontWeight: 900, fontSize: 44, color: N.cyan, textShadow: '0 0 30px rgba(94,234,212,.6)',
          opacity: interpolate(f, [30, 46], [0, 1], clamp)}}>{s.footer}</div> : null}
      </AbsoluteFill>
    );
  }
  return <AbsoluteFill><NeonBg />{body}</AbsoluteFill>;
};

// Diagonal light streak that hides each hard cut.
const Streak: React.FC<{at: number}> = ({at}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [at - 7, at + 7], [-0.4, 1.4], clamp);
  if (f < at - 7 || f > at + 7) return null;
  return <div style={{position: 'absolute', top: -300, bottom: -300, width: 420, left: `${p * 100}%`, transform: 'translateX(-50%) skewX(-18deg)',
    background: `linear-gradient(90deg, transparent, ${N.violet} 30%, #fff 50%, ${N.cyan} 70%, transparent)`, opacity: 0.95, filter: 'blur(6px)'}} />;
};

export const Neon: React.FC<{data: Data}> = ({data}) => {
  const f = useCurrentFrame();
  const starts = cuts(data.slides, 0); const total = neonDuration(data.slides);
  return (
    <BrandCtx.Provider value={brandOf(data)}><AbsoluteFill style={{background: N.bg}}>
      {data.slides.map((s, i) => <Sequence key={i} from={starts[i]} durationInFrames={s.dur}><NeonSlide s={s} idx={i} /></Sequence>)}
      {starts.slice(1).map((t) => <Streak key={t} at={t} />)}
      {starts.slice(1).map((t) => <Sequence key={`w${t}`} from={t - 6} durationInFrames={20}><Audio src={staticFile('sfx/whoosh_soft.wav')} volume={0.28} /></Sequence>)}
      <Sequence from={starts[starts.length - 1]} durationInFrames={40}><Audio src={staticFile('sfx/impact.wav')} volume={0.4} /></Sequence>
      <div style={{position: 'absolute', left: 0, bottom: 0, height: 5, width: `${(f / total) * 100}%`, background: `linear-gradient(90deg, ${N.violet}, ${N.cyan})`, boxShadow: `0 0 16px ${N.violet}`}} />
      {data.music ? <Audio src={staticFile(data.music)} loop volume={(fr) => interpolate(fr, [0, 15, total - 50, total], [0, 1, 1, 0], clamp)} /> : null}
    </AbsoluteFill></BrandCtx.Provider>
  );
};
export const neonDuration = (slides: Slide[]) => slides.reduce((a, s) => a + s.dur, 0);

/* ----------------------------------------------------------------- PAPER */
const P = {paper: '#f4efe4', ink: '#141414', mute: '#55524c', red: '#ff5a36', violet: '#6d5dfc', yellow: '#ffd23f', mint: '#7ee2c8'};
const HARD = (n = 10) => `${n}px ${n}px 0 ${P.ink}`;

const PaperBg: React.FC<{dark?: boolean}> = ({dark}) => (
  <AbsoluteFill style={{background: dark ? P.ink : P.paper}}>
    <AbsoluteFill style={{opacity: dark ? 0.08 : 0.5, backgroundImage: `radial-gradient(${dark ? '#fff' : '#d8d0bf'} 1.6px, transparent 1.6px)`, backgroundSize: '34px 34px'}} />
  </AbsoluteFill>
);

const PaperHead: React.FC<{s: Slide; idx: number; dark?: boolean; size?: number; align?: 'left' | 'center'; width?: number}> = ({s, idx, dark, size: base = 88, align = 'left', width = 700}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const lines = (s.head || '').split('\n');
  const size = fitSize(lines, base, width);
  const a = (i: number) => spring({frame: f - 6 - i * 5, fps, config: {damping: 13, stiffness: 140}});
  const ink = dark ? P.paper : P.ink;
  return (
    <div style={{fontFamily: FONT, textAlign: align}}>
      {s.kicker ? (
        <div style={{display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: '8px 18px', background: P.yellow, border: `3px solid ${P.ink}`,
          boxShadow: HARD(5), transform: `rotate(-2deg) scale(${a(0)})`, transformOrigin: 'left center'}}>
          <span style={{fontSize: 22, fontWeight: 900, color: P.ink}}>№{idx + 1}</span>
          <span style={{fontSize: 24, fontWeight: 800, color: P.ink, letterSpacing: /^[A-Z ]+$/.test(s.kicker) ? 2 : 0}}>{s.kicker}</span>
        </div>
      ) : null}
      {lines.map((l, i) => {
        const acc = l === s.accent;
        const hl = interpolate(f, [14 + i * 5, 30 + i * 5], [0, 1], {...clamp, easing: ease});
        return (
          <div key={i} style={{opacity: Math.min(1, a(i + 1) * 1.5), transform: `translateY(${(1 - a(i + 1)) * 40}px)`}}>
            <span style={{position: 'relative', display: 'inline-block', fontSize: size, fontWeight: 900, lineHeight: 1.34, whiteSpace: 'nowrap', color: ink}}>
              {acc ? <span style={{position: 'absolute', left: -10, right: -10, top: '52%', height: '36%', background: dark ? P.red : P.mint,
                transform: `scaleX(${hl}) rotate(-1deg)`, transformOrigin: 'left', zIndex: 0, borderRadius: 4}} /> : null}
              <span style={{position: 'relative'}}>{l}</span>
            </span>
          </div>
        );
      })}
      {s.sub ? <div style={{marginTop: 24, fontSize: 30, fontWeight: 600, lineHeight: 1.55, color: dark ? '#cfc8b8' : P.mute, maxWidth: 720,
        margin: align === 'center' ? '24px auto 0' : undefined, opacity: a(lines.length + 1)}}>{s.sub}</div> : null}
    </div>
  );
};

const Card: React.FC<{img: Img_; maxW: number; maxH: number; delay?: number; rot?: number; color?: string}> = ({img, maxW, maxH, delay = 8, rot = 2, color = P.violet}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const {w, h} = fit(img, maxW, maxH, useBrand());
  const k = spring({frame: f - delay, fps, config: {damping: 12, stiffness: 110}});
  return (
    <div style={{transform: `translateY(${(1 - k) * 500}px) rotate(${rot * k}deg)`, border: `4px solid ${P.ink}`, borderRadius: 14, overflow: 'hidden', background: P.ink,
      boxShadow: `14px 14px 0 ${color}, 14px 14px 0 4px ${P.ink}`}}>
      <div style={{height: 34, background: P.paper, borderBottom: `4px solid ${P.ink}`, display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 14}}>
        {[P.red, P.yellow, P.mint].map((c) => <div key={c} style={{width: 13, height: 13, borderRadius: 7, background: c, border: `2px solid ${P.ink}`}} />)}
      </div>
      <Crop img={img} w={w} h={h} />
    </div>
  );
};

const PaperSlide: React.FC<{s: Slide; idx: number; n: number}> = ({s, idx, n}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig(); const B = useBrand();
  const dark = s.kind === 'dark';
  const accents = [P.violet, P.red, P.mint, P.yellow];
  let body: React.ReactNode = null;
  if (s.kind === 'hero' || dark) {
    body = (
      <AbsoluteFill style={{flexDirection: 'row', alignItems: 'center', padding: '0 100px 0 120px', gap: 60}}>
        <div style={{width: 700, flexShrink: 0}}>
          {dark ? <div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 30}}>
            <div style={{background: P.paper, borderRadius: 12, padding: 6, border: `3px solid ${P.paper}`}}><Img src={staticFile(B.logo)} style={{width: 44, height: 44, display: 'block'}} /></div>
            <span style={{fontFamily: FONT, fontWeight: 900, fontSize: 34, color: P.paper}}>{B.name}</span></div> : null}
          <PaperHead s={s} idx={idx} dark={dark} size={dark ? 100 : 88} />
        </div>
        <div style={{flex: 1, display: 'flex', justifyContent: 'center'}}>{s.img ? <Card img={s.img} maxW={960} maxH={780} rot={idx % 2 ? 2 : -2} color={accents[idx % 4]} /> : null}</div>
      </AbsoluteFill>
    );
  } else if (s.kind === 'stats') {
    const fills = [P.yellow, P.violet, P.mint];
    body = (
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <PaperHead s={s} idx={idx} size={64} align="center" width={1600} />
        <div style={{display: 'flex', gap: 46, marginTop: 70}}>
          {(s.cards || []).map((c, i) => {
            const k = spring({frame: f - 12 - i * 6, fps, config: {damping: 11, stiffness: 120}});
            const shown = countUp(c.big, f, 12 + i * 6);
            return (
              <div key={i} style={{width: 420, height: 300, background: fills[i], border: `4px solid ${P.ink}`, borderRadius: 22, boxShadow: HARD(12),
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                transform: `rotate(${(i - 1) * 3 * k}deg) scale(${k})`}}>
                <div style={{fontFamily: FONT, fontWeight: 900, fontSize: shown.length > 4 ? 70 : 120, lineHeight: 1.1, color: i === 1 ? '#fff' : P.ink}}>{shown}</div>
                <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 27, marginTop: 10, lineHeight: 1.45, whiteSpace: 'pre-line', color: i === 1 ? '#fff' : P.ink}}>{c.small}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  } else if (s.kind === 'steps') {
    body = (
      <AbsoluteFill style={{alignItems: 'center', paddingTop: 100}}>
        <PaperHead s={s} idx={idx} size={66} align="center" width={1600} />
        <div style={{display: 'flex', gap: 40, marginTop: 70}}>
          {(s.imgs || []).map((im, i) => {
            const k = spring({frame: f - 12 - i * 8, fps, config: {damping: 12}});
            return (
              <div key={i} style={{width: 380, padding: 16, paddingBottom: 26, background: '#fff', border: `4px solid ${P.ink}`, borderRadius: 16, boxShadow: `10px 10px 0 ${accents[i]}, 10px 10px 0 4px ${P.ink}`,
                transform: `rotate(${(i % 2 ? 2 : -2) * k}deg) translateY(${(1 - k) * 300}px)`}}>
                <div style={{border: `3px solid ${P.ink}`, borderRadius: 8, overflow: 'hidden'}}><Crop img={im} w={342} h={214} /></div>
                <div style={{display: 'flex', alignItems: 'center', gap: 14, marginTop: 20}}>
                  <div style={{width: 50, height: 50, borderRadius: 25, background: P.ink, color: P.paper, fontFamily: FONT, fontWeight: 900, fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>{i + 1}</div>
                  <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 28, color: P.ink, lineHeight: 1.35}}>{im.cap}</div>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  } else if (s.kind === 'two') {
    body = (
      <AbsoluteFill style={{alignItems: 'center', paddingTop: 90}}>
        <PaperHead s={s} idx={idx} size={66} align="center" width={1600} />
        <div style={{display: 'flex', gap: 80, marginTop: 70}}>
          {(s.imgs || []).map((im, i) => {
            const [t, ...rest] = (im.cap || '').split('\n');
            return (
              <div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <Card img={im} maxW={740} maxH={420} delay={10 + i * 8} rot={i ? 2 : -2} color={i ? P.mint : P.violet} />
                <div style={{marginTop: 40, fontFamily: FONT, textAlign: 'center'}}>
                  <div style={{display: 'inline-block', fontWeight: 900, fontSize: 34, color: P.ink, background: i ? P.mint : P.yellow, border: `3px solid ${P.ink}`, padding: '4px 18px', borderRadius: 8}}>{t}</div>
                  <div style={{fontWeight: 700, fontSize: 27, color: P.mute, marginTop: 12}}>{rest.join(' ')}</div>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  } else if (s.kind === 'fan') {
    body = (
      <AbsoluteFill style={{flexDirection: 'row', alignItems: 'center', padding: '0 0 0 120px'}}>
        <div style={{width: 660, flexShrink: 0}}><PaperHead s={s} idx={idx} /></div>
        <div style={{flex: 1, position: 'relative', height: 860}}>
          {(s.imgs || []).map((im, i) => (
            <div key={i} style={{position: 'absolute', left: 40 + i * 140, top: 90 + i * 130}}>
              <Card img={im} maxW={760} maxH={430} delay={8 + i * 10} rot={(i - 1) * 5} color={accents[i]} />
            </div>
          ))}
        </div>
      </AbsoluteFill>
    );
  } else if (s.kind === 'tiles' || s.kind === 'end') {
    const fills = [P.yellow, P.mint, '#fff', P.violet];
    body = (
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <PaperHead s={s} idx={idx} size={72} align="center" width={1600} />
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 310px)', gap: 30, marginTop: 56}}>
          {(s.tiles || []).map((t, i) => {
            const k = spring({frame: f - 10 - i * 3, fps, config: {damping: 10, stiffness: 140}});
            const fill = fills[(i + Math.floor(i / 4)) % 4];
            return <div key={i} style={{height: 116, background: fill, border: `4px solid ${P.ink}`, borderRadius: 18, boxShadow: HARD(8),
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 31, color: fill === P.violet ? '#fff' : P.ink,
              transform: `rotate(${((i * 7) % 5 - 2) * k}deg) scale(${k})`}}>{t}</div>;
          })}
        </div>
        {s.footer ? (
          <div style={{position: 'absolute', bottom: 56, left: 120, right: 120, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: interpolate(f, [24, 40], [0, 1], clamp)}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 14}}><Img src={staticFile(B.logo)} style={{width: 56, height: 56}} /><span style={{fontFamily: FONT, fontWeight: 900, fontSize: 38, color: P.ink}}>{B.name}</span></div>
            <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 36, color: P.ink, background: P.yellow, border: `4px solid ${P.ink}`, padding: '8px 24px', borderRadius: 12, boxShadow: HARD(6)}}>{s.footer}</div>
          </div>
        ) : null}
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill>
      <PaperBg dark={dark} />
      <div style={{position: 'absolute', top: 44, right: 64, fontFamily: FONT, fontWeight: 900, fontSize: 24, color: dark ? P.paper : P.ink, opacity: 0.55}}>
        {String(idx + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</div>
      {body}
    </AbsoluteFill>
  );
};

const PUSH = 14;
// Page push: incoming slide slides in from the right while the outgoing one is pushed left.
const Pushed: React.FC<{s: Slide; idx: number; n: number; first: boolean; last: boolean}> = ({s, idx, n, first, last}) => {
  const f = useCurrentFrame();
  const inX = first ? 0 : interpolate(f, [0, PUSH], [100, 0], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const outX = last ? 0 : interpolate(f, [s.dur - PUSH, s.dur], [0, -100], {...clamp, easing: Easing.inOut(Easing.cubic)});
  return <AbsoluteFill style={{transform: `translateX(${inX + outX}%)`, boxShadow: '-20px 0 40px rgba(0,0,0,.25)'}}><PaperSlide s={s} idx={idx} n={n} /></AbsoluteFill>;
};

export const Paper: React.FC<{data: Data}> = ({data}) => {
  const starts = cuts(data.slides, PUSH); const total = paperDuration(data.slides);
  return (
    <BrandCtx.Provider value={brandOf(data)}><AbsoluteFill style={{background: P.paper}}>
      {data.slides.map((s, i) => <Sequence key={i} from={starts[i]} durationInFrames={s.dur}>
        <Pushed s={s} idx={i} n={data.slides.length} first={i === 0} last={i === data.slides.length - 1} /></Sequence>)}
      {starts.slice(1).map((t) => <Sequence key={`w${t}`} from={t} durationInFrames={20}><Audio src={staticFile('sfx/swipe.wav')} volume={0.22} /></Sequence>)}
      {data.music ? <Audio src={staticFile(data.music)} loop volume={(fr) => interpolate(fr, [0, 15, total - 50, total], [0, 1, 1, 0], clamp)} /> : null}
    </AbsoluteFill></BrandCtx.Provider>
  );
};
export const paperDuration = (slides: Slide[]) => slides.reduce((a, s) => a + s.dur - PUSH, 0) + PUSH;
