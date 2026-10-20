import React from 'react';
import {AbsoluteFill, Audio, Freeze, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import type {Timeline, Brand} from './Main';

const FONT = "Montserrat, 'Noto Sans Khmer', system-ui, sans-serif";
const rgba = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
const ease = Easing.bezier(0.45, 0, 0.2, 1);

// Square window into the 1920x1080 source that pans to the active click/focus target.
function squareCam(frame: number, zooms: any[] = []) {
  let cx = 960, cy = 540, s = 1;
  for (const z of zooms) {
    const k = Math.min(
      interpolate(frame, [z.t0, z.t0 + 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease}),
      interpolate(frame, [z.t1 - 12, z.t1], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease}));
    if (k > 0) { cx = 960 + (z.cx - 960) * k; cy = 540 + (z.cy - 540) * k; s = 1 + (Math.min(z.scale, 1.35) - 1) * k; }
  }
  const half = 540 / s;
  cx = Math.min(1920 - half, Math.max(half, cx)); cy = Math.min(1080 - half, Math.max(half, cy));
  return {scale: s, tx: 540 - cx * s, ty: 540 - cy * s};
}

const VClip: React.FC<{seg: any}> = ({seg}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const cam = squareCam(f, seg.zooms);
  const from = Math.round((seg.srcFrom || 0) * fps);
  const video = seg.freeze
    ? <Freeze frame={0}><OffthreadVideo src={staticFile(seg.src)} startFrom={from} muted /></Freeze>
    : <OffthreadVideo src={staticFile(seg.src)} startFrom={from} playbackRate={seg.rate || 1} muted />;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1080, overflow: 'hidden', background: '#0a0a0a'}}>
      <div style={{position: 'absolute', width: 1920, height: 1080, transformOrigin: '0 0', transform: `translate(${cam.tx}px,${cam.ty}px) scale(${cam.scale})`}}>{video}</div>
      {seg.badge ? <div style={{position: 'absolute', right: 30, top: 30, fontFamily: FONT, fontWeight: 800, fontSize: 40, color: '#fff', background: 'rgba(12,12,16,.85)', padding: '8px 18px', borderRadius: 14}}>⏩ {seg.badge}</div> : null}
    </div>
  );
};

export const Vertical: React.FC<{timeline: Timeline & {captions: any[]; titles: any[]}}> = ({timeline}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const B: Brand = {name: 'App', url: '', accent: ['#7c5cff', '#22d3ee'], ...((timeline as any).brand || {})};
  const title = [...timeline.titles].reverse().find((t: any) => f >= t.start);
  const cap = timeline.captions.find((c: any) => f >= c.start && f < c.end);
  const tk = title ? spring({frame: f - title.start, fps, config: {damping: 18}}) : 0;
  return (
    <AbsoluteFill style={{background: '#07070b'}}>
      <AbsoluteFill style={{background: `radial-gradient(900px 700px at 20% 10%, ${rgba(B.accent[0], 0.35)}, transparent 60%), radial-gradient(800px 700px at 85% 95%, ${rgba(B.accent[1], 0.25)}, transparent 60%)`}} />
      <div style={{position: 'absolute', top: 120, left: 0, right: 0, textAlign: 'center', fontFamily: FONT, color: '#fff'}}>
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18}}>
          <Img src={staticFile('logo.png')} style={{width: 74, height: 74}} />
          <div style={{fontSize: 58, fontWeight: 800}}>{B.name}</div>
        </div>
        {title ? <div style={{fontSize: 64, fontWeight: 800, marginTop: 34, padding: '0 60px', lineHeight: 1.3, opacity: tk, transform: `translateY(${(1 - tk) * 20}px)`}}>{title.text}</div> : null}
      </div>
      <div style={{position: 'absolute', left: 0, top: 470, width: 1080, height: 1080}}>
        {timeline.segments.map((seg: any, i: number) => (
          <Sequence key={i} from={seg.start} durationInFrames={seg.dur}>
            {seg.kind === 'clip' ? <VClip seg={seg} /> : null}
          </Sequence>
        ))}
      </div>
      {cap ? (() => {
        const k = spring({frame: f - cap.start, fps, config: {damping: 16, stiffness: 180}});
        const prog = interpolate(f, [cap.start, cap.end - 3], [0, 100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        return (
          <div style={{position: 'absolute', left: 50, right: 50, top: 1590, display: 'flex', justifyContent: 'center'}}>
            <div style={{padding: '14px 30px 18px', borderRadius: 24, background: 'rgba(8,8,12,.72)', border: '1px solid rgba(255,255,255,.1)',
              transform: `translateY(${(1 - k) * 30}px) scale(${0.92 + 0.08 * k})`, opacity: k, textAlign: 'center'}}>
              <div style={{position: 'relative', fontFamily: FONT, fontWeight: 800, fontSize: 58, lineHeight: 1.45, textShadow: '0 3px 8px rgba(0,0,0,.6)'}}>
                <div style={{color: 'rgba(255,255,255,.55)'}}>{cap.text}</div>
                <div style={{position: 'absolute', inset: 0, color: '#fff', clipPath: `inset(0 ${100 - prog}% 0 0)`}}>{cap.text}</div>
              </div>
            </div>
          </div>
        );
      })() : null}
      {(timeline as any).sfx?.map((x: any, i: number) => <Sequence key={'s' + i} from={x.at} durationInFrames={45} layout="none"><Audio src={staticFile(`sfx/${x.name}.wav`)} volume={x.vol ?? 0.3} /></Sequence>)}
      {timeline.audio.map((a: any, i: number) => <Sequence key={'a' + i} from={a.start}><Audio src={staticFile(a.src)} /></Sequence>)}
      {timeline.music ? <Audio src={staticFile(timeline.music.src)} loop volume={(fr) => (timeline.music!.duck.some(([a, b]) => fr >= a - 6 && fr <= b + 10) ? 0.2 : 0.5)} /> : null}
    </AbsoluteFill>
  );
};
