import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {loadFont} from '@remotion/fonts';
import {BrandCtx, brandOf, useBrand, FilmData} from './Brand';

loadFont({family: 'Kantumruy Pro', url: staticFile('fonts/KantumruyPro.ttf'), weight: '100 900'});
loadFont({family: 'Montserrat', url: staticFile('fonts/Montserrat.ttf'), weight: '100 900'});
const FONT = "Montserrat, 'Kantumruy Pro', system-ui, sans-serif";
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const VIOLET = '#6d5dfc', CYAN = '#0ea5b7', INK = '#14121f', MUTED = '#5b5870';

type Img_ = {src: string; crop?: number[]};
export type Slide = {
  kind: 'hero' | 'dark' | 'stats' | 'steps' | 'two' | 'fan' | 'tiles' | 'end';
  dur: number; kicker?: string; head?: string; accent?: string; sub?: string;
  img?: Img_; imgs?: (Img_ & {cap?: string})[]; cards?: {big: string; small: string}[];
  tiles?: string[]; footer?: string;
};

const LightBg: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#f7f6fd'}}>
      <AbsoluteFill style={{background: `radial-gradient(1000px 700px at ${18 + Math.sin(f / 80) * 3}% 12%, rgba(109,93,252,.14), transparent 60%),
        radial-gradient(900px 700px at ${88 + Math.cos(f / 90) * 3}% 92%, rgba(14,165,183,.13), transparent 60%)`}} />
    </AbsoluteFill>
  );
};
const DarkBg: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: 'linear-gradient(135deg, #120f2a 0%, #0b0a17 55%, #0a1a22 100%)'}}>
      <AbsoluteFill style={{background: `radial-gradient(900px 650px at ${22 + Math.sin(f / 70) * 4}% 20%, rgba(109,93,252,.40), transparent 60%),
        radial-gradient(800px 650px at 85% 90%, rgba(34,211,238,.22), transparent 60%)`}} />
    </AbsoluteFill>
  );
};

// Screenshot (optionally cropped) in a floating window frame.
const Shot: React.FC<{img: Img_; width: number; tilt?: number; delay?: number; dark?: boolean; drift?: boolean}> = ({img, width, tilt = -10, delay = 6, dark, drift = true}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig(); const B = useBrand();
  const [x, y, w, h] = img.crop || [0, 0, B.shotW, B.shotH];
  const height = (width * h) / w;
  const k = spring({frame: f - delay, fps, config: {damping: 20, stiffness: 90}});
  const d = drift ? Math.sin(f / 60) * 6 : 0;
  return (
    <div style={{width, transform: `perspective(1800px) rotateY(${tilt * (0.6 + 0.4 * k)}deg) rotateX(${3 * k}deg) translateX(${(1 - k) * 160}px) translateY(${d}px)`,
      opacity: k, borderRadius: 18, overflow: 'hidden', background: '#0b0b10',
      boxShadow: dark ? '0 40px 120px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.12)' : '0 40px 90px rgba(40,30,110,.28), 0 0 0 1px rgba(20,18,31,.08)'}}>
      <div style={{height: 30, background: '#16151f', display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 14}}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => <div key={c} style={{width: 11, height: 11, borderRadius: 6, background: c}} />)}
      </div>
      <div style={{position: 'relative', width, height, overflow: 'hidden'}}>
        <Img src={staticFile(`shots/${img.src}.png`)} style={{position: 'absolute', width: (width * B.shotW) / w, left: (-x * width) / w, top: (-y * width) / w}} />
      </div>
    </div>
  );
};

