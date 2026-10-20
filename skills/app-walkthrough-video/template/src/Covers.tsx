// Still images: YouTube thumbnail, part covers, 9:16 cover and the in-video part title card.
// Rendered with `remotion still` by covers.py / split_parts.py. Gradient text is avoided on purpose
// (background-clip:text renders unreliably), so the accent line is a solid accent colour.
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {loadFont} from '@remotion/fonts';
import type {Brand} from './Main';

loadFont({family: 'Montserrat', url: staticFile('fonts/Montserrat.ttf'), weight: '100 900'});
loadFont({family: 'Noto Sans Khmer', url: staticFile('fonts/NotoSansKhmer.ttf'), weight: '100 900'});
const FONT = "Montserrat, 'Noto Sans Khmer', system-ui, sans-serif";
const rgba = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
const DEF: Brand = {name: 'App', url: '', accent: ['#7c5cff', '#22d3ee']};
const isLatin = (s: string) => !/[ក-៿฀-๿一-鿿]/.test(s);

export type CoverProps = {brand?: Brand; img?: string; lines?: string[]; sub?: string; badge?: string; lang?: string};
export type PartCardProps = {brand?: Brand; part: number; of: number; titles: string[]; word?: string; lang?: string};

const Glow: React.FC<{b: Brand; strong?: boolean}> = ({b, strong}) => (
  <AbsoluteFill style={{background: '#07070b'}}>
    <AbsoluteFill style={{background: `radial-gradient(60% 70% at 18% 12%, ${rgba(b.accent[0], strong ? 0.55 : 0.45)}, transparent 60%),
      radial-gradient(60% 70% at 92% 95%, ${rgba(b.accent[1], strong ? 0.35 : 0.3)}, transparent 60%)`}} />
  </AbsoluteFill>
);
const Logo: React.FC<{b: Brand; size: number}> = ({b, size}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: size * 0.25}}>
    <Img src={staticFile('logo.png')} style={{width: size, height: size}} />
    <span style={{fontFamily: FONT, fontWeight: 800, fontSize: size * 0.78, color: '#fff'}}>{b.name}</span>
  </div>
);

// 1280×720: tilted screenshot left, logo + 2-line title right. Used for the thumbnail and part covers.
export const Cover: React.FC<CoverProps> = ({brand, img, lines = [], sub, badge}) => {
  const b = {...DEF, ...(brand || {})};
  const latin = lines.every(isLatin);
  return (
    <AbsoluteFill style={{fontFamily: FONT, color: '#fff', overflow: 'hidden'}}>
      <Glow b={b} />
      {img ? <Img src={staticFile(img)} style={{position: 'absolute', left: -60, top: 120, width: 790, borderRadius: 18,
        transform: 'perspective(1400px) rotateY(17deg) rotateX(4deg)', boxShadow: '0 30px 90px rgba(0,0,0,.75)', border: '2px solid rgba(255,255,255,.14)'}} /> : null}
      <div style={{position: 'absolute', left: 740, top: latin ? 110 : 92, width: 500}}>
        <Logo b={b} size={60} />
        {badge ? <div style={{display: 'inline-block', marginTop: 24, padding: '7px 16px', borderRadius: 10, background: `linear-gradient(90deg,${b.accent[0]},${b.accent[1]})`, fontWeight: 800, fontSize: 26}}>{badge}</div> : null}
        <div style={{fontSize: latin ? 80 : 74, fontWeight: 900, lineHeight: latin ? 1.0 : 1.3, marginTop: badge ? 18 : 28}}>
          {lines.map((l, i) => <div key={i} style={{color: i === lines.length - 1 && lines.length > 1 ? b.accent[1] : '#fff'}}>{l}</div>)}
        </div>
        {sub ? <div style={{fontSize: 25, fontWeight: 700, marginTop: 22, color: '#cbd5e1', lineHeight: 1.45}}>{sub}</div> : null}
      </div>
    </AbsoluteFill>
  );
};

// 1080×1920 cover for Shorts / Reels / TikTok.
export const VerticalCover: React.FC<CoverProps> = ({brand, img, lines = [], sub}) => {
  const b = {...DEF, ...(brand || {})};
  const latin = lines.every(isLatin);
  return (
    <AbsoluteFill style={{fontFamily: FONT, color: '#fff', overflow: 'hidden'}}>
      <Glow b={b} strong />
      <div style={{position: 'absolute', top: 190, left: 0, right: 0, textAlign: 'center'}}>
        <div style={{display: 'inline-flex'}}><Logo b={b} size={96} /></div>
        <div style={{fontSize: latin ? 118 : 104, fontWeight: 900, lineHeight: latin ? 1.0 : 1.3, marginTop: 60, padding: '0 60px'}}>
          {lines.map((l, i) => <div key={i} style={{color: i === lines.length - 1 && lines.length > 1 ? b.accent[1] : '#fff'}}>{l}</div>)}
        </div>
      </div>
      {img ? <Img src={staticFile(img)} style={{position: 'absolute', left: 60, top: 900, width: 960, borderRadius: 26, boxShadow: '0 40px 100px rgba(0,0,0,.75)',
        border: '3px solid rgba(255,255,255,.14)', transform: 'rotate(-3deg)'}} /> : null}
      {sub ? <div style={{position: 'absolute', bottom: 200, left: 40, right: 40, textAlign: 'center', fontSize: 46, fontWeight: 800, color: '#e2e8f0', lineHeight: 1.4, whiteSpace: 'pre-line'}}>{sub}</div> : null}
    </AbsoluteFill>
  );
};

// 1920×1080 title card that opens each part of a series.
export const PartCard: React.FC<PartCardProps> = ({brand, part, of, titles, word = 'PART'}) => {
  const b = {...DEF, ...(brand || {})};
  const shown = titles.length > 3 ? [titles[0], titles[titles.length - 1]] : titles;
  return (
    <AbsoluteFill style={{fontFamily: FONT, color: '#fff'}}>
      <Glow b={b} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
        <Logo b={b} size={96} />
        <div style={{fontSize: 44, fontWeight: 800, color: b.accent[0], marginTop: 34}}>{word} {part} / {of}</div>
        <div style={{fontSize: shown.join('').length > 60 ? 66 : 84, fontWeight: 800, lineHeight: 1.3, marginTop: 18, maxWidth: 1650}}>
          {shown.map((t, i) => <div key={i}>{t}</div>)}
        </div>
        <div style={{display: 'flex', gap: 16, marginTop: 46}}>
          {Array.from({length: of}).map((_, k) => <div key={k} style={{width: 120, height: 10, borderRadius: 5,
            background: k < part ? `linear-gradient(90deg,${b.accent[0]},${b.accent[1]})` : 'rgba(255,255,255,.18)'}} />)}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
