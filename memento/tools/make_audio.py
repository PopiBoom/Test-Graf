"""Синтез саундтрека Memento Mori: музыка (120 BPM, ре минор) + звуковой дизайн.
Все события привязаны к тем же таймкодам, что и анимация (см. STORYBOARD.md)."""
import sys, wave
import numpy as np

SR = 48000
DUR = 20.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)

def note(n):  # MIDI -> Hz
    return 440.0 * 2 ** ((n - 69) / 12)

def put(sig, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= N: return
    sig = sig[: N - i] * gain
    f = min(len(sig) // 4, int(0.012 * SR))  # микро-фейд против щелчков на обрыве
    if f > 0: sig = sig.copy(); sig[-f:] *= np.linspace(1, 0, f)
    a = (1 - pan) / 2; b = (1 + pan) / 2
    L[i:i + len(sig)] += sig * np.sqrt(a) * 1.414
    R[i:i + len(sig)] += sig * np.sqrt(b) * 1.414

def tt(d): return np.arange(int(d * SR)) / SR

def band(sig, lo, hi):
    S = np.fft.rfft(sig); f = np.fft.rfftfreq(len(sig), 1 / SR)
    m = ((f >= lo) & (f <= hi)).astype(float)
    # мягкие края
    m = np.convolve(m, np.ones(64) / 64, mode='same')
    return np.fft.irfft(S * m, len(sig))

def noise(d): return rng.standard_normal(int(d * SR))

# ---------- инструменты ----------
def kick(d=0.45):
    t = tt(d); f = 45 + 110 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t / 0.22)
    s[:240] += np.exp(-np.arange(240) / 40) * 0.3
    return np.tanh(s * 1.6)

def bass808(freq, d=1.4):
    t = tt(d); f = freq * (1 + 0.6 * np.exp(-t / 0.03))
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t / 0.9) * np.minimum(1, t / 0.004)
    return np.tanh(s * 2.2) * 0.8

def clap():
    d = 0.35; s = band(noise(d), 900, 6000); t = tt(d)
    env = np.zeros_like(t)
    for o in (0, 0.012, 0.024):
        env += np.where(t >= o, np.exp(-(t - o) / (0.012 if o < 0.024 else 0.12)), 0)
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05) * 0.4
    return (s / np.abs(s).max() * env + body) * 0.7

def hat(open_=False):
    d = 0.25 if open_ else 0.06; s = band(noise(d), 7000, 16000); t = tt(d)
    return s / np.abs(s).max() * np.exp(-t / (0.08 if open_ else 0.014)) * 0.5

def heart(gain=1.0):
    out = np.zeros(int(0.6 * SR))
    for o, g in ((0, 1.0), (0.2, 0.7)):
        t = tt(0.3); f = 38 + 50 * np.exp(-t / 0.04)
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.09) * g
        i = int(o * SR); out[i:i + len(s)] += s
    return np.tanh(out * 2.0) * gain

def tick(hi=True):
    d = 0.06; t = tt(d); f = 2600 if hi else 1900
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.008)
    n = band(noise(d), 3000, 12000); n = n / np.abs(n).max() * np.exp(-t / 0.002)
    return (s * 0.5 + n * 0.4)

def bell(freq, d=1.6):
    t = tt(d)
    mod = np.sin(2 * np.pi * freq * 3.5 * t) * 2.2 * np.exp(-t / 0.35)
    s = np.sin(2 * np.pi * freq * t + mod) * np.exp(-t / 0.7)
    s += 0.3 * np.sin(2 * np.pi * freq * 2 * t) * np.exp(-t / 0.3)
    return s * np.minimum(1, t / 0.002) * 0.35

def whoosh(d=0.6, lo=300, hi=4000, peak=0.6):
    s = band(noise(d), lo, hi); s /= np.abs(s).max(); t = tt(d)
    env = np.where(t < peak * d, (t / (peak * d)) ** 2, np.exp(-(t - peak * d) / (0.12 * d)))
    return s * env * 0.5

def riser(d, f0=180, f1=1400):
    t = tt(d); f = f0 * (f1 / f0) ** (t / d)
    s = 0.5 * np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.35 * np.sign(np.sin(2 * np.pi * np.cumsum(f * 0.5) / SR)) * 0.3
    n = band(noise(d), 2000, 12000); n /= np.abs(n).max()
    env = (t / d) ** 2.2
    return (s * 0.4 + n * 0.5) * env * 0.5