const Text: React.FC<{s: Slide; dark?: boolean; align?: 'left' | 'center'; size?: number}> = ({s, dark, align = 'left', size = 84}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const lines = (s.head || '').split('\n');
  const a = (i: number) => spring({frame: f - 4 - i * 5, fps, config: {damping: 18, stiffness: 120}});
  return (
    <div style={{textAlign: align, fontFamily: FONT}}>
      {s.kicker ? <div style={{fontSize: 26, fontWeight: 800, letterSpacing: /^[A-Z ]+$/.test(s.kicker) ? 3 : 0, color: dark ? '#a5b4fc' : VIOLET, marginBottom: 16, opacity: a(0)}}>{s.kicker}</div> : null}
      {lines.map((l, i) => (
        <div key={i} style={{fontSize: size, fontWeight: 800, lineHeight: 1.34, color: l === s.accent ? (dark ? '#67e8f9' : VIOLET) : dark ? '#fff' : INK,
          opacity: a(i + 1), transform: `translateY(${(1 - a(i + 1)) * 34}px)`}}>{l}</div>
      ))}
      {s.sub ? <div style={{fontSize: 30, fontWeight: 600, lineHeight: 1.55, color: dark ? '#cbd5e1' : MUTED, marginTop: 22, maxWidth: 760, marginLeft: align === 'center' ? 'auto' : 0, marginRight: align === 'center' ? 'auto' : 0,
        opacity: a(lines.length + 1)}}>{s.sub}</div> : null}
    </div>
  );
};

