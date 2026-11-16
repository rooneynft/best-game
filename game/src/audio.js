// Cometfall — all sound is synthesised with WebAudio, so the game ships no
// audio files and makes no network request. Sounds are created lazily on the
// first user gesture (browsers block audio before that) and the mute setting
// survives in localStorage.
const MUTE_KEY = 'cometfall-muted';

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      this.muted = false;
    }
  }

  // Call from any user gesture; safe to call repeatedly.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    } catch {
      /* storage unavailable; mute still applies for this session */
    }
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  // A short oscillator blip with a pitch slide and a fade.
  blip({ type = 'sine', from = 440, to = null, dur = 0.15, vol = 0.5, delay = 0 }) {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // Filtered noise burst (whoosh / crash).
  noise({ dur = 0.3, vol = 0.4, freq = 800, delay = 0 }) {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  click() {
    this.blip({ type: 'triangle', from: 660, to: 520, dur: 0.07, vol: 0.25 });
  }

  launch() {
    this.noise({ dur: 0.35, vol: 0.35, freq: 2400 });
    this.blip({ type: 'sawtooth', from: 180, to: 620, dur: 0.3, vol: 0.18 });
  }

  bounce() {
    this.blip({ type: 'sine', from: 220, to: 130, dur: 0.12, vol: 0.3 });
  }

  collect() {
    this.blip({ type: 'sine', from: 880, to: 1320, dur: 0.18, vol: 0.4 });
    this.blip({ type: 'sine', from: 1320, to: 1760, dur: 0.22, vol: 0.3, delay: 0.07 });
  }

  shatter() {
    this.noise({ dur: 0.5, vol: 0.5, freq: 500 });
    this.blip({ type: 'square', from: 160, to: 40, dur: 0.4, vol: 0.3 });
  }

  fizzle() {
    this.blip({ type: 'sine', from: 320, to: 90, dur: 0.5, vol: 0.3 });
  }

  levelWin() {
    [523, 659, 784, 1047].forEach((f, i) =>
      this.blip({ type: 'triangle', from: f, dur: 0.22, vol: 0.35, delay: i * 0.09 }),
    );
  }

  levelLose() {
    [392, 330, 262].forEach((f, i) =>
      this.blip({ type: 'triangle', from: f, dur: 0.28, vol: 0.3, delay: i * 0.12 }),
    );
  }

  gameWin() {
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) =>
      this.blip({ type: 'triangle', from: f, dur: 0.25, vol: 0.35, delay: i * 0.11 }),
    );
  }
}