def reverse_cym(d):
    s = band(noise(d), 4000, 15000); s /= np.abs(s).max(); t = tt(d)
    return s * (t / d) ** 3 * 0.45

def impact(d=2.2, sub=38):
    t = tt(d)
    s = np.sin(2 * np.pi * np.cumsum(sub + 60 * np.exp(-t / 0.06)) / SR) * np.exp(-t / 0.7)
    n = band(noise(d), 40, 900); n /= np.abs(n).max()
    s += n * np.exp(-t / 0.18) * 0.6
    return np.tanh(s * 1.8) * 0.9

def slash():
    d = 0.9; t = tt(d)
    n = band(noise(d), 2500, 14000); n /= np.abs(n).max()
    env = np.where(t < 0.06, t / 0.06, np.exp(-(t - 0.06) / 0.07))
    ring = sum(np.sin(2 * np.pi * f * t + p) * np.exp(-t / dd) * a for f, p, dd, a in
               ((2130, 0, 0.5, 0.25), (3370, 1, 0.35, 0.18), (4790, 2, 0.25, 0.12), (6620, 3, 0.18, 0.08)))
    return n * env * 0.6 + ring * np.minimum(1, t / 0.05)

def thud(d=0.5):
    t = tt(d); s = np.sin(2 * np.pi * np.cumsum(70 + 80 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.12)
    k = band(noise(d), 200, 1200); k /= np.abs(k).max()
    return np.tanh((s + k * np.exp(-t / 0.03) * 0.5) * 1.5) * 0.8

def knock():
    d = 0.12; t = tt(d); k = band(noise(d), 400, 2500); k /= np.abs(k).max()
    return (k * np.exp(-t / 0.015) + np.sin(2 * np.pi * 320 * t) * np.exp(-t / 0.03)) * 0.45

def pop():
    d = 0.18; t = tt(d); f = 350 + 900 * (t / d)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.05) * 0.5

def sparkle(d=1.5, count=26, seed=3):
    r = np.random.default_rng(seed); out = np.zeros(int(d * SR))
    for _ in range(count):
        o = r.uniform(0, d * 0.7); f = r.uniform(2500, 7000); dd = r.uniform(0.08, 0.25)
        t = tt(dd); s = np.sin(2 * np.pi * f * t) * np.exp(-t / (dd / 3)) * r.uniform(0.05, 0.15)
        i = int(o * SR); out[i:i + len(s)] += s[: len(out) - i]
    return out

def click():
    d = 0.04; t = tt(d); n = band(noise(d), 1500, 9000); n /= np.abs(n).max()
    return n * np.exp(-t / 0.004) * 0.5 + np.sin(2 * np.pi * 1200 * t) * np.exp(-t / 0.01) * 0.3

def pad(freqs, d, cutoff=900):
    t = tt(d); s = np.zeros_like(t)
    for f in freqs:
        for det in (-0.12, 0.0, 0.11):
            ph = 2 * np.pi * f * (1 + det / 100 * 3) * t + rng.uniform(0, 6.28)
            s += 2 * ((ph / (2 * np.pi)) % 1) - 1
    s = band(s, 30, cutoff); s /= np.abs(s).max()
    return s * (0.8 + 0.2 * np.sin(2 * np.pi * 0.25 * t))

# ---------- аранжировка ----------
D, F, A, Bb, G, C, E = 62, 65, 69, 70, 67, 72, 64
Dm = [note(50), note(57), note(62), note(65)]

# дрон/пэд: весь ролик, громче в финале
p = pad(Dm, 20.0, 700)
env = np.interp(np.arange(N) / SR, [0, 1.5, 4, 8, 12, 16, 18, 19.2, 20], [0, .35, .3, .22, .25, .3, .55, .35, 0])
put(p * env, 0, 0.55)

# 0–4: тиканье часов и сердце
for k in range(8):
    put(tick(k % 2 == 0), k * 0.5, 0.35, pan=(-0.3 if k % 2 == 0 else 0.3))
for tb in (0.5, 1.5, 2.5, 3.5):
    put(heart(), tb - 0.02, 0.9)
put(reverse_cym(1.0), 3.0, 0.8)
put(riser(1.0, 120, 600), 3.0, 0.4)