const SlideView: React.FC<{s: Slide}> = ({s}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig(); const B = useBrand();
  const dark = s.kind === 'dark';
  const inO = interpolate(f, [0, 10], [0, 1], {extrapolateRight: 'clamp'});
  const outO = interpolate(f, [s.dur - 10, s.dur], [1, 0], {extrapolateLeft: 'clamp'});
  let body: React.ReactNode = null;
  if (s.kind === 'hero' || s.kind === 'dark') {
    body = (
      <AbsoluteFill style={{flexDirection: 'row', alignItems: 'center', padding: '0 0 0 120px'}}>
        <div style={{width: 760, flexShrink: 0}}>
          {dark ? <div style={{display: 'inline-flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,.95)', borderRadius: 14, padding: '10px 18px', marginBottom: 30}}>
            <Img src={staticFile(B.logo)} style={{width: 40, height: 40}} /><span style={{fontFamily: FONT, fontWeight: 800, fontSize: 28, color: INK}}>{B.name}</span></div> : null}
          <Text s={s} dark={dark} />
        </div>
        <div style={{flex: 1, display: 'flex', justifyContent: 'center'}}>{s.img ? <Shot img={s.img} width={s.img.crop && s.img.crop[2] / s.img.crop[3] < 1 ? Math.min(560, (840 * s.img.crop[2]) / s.img.crop[3]) : 920} dark={dark} /> : null}</div>
      </AbsoluteFill>
    );
  } else if (s.kind === 'stats') {
    body = (
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 70}}>
        <Text s={s} align="center" size={64} />
        <div style={{display: 'flex', gap: 40}}>
          {(s.cards || []).map((c, i) => {
            const k = spring({frame: f - 14 - i * 6, fps, config: {damping: 14, stiffness: 110}});
            const num = c.big.match(/^(\d+)(.*)$/);
            const shown = num ? `${Math.round(Number(num[1]) * interpolate(f, [14 + i * 6, 44 + i * 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease}))}${num[2]}` : c.big;
            return (
              <div key={i} style={{width: 400, height: 300, borderRadius: 30, padding: 34, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center',
                background: i === 1 ? 'linear-gradient(160deg,#7c6dff,#4f46e5)' : 'linear-gradient(160deg,#1f1b3d,#14122a)', boxShadow: '0 30px 70px rgba(40,30,110,.3)',
                transform: `translateY(${(1 - k) * 60}px) scale(${0.9 + 0.1 * k})`, opacity: k}}>
                <div style={{fontFamily: FONT, fontWeight: 900, fontSize: shown.length > 4 ? 64 : 104, color: i === 1 ? '#fff' : '#a5f3fc'}}>{shown}</div>
                <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 28, color: '#e0e7ff', marginTop: 8, lineHeight: 1.45, whiteSpace: 'pre-line'}}>{c.small}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  } else if (s.kind === 'steps') {
    body = (
      <AbsoluteFill style={{alignItems: 'center', paddingTop: 90}}>
        <Text s={s} align="center" size={64} />
        <div style={{display: 'flex', gap: 36, marginTop: 60}}>
          {(s.imgs || []).map((im, i) => {
            const k = spring({frame: f - 12 - i * 8, fps, config: {damping: 16}});
            return (
              <div key={i} style={{width: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: k, transform: `translateY(${(1 - k) * 50}px)`}}>
                <Shot img={im} width={380} tilt={0} delay={12 + i * 8} drift={false} />
                <div style={{marginTop: 26, width: 52, height: 52, borderRadius: 26, background: VIOLET, color: '#fff', fontFamily: FONT, fontWeight: 800, fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{i + 1}</div>
                <div style={{marginTop: 14, fontFamily: FONT, fontWeight: 800, fontSize: 30, color: INK, textAlign: 'center', lineHeight: 1.4}}>{im.cap}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  } else if (s.kind === 'two') {
    body = (
      <AbsoluteFill style={{alignItems: 'center', paddingTop: 100}}>
        <Text s={s} align="center" size={64} />
        <div style={{display: 'flex', gap: 70, marginTop: 70}}>
          {(s.imgs || []).map((im, i) => (
            <div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
              <Shot img={im} width={760} tilt={i === 0 ? 8 : -8} delay={10 + i * 8} />
              <div style={{marginTop: 30, fontFamily: FONT, fontWeight: 800, fontSize: 32, color: INK, lineHeight: 1.4, textAlign: 'center', whiteSpace: 'pre-line'}}>{im.cap}</div>
            </div>
          ))}
        </div>
      </AbsoluteFill>
    );
  } else if (s.kind === 'fan') {
    body = (
      <AbsoluteFill style={{flexDirection: 'row', alignItems: 'center', padding: '0 0 0 120px'}}>
        <div style={{width: 700, flexShrink: 0}}><Text s={s} /></div>
        <div style={{flex: 1, position: 'relative', height: 800}}>
          {(s.imgs || []).map((im, i) => {
            const k = spring({frame: f - 8 - i * 7, fps, config: {damping: 16}});
            return (
              <div key={i} style={{position: 'absolute', left: 60 + i * 150, top: 110 + i * 120, transform: `rotate(${(i - 1) * 5 * k}deg)`, opacity: k}}>
                <Shot img={im} width={720} tilt={0} delay={8 + i * 7} drift={false} />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  } else if (s.kind === 'tiles' || s.kind === 'end') {
    body = (
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <Text s={s} align="center" size={68} />
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 300px)', gap: 26, marginTop: 56}}>
          {(s.tiles || []).map((t, i) => {
            const k = spring({frame: f - 10 - i * 3, fps, config: {damping: 15}});
            return (
              <div key={i} style={{height: 120, borderRadius: 22, background: '#fff', boxShadow: '0 14px 36px rgba(40,30,110,.14)', border: '1px solid rgba(20,18,31,.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 800, fontSize: 32, color: INK, opacity: k, transform: `scale(${0.85 + 0.15 * k})`}}>{t}</div>
            );
          })}
        </div>
        {s.footer ? (
          <div style={{position: 'absolute', bottom: 60, left: 120, right: 120, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: interpolate(f, [20, 40], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 14}}><Img src={staticFile(B.logo)} style={{width: 54, height: 54}} /><span style={{fontFamily: FONT, fontWeight: 800, fontSize: 36, color: INK}}>{B.name}</span></div>
            <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 36, color: VIOLET}}>{s.footer}</div>
          </div>
        ) : null}
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{opacity: Math.min(inO, outO)}}>
      {dark ? <DarkBg /> : <LightBg />}
      {body}
    </AbsoluteFill>
  );
};

export const Product: React.FC<{data: FilmData}> = ({data}) => {
  let at = 0;
  return (
    <BrandCtx.Provider value={brandOf(data)}><AbsoluteFill style={{background: '#f7f6fd'}}>
      {data.slides.map((s, i) => {
        const from = at; at += s.dur - 8;
        return <Sequence key={i} from={from} durationInFrames={s.dur}><SlideView s={s} /></Sequence>;
      })}
      {data.music ? <Audio src={staticFile(data.music)} loop volume={(fr) => interpolate(fr, [0, 20, at - 60, at], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})} /> : null}
    </AbsoluteFill></BrandCtx.Provider>
  );
};
export const productDuration = (slides: Slide[]) => slides.reduce((a, s) => a + s.dur - 8, 0) + 8;
