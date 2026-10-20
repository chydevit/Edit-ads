#!/usr/bin/env python3
"""Synthesize an original, royalty-free music bed (no samples, no licensing).

usage: music.py -o public/assets/bed.wav --dur 48 [--bpm 118] [--key A] [--mood tech|chill|hype]
                [--drop 12.5] [--outro 3]

Structure: filtered intro (pads only) → drums + bass + arp from --drop (default 2 bars in) → outro fade.
Kick sidechains pads/bass for the modern "pump". Minor i–VI–III–VII progression in --key.
Mix it low under speech (plan.music.vol 0.06–0.12) or ~0.25–0.35 for footage-free promos.
"""
import argparse, wave
import numpy as np

SR = 44100
NOTES = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def lowpass(x, cutoff):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (f / cutoff) ** 4)
    return np.fft.irfft(X, len(x))


def highpass(x, cutoff):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (cutoff / np.maximum(f, 1)) ** 4)
    return np.fft.irfft(X, len(x))


def saw(freq, n, detune=0.0, phase=0.0):
    t = np.arange(n) / SR
    return 2 * ((t * freq * (1 + detune) + phase) % 1) - 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("-o", "--out", required=True)
    ap.add_argument("--dur", type=float, required=True)
    ap.add_argument("--bpm", type=float, default=118)
    ap.add_argument("--key", default="A")
    ap.add_argument("--mood", choices=["tech", "chill", "hype"], default="tech")
    ap.add_argument("--drop", type=float, default=None, help="seconds where drums enter (default: after 2 bars)")
    ap.add_argument("--outro", type=float, default=3.0)
    a = ap.parse_args()

    rng = np.random.default_rng(3)
    beat = 60 / a.bpm
    bar = beat * 4
    N = int(a.dur * SR)
    out = np.zeros(N)
    root = 45 + NOTES[a.key.upper()]  # A2 = 45
    prog = [0, -4, 3, -2]  # i – VI – III – VII (minor)
    chord_q = {0: [0, 3, 7], -4: [0, 4, 7], 3: [0, 4, 7], -2: [0, 4, 7]}
    drop = a.drop if a.drop is not None else 2 * bar
    nbars = int(np.ceil(a.dur / bar))

    # ---- pads (detuned saws, low-passed, swell per bar)
    pad = np.zeros(N)
    for b in range(nbars):
        s0, s1 = int(b * bar * SR), min(N, int((b + 1) * bar * SR))
        if s0 >= N:
            break
        n = s1 - s0
        deg = prog[b % 4]
        env = np.minimum(1, np.arange(n) / (0.25 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.05 * SR))
        for iv in chord_q[deg]:
            m = root + 12 + deg + iv
            for d in (-0.004, 0.0, 0.005):
                pad[s0:s1] += saw(hz(m), n, d, rng.random()) * env * 0.09
    pad = lowpass(pad, 1400 if a.mood != "chill" else 900)
    # intro filter sweep: darker before the drop
    tt = np.arange(N) / SR
    pad_dark = lowpass(pad, 380)
    mixk = np.clip((tt - (drop - bar)) / bar, 0, 1)
    pad = pad_dark * (1 - mixk) + pad * mixk

    # ---- drums
    kick = np.zeros(N); snare = np.zeros(N); hats = np.zeros(N)
    kn = int(0.35 * SR); kt = np.arange(kn) / SR
    ksmp = np.sin(2 * np.pi * np.cumsum(50 + 110 * np.exp(-kt * 28)) / SR) * np.exp(-kt * 7)
    sn = int(0.22 * SR); st = np.arange(sn) / SR
    ssmp = highpass(rng.standard_normal(sn), 1200) * np.exp(-st * 22) * 0.5 + np.sin(2 * np.pi * 190 * st) * np.exp(-st * 30) * 0.3
    hn = int(0.05 * SR); ht = np.arange(hn) / SR
    hsmp = highpass(rng.standard_normal(hn), 7000) * np.exp(-ht * 90) * 0.35
    side = np.ones(N)
    steps = int(a.dur / (beat / 4))
    for i in range(steps):
        t0 = i * beat / 4
        if t0 < drop or t0 > a.dur - a.outro * 0.6:
            continue
        p = int(t0 * SR)
        q = i % 16
        if q % 4 == 0 and not (a.mood == "chill" and q % 8 == 4):
            kick[p:p + kn] += ksmp[: max(0, min(kn, N - p))]
            dk = int(0.18 * SR)
            side[p:p + dk] = np.minimum(side[p:p + dk], 0.35 + 0.65 * (np.arange(min(dk, N - p)) / dk) ** 0.7)
        if q in (4, 12):
            snare[p:p + sn] += ssmp[: max(0, min(sn, N - p))]
        if (a.mood == "hype" or q % 2 == 0) and q % 4 != 0:
            hats[p:p + hn] += hsmp[: max(0, min(hn, N - p))] * (0.7 if q % 2 else 1)

    # ---- bass (eighths on chord root, after drop)
    bass = np.zeros(N)
    for i in range(int(a.dur / (beat / 2))):
        t0 = i * beat / 2
        if t0 < drop or t0 > a.dur - a.outro * 0.5:
            continue
        b = int(t0 / bar)
        m = root + prog[b % 4] - 12 + 12
        n = int(beat / 2 * 0.9 * SR)
        p = int(t0 * SR)
        n = min(n, N - p)
        if n <= 0:
            break
        tn = np.arange(n) / SR
        bass[p:p + n] += (np.sin(2 * np.pi * hz(m) * tn) * 0.6 + saw(hz(m), n) * 0.15) * np.exp(-tn * 3) * 0.55
    bass = lowpass(bass, 500)

    # ---- arp pluck (16ths, chord tones, every bar after drop + 2 bars)
    arp = np.zeros(N)
    for i in range(int(a.dur / (beat / 4))):
        t0 = i * beat / 4
        if t0 < drop + 2 * bar or t0 > a.dur - a.outro:
            continue
        b = int(t0 / bar)
        deg = prog[b % 4]
        tones = [root + 24 + deg + iv for iv in chord_q[deg]] + [root + 36 + deg]
        m = tones[[0, 1, 2, 3, 2, 1][i % 6]]
        n = int(0.18 * SR); p = int(t0 * SR); n = min(n, N - p)
        tn = np.arange(n) / SR
        arp[p:p + n] += (saw(hz(m), n) * 0.5 + np.sin(2 * np.pi * hz(m) * tn) * 0.5) * np.exp(-tn * 18) * 0.12
    arp = lowpass(arp, 3200)

    mix = (pad * 0.9 + bass) * side + kick * 0.9 + snare * 0.55 + hats * 0.5 + arp * side
    # outro fade + tiny fade-in
    fade = np.clip((a.dur - tt) / a.outro, 0, 1) ** 1.5 * np.clip(tt / 0.3, 0, 1)
    mix *= fade
    mix /= np.max(np.abs(mix)) + 1e-9
    mix = np.tanh(mix * 1.4) / np.tanh(1.4) * 0.9  # gentle glue/saturation
    with wave.open(a.out, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((mix * 32767).astype(np.int16).tobytes())
    print(f"{a.dur:.1f}s {a.bpm:.0f} bpm {a.key} minor ({a.mood}) → {a.out}")


if __name__ == "__main__":
    main()