# бит
bars = {4: 50, 6: 46, 8: 43, 10: 45, 12: 50, 14: 46, 16: 43}
def beat_bar(t0, root, kicks=(0, 6, 10), claps=(4, 12), hats=True, roll=False, bass=True, kgain=1.0):
    for s in kicks:
        put(kick(), t0 + s * 0.125, 0.95 * kgain)
    if bass:
        for s in kicks[:2]:
            put(bass808(note(root - 12 if root > 40 else root)), t0 + s * 0.125, 0.75)
    for s in claps:
        put(clap(), t0 + s * 0.125, 0.55, pan=0.05)
    if hats:
        steps = range(0, 16, 2) if not roll else list(range(0, 12, 2)) + [12, 13, 14, 14.5, 15, 15.5]
        for j, s in enumerate(steps):
            put(hat(open_=(s == 6)), t0 + s * 0.125, 0.5 if s % 4 == 0 else 0.33, pan=0.35 if j % 2 else -0.2)

beat_bar(4, 50)
beat_bar(6, 46, roll=True)
# 8–10: подъём — только хэты и 808-педаль, приземление/дребезг
for s in range(0, 16, 2):
    put(hat(), 8 + s * 0.125, 0.3, pan=0.3)
put(riser(2.0, 150, 1600), 8.0, 0.5)
put(whoosh(0.5, 400, 6000, 0.3), 7.85, 0.8)
put(thud(), 9.0, 1.0); put(bass808(note(31)), 9.0, 0.6)
put(knock(), 9.5, 0.9, -0.2); put(knock(), 9.75, 0.9, 0.2); put(knock(), 9.875, 0.6, 0)
# падение коробки: свист вниз
def whistle(d=0.6):
    t = tt(d); f = 1700 * (300 / 1700) ** (t / d) * (1 + 0.02 * np.sin(2 * np.pi * 9 * t))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(1, t / 0.05) * 0.22
put(whistle(0.58), 8.42, 0.8, 0.1)
# 10: крышка
put(impact(1.8), 10.0, 0.9); put(pop(), 10.0, 0.7); put(sparkle(1.6), 10.02, 1.0)
beat_bar(10, 45, kicks=(0, 6, 10, 11))
for k, m in enumerate([A + 12, C + 12, E + 12, A + 12, G + 12, E + 12, C + 12, E + 12]):
    put(bell(note(m)), 10.0 + k * 0.25, 0.6, pan=(-0.4 + 0.1 * k))
# 11.5–12: взмах
put(whoosh(0.55, 500, 9000, 0.85), 11.5, 0.9, pan=-0.4)
# 12: коса
put(slash(), 12.0, 0.9, pan=0.2); put(impact(2.0, 34), 12.0, 1.0)
beat_bar(12, 50, kicks=(0, 6, 10), claps=(8,))
put(thud(0.4), 13.0, 0.6); put(whoosh(0.35, 800, 8000, 0.7), 12.75, 0.5, 0.3)
beat_bar(14, 46, claps=(8,), roll=True)
for k, m in enumerate([D + 12, F + 12, A + 12, D + 24]):
    put(bell(note(m), 1.2), 14.0 + k * 0.5, 0.35, pan=0.3 - 0.2 * k)
put(whoosh(0.6, 300, 5000, 0.8), 15.4, 0.8, 0.1)
# 16–18: фильтрованный бит, пульс кольца, подготовка клика
for s in (0, 4, 8, 12):
    put(kick(), 16 + s * 0.125, 0.55)
for s in range(0, 16, 2):
    put(hat(), 16 + s * 0.125, 0.22, pan=0.3)
for tb in (16.5, 17.25):
    put(heart(0.7), tb - 0.02, 0.8)
put(reverse_cym(1.0), 17.0, 0.9); put(riser(1.0, 200, 1200), 17.0, 0.35)
# 18: клик = последний удар сердца + финальный аккорд
put(click(), 18.0, 0.9); put(heart(), 17.98, 1.0); put(impact(2.0, 36), 18.0, 1.0)
put(bass808(note(38), 2.0), 18.0, 0.8)
for k, m in enumerate([D, F, A, D + 12]):
    put(bell(note(m + 12), 2.0), 18.0 + k * 0.06, 0.45, pan=-0.3 + 0.2 * k)
put(sparkle(1.8, 18, 11), 18.05, 0.8)

# ---------- мастер ----------
mix = np.stack([L, R], 1)
mix = np.tanh(mix * 0.9)
fade = np.ones(N); fl = int(0.6 * SR); fade[-fl:] = np.linspace(1, 0, fl) ** 2
mix *= fade[:, None]
mix[: int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))[:, None]
mix = mix / np.abs(mix).max() * 0.6
pcm = (mix * 32767).astype(np.int16)
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok', pcm.shape, 'peak', np.abs(mix).max())
