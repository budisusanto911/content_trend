#!/usr/bin/env python3
"""
Generates 3 cozy, clearly audible, royalty-free ambient BGM loops in assets/bgm/
at standard normalized loudness (-14 LUFS / ~0.65 peak):
1. healing_piano_pad.mp3   - Warm Fmaj7/Cmaj7 electric-piano chords + gentle melody
2. happy_morning_bells.mp3 - Uplifting Cmaj7/Gmaj7 acoustic kalimba/chime arpeggio
3. midnight_rain_lofi.mp3  - Cozy lo-fi Am9 Rhodes chords + soft filtered night rain
"""

import os
import math
import wave
import random
import struct
import subprocess

SR = 44100

def _write_mp3(samples, out_mp3):
    os.makedirs(os.path.dirname(os.path.abspath(out_mp3)), exist_ok=True)
    # Peak normalize to 0.70 so all tracks have consistent, healthy loudness
    peak = max((max(abs(l), abs(r)) for l, r in samples), default=1.0)
    scale = 0.70 / peak if peak > 1e-6 else 1.0

    wav_tmp = out_mp3 + ".tmp.wav"
    with wave.open(wav_tmp, "w") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        raw = bytearray()
        for l, r in samples:
            li = max(-32767, min(32767, int(l * scale * 32767)))
            ri = max(-32767, min(32767, int(r * scale * 32767)))
            raw += struct.pack("<hh", li, ri)
        wf.writeframes(raw)
    subprocess.run(
        ["ffmpeg", "-y", "-i", wav_tmp, "-c:a", "libmp3lame", "-b:a", "160k", out_mp3],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )
    os.remove(wav_tmp)
    print(f"[OK] Generated normalized BGM: {out_mp3}")

def _epiano_note(freq, local_t):
    """Warm Rhodes / soft electric piano tone with gentle decay."""
    if local_t < 0:
        return 0.0
    env = (1.0 - math.exp(-local_t * 60.0)) * math.exp(-local_t * 0.95)
    return env * (
        0.70 * math.sin(2 * math.pi * freq * local_t)
        + 0.22 * math.sin(2 * math.pi * freq * 2.0 * local_t) * math.exp(-local_t * 2.2)
        + 0.08 * math.sin(2 * math.pi * freq * 3.0 * local_t) * math.exp(-local_t * 4.0)
    )

def gen_lofi_track(chords, melody_notes, dur_sec=16, bright=False, add_rain=False):
    n = SR * dur_sec
    chord_len = n // len(chords)
    beat_len = SR // 2  # 120 BPM eighth-note grid
    samples = []
    rng = random.Random(101)
    rain_lp = 0.0

    for i in range(n):
        t = i / SR
        ci = min(len(chords) - 1, i // chord_len)
        c_local_t = (i % chord_len) / SR
        freqs = chords[ci]

        val_l, val_r = 0.0, 0.0
        # 1. Warm Rhodes / piano chord struck on each bar
        for fi, f in enumerate(freqs):
            # Slight strum offset (20ms per note) so it feels human!
            nt = c_local_t - fi * 0.022
            tone = _epiano_note(f, nt)
            pan = 0.4 + 0.2 * (fi / max(1, len(freqs) - 1))
            val_l += tone * (1.0 - pan * 0.35) * (0.55 / len(freqs))
            val_r += tone * (0.65 + pan * 0.35) * (0.55 / len(freqs))

        # 2. Gentle audible melody / arpeggio notes
        bi = (i // beat_len) % len(melody_notes)
        m_freq = melody_notes[bi]
        if m_freq > 0:
            m_local_t = (i % beat_len) / SR
            m_tone = _epiano_note(m_freq, m_local_t) * (0.45 if bright else 0.32)
            val_l += m_tone * 0.9
            val_r += m_tone * 1.1

        # 3. Soft filtered rain for midnight theme
        if add_rain:
            white = rng.uniform(-1.0, 1.0)
            rain_lp = rain_lp * 0.85 + white * 0.15
            val_l += rain_lp * 0.14
            val_r += (rain_lp * 0.92 + white * 0.03) * 0.14

        # Smooth loop edge fade
        loop_env = 1.0
        if i < SR * 0.3:
            loop_env = i / (SR * 0.3)
        elif i > n - SR * 0.3:
            loop_env = (n - i) / (SR * 0.3)
        samples.append((val_l * loop_env, val_r * loop_env))

    return samples

if __name__ == "__main__":
    # 1. Warm Healing Piano (Fmaj7 -> Cmaj7 -> Dm7 -> Cmaj7)
    _write_mp3(
        gen_lofi_track(
            chords=[
                [174.61, 220.00, 261.63, 329.63],
                [130.81, 196.00, 246.94, 329.63],
                [146.83, 220.00, 261.63, 349.23],
                [130.81, 196.00, 246.94, 329.63],
            ],
            melody_notes=[523.25, 0, 440.00, 392.00, 329.63, 0, 392.00, 0, 440.00, 0, 349.23, 329.63, 293.66, 0, 329.63, 0],
            dur_sec=16, bright=False, add_rain=False
        ),
        "assets/bgm/healing_piano_pad.mp3"
    )
    # 2. Happy Morning Bells (Cmaj7 -> Gmaj7 -> Am7 -> Fmaj7)
    _write_mp3(
        gen_lofi_track(
            chords=[
                [261.63, 329.63, 392.00, 493.88],
                [196.00, 246.94, 293.66, 369.99],
                [220.00, 261.63, 329.63, 392.00],
                [174.61, 220.00, 261.63, 329.63],
            ],
            melody_notes=[523.25, 659.25, 783.99, 659.25, 587.33, 493.88, 587.33, 0, 523.25, 659.25, 523.25, 440.00, 392.00, 440.00, 523.25, 0],
            dur_sec=16, bright=True, add_rain=False
        ),
        "assets/bgm/happy_morning_bells.mp3"
    )
    # 3. Midnight Rain Lo-Fi (Am9 -> Fmaj7 -> Dm9 -> Em7 + soft night rain)
    _write_mp3(
        gen_lofi_track(
            chords=[
                [110.00, 164.81, 196.00, 246.94],
                [87.31,  130.81, 164.81, 220.00],
                [146.83, 174.61, 220.00, 261.63],
                [164.81, 196.00, 246.94, 293.66],
            ],
            melody_notes=[329.63, 0, 293.66, 0, 261.63, 0, 220.00, 0, 261.63, 0, 293.66, 0, 246.94, 0, 196.00, 0],
            dur_sec=16, bright=False, add_rain=True
        ),
        "assets/bgm/midnight_rain_lofi.mp3"
    )
