#!/usr/bin/env python3
"""Synthesize the SFX pack used by the overlay components (no licensing issues).

usage: sfx.py <out_dir>
Writes: whoosh whoosh_soft pop ding tick typing send swipe impact click card_in row_pop check_1..6 complete (.wav, 48 kHz mono)
"""
import sys, wave
from pathlib import Path
import numpy as np

SR = 48000
rng = np.random.default_rng(7)


def t(d):
    return np.arange(int(SR * d)) / SR


def env(n, a=0.005, r=0.1, shape=2.0):
    x = np.arange(n) / SR
    e = np.minimum(1, x / max(a, 1e-4)) * np.exp(-np.maximum(0, x - a) / max(r, 1e-4) * shape)
    return e


def bandnoise(d, lo, hi, sweep=None):
    n = int(SR * d)
    spec = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    spec[(f < lo) | (f > hi)] = 0
    x = np.fft.irfft(spec, n)
    return x / (np.abs(x).max() + 1e-9)


def whoosh(d=0.45, lo=300, hi=6000, gain=0.9):
    n = int(SR * d)
    x = bandnoise(d, lo, hi)
    # moving resonant feel: amplitude bell + simple one-pole lowpass sweep
    bell = np.sin(np.pi * np.linspace(0, 1, n)) ** 1.6
    y = np.zeros(n)
    a = np.linspace(0.04, 0.5, n) ** 1.2
    acc = 0.0
    for i in range(n):
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    y = y / (np.abs(y).max() + 1e-9)
    return y * bell * gain


def pop():
    x = t(0.12)
    f = 900 * np.exp(-x * 30) + 300
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(x), 0.002, 0.03)
    return y * 0.9


def ding():
    x = t(0.9)
    y = sum(np.sin(2 * np.pi * fr * x) * g for fr, g in ((1568, 1), (2349, 0.5), (3136, 0.25)))
    return y / 1.75 * env(len(x), 0.003, 0.25, 1.5) * 0.8


def tick():
    x = t(0.05)
    return np.sin(2 * np.pi * 2200 * x) * env(len(x), 0.001, 0.01) * 0.8


def key():
    x = t(0.04)
    return (bandnoise(0.04, 1500, 8000) * 0.7 + np.sin(2 * np.pi * 180 * x) * 0.3) * env(len(x), 0.001, 0.012)


def typing(d=2.0):
    out = np.zeros(int(SR * d))
    pos = 0.0
    while pos < d - 0.05:
        k = key() * rng.uniform(0.5, 1.0)
        i = int(pos * SR)
        out[i : i + len(k)] += k[: len(out) - i]
        pos += rng.uniform(0.06, 0.14)
    return out * 0.8


def send():
    x = t(0.25)
    f = 600 + 1400 * (x / x[-1])
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(x), 0.005, 0.08) * 0.6 + np.pad(ding()[: int(SR * 0.25)], (0, 0)) * 0.3


def swipe():
    return whoosh(0.25, 1500, 9000, 0.6)


def impact():
    x = t(0.6)
    f = 120 * np.exp(-x * 6) + 40
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(x), 0.002, 0.2)
    crack = bandnoise(0.6, 200, 4000) * env(len(x), 0.001, 0.03)
    return (boom * 0.9 + crack * 0.4) * 0.9


def click():
    x = t(0.06)
    return (bandnoise(0.06, 2000, 10000) * 0.6 + np.sin(2 * np.pi * 1200 * x) * 0.4) * env(len(x), 0.0005, 0.008)


def check(semitones=0):
    """Short bright tick; pitched up per checklist row (major scale)."""
    x = t(0.12)
    f0 = 1800 * 2 ** (semitones / 12)
    body = np.sin(2 * np.pi * f0 * x) * 0.7 + np.sin(2 * np.pi * f0 * 2 * x) * 0.25
    y = body * env(len(x), 0.001, 0.035)
    c = click()
    y[: len(c)] += c * 0.3  # transient on top for a crisp attack
    return y * 0.8


def write(path, y):
    y = np.clip(y, -1, 1)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((y * 32767 * 0.9).astype(np.int16).tobytes())


def main():
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "sfx")
    out.mkdir(parents=True, exist_ok=True)
    bank = {
        "whoosh": whoosh(),
        "whoosh_soft": whoosh(0.35, 400, 4000, 0.55),
        "pop": pop(),
        "ding": ding(),
        "tick": tick(),
        "typing": typing(),
        "send": send(),
        "swipe": swipe(),
        "impact": impact(),
        "click": click(),
        "card_in": whoosh(0.3, 800, 7000, 0.6),
        "row_pop": pop(),
        "complete": ding(),
        **{f"check_{i + 1}": check(st) for i, st in enumerate((0, 2, 4, 5, 7, 9))},
    }
    for k, v in bank.items():
        write(out / f"{k}.wav", v)
    print(f"wrote {len(bank)} sfx to {out}")


if __name__ == "__main__":
    main()
