"use client";

// Pure Web Audio API Thai Festival Synthesizer (no external MP3 assets required)

const NOTE_FREQ: Record<string, number> = {
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  G4: 392.0,
  A4: 440.0,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
};

interface MelodyNote {
  note: keyof typeof NOTE_FREQ | null;
  beats: number;
}

// Traditional Loy Krathong pentatonic melody arranged for calm evening Khim chimes
const LOY_KRATHONG_MELODY: MelodyNote[] = [
  // วันเพ็ญเดือนสิบสอง น้ำก็นองเต็มตลิ่ง
  { note: "G4", beats: 0.5 },
  { note: "G4", beats: 0.5 },
  { note: "E4", beats: 0.5 },
  { note: "G4", beats: 0.5 },
  { note: "A4", beats: 1.0 },
  { note: "G4", beats: 1.0 },
  { note: "E4", beats: 0.5 },
  { note: "D4", beats: 0.5 },
  { note: "C4", beats: 0.5 },
  { note: "D4", beats: 0.5 },
  { note: "E4", beats: 1.5 },
  { note: null, beats: 0.5 },

  // เราทั้งหลายชายหญิง สนุกกันจริงวันลอยกระทง
  { note: "G4", beats: 0.5 },
  { note: "G4", beats: 0.5 },
  { note: "E4", beats: 0.5 },
  { note: "G4", beats: 0.5 },
  { note: "A4", beats: 0.75 },
  { note: "C5", beats: 0.25 },
  { note: "A4", beats: 1.0 },
  { note: "G4", beats: 0.5 },
  { note: "E4", beats: 0.5 },
  { note: "D4", beats: 0.5 },
  { note: "E4", beats: 0.5 },
  { note: "D4", beats: 1.0 },
  { note: "C4", beats: 1.0 },

  // ลอย ลอยกระทง ลอย ลอยกระทง
  { note: "G4", beats: 1.0 },
  { note: "E4", beats: 0.5 },
  { note: "G4", beats: 0.5 },
  { note: "A4", beats: 1.0 },
  { note: "G4", beats: 1.0 },
  { note: "G4", beats: 1.0 },
  { note: "E4", beats: 0.5 },
  { note: "G4", beats: 0.5 },
  { note: "A4", beats: 1.0 },
  { note: "G4", beats: 1.0 },

  // ลอยกระทงกันแล้ว ขอเชิญน้องแก้วออกมารำวง
  { note: "C5", beats: 0.5 },
  { note: "C5", beats: 0.5 },
  { note: "A4", beats: 0.5 },
  { note: "G4", beats: 0.5 },
  { note: "E4", beats: 0.5 },
  { note: "G4", beats: 0.5 },
  { note: "A4", beats: 1.0 },
  { note: "G4", beats: 0.5 },
  { note: "E4", beats: 0.5 },
  { note: "D4", beats: 0.5 },
  { note: "E4", beats: 0.5 },
  { note: "D4", beats: 1.0 },
  { note: "C4", beats: 1.0 },

  // รำวงวันลอยกระทง x2 บุญจะส่งให้เราสุขใจ
  { note: "D4", beats: 0.5 },
  { note: "E4", beats: 0.5 },
  { note: "G4", beats: 0.5 },
  { note: "E4", beats: 0.5 },
  { note: "D4", beats: 1.0 },
  { note: "C4", beats: 1.0 },
  { note: "D4", beats: 0.5 },
  { note: "E4", beats: 0.5 },
  { note: "G4", beats: 0.5 },
  { note: "E4", beats: 0.5 },
  { note: "D4", beats: 1.0 },
  { note: "C4", beats: 1.0 },
  { note: "A4", beats: 0.5 },
  { note: "G4", beats: 0.5 },
  { note: "E4", beats: 0.5 },
  { note: "D4", beats: 0.5 },
  { note: "C4", beats: 2.0 },
  { note: null, beats: 1.0 },
];

class ThaiFestivalAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicTimer: ReturnType<typeof setTimeout> | null = null;
  private padOscillators: OscillatorNode[] = [];
  private padGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private noteIndex = 0;
  private musicPlaying = false;
  private soundMuted = false;

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const len = Math.floor(ctx.sampleRate * 1.6);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      ch[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buf;
    return buf;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.soundMuted ? 0 : 0.7;
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public isMusicPlaying(): boolean {
    return this.musicPlaying;
  }

  public isMuted(): boolean {
    return this.soundMuted;
  }

  public setMuted(muted: boolean): void {
    this.soundMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.7, this.ctx.currentTime, 0.08);
    }
    if (muted && this.musicPlaying) {
      this.stopMusic();
    }
  }

  public toggleMusic(): boolean {
    if (this.musicPlaying) {
      this.stopMusic();
      return false;
    }
    this.soundMuted = false;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(0.7, this.ctx.currentTime, 0.08);
    }
    this.startMusic();
    return true;
  }

  public startMusic(): void {
    if (this.musicPlaying) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    this.musicPlaying = true;
    this.noteIndex = 0;
    this.startAmbientPad(ctx);
    this.scheduleNextNote();
  }

  public stopMusic(): void {
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
    this.stopAmbientPad();
  }

  private startAmbientPad(ctx: AudioContext): void {
    if (!this.masterGain || this.padOscillators.length > 0) return;

    const padGain = ctx.createGain();
    padGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    padGain.gain.exponentialRampToValueAtTime(0.045, ctx.currentTime + 1.5);
    padGain.connect(this.masterGain);
    this.padGain = padGain;

    // Warm C-G-D fifth drone for peaceful river moonlight ambiance
    const freqs = [130.81, 196.0, 261.63];
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      osc.connect(padGain);
      osc.start();
      this.padOscillators.push(osc);
    }
  }

  private stopAmbientPad(): void {
    if (this.padGain && this.ctx) {
      try {
        this.padGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.2);
      } catch {
        // Ignore
      }
    }
    const oscs = [...this.padOscillators];
    this.padOscillators = [];
    setTimeout(() => {
      for (const osc of oscs) {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // Ignore
        }
      }
    }, 350);
  }

  private scheduleNextNote(): void {
    if (!this.musicPlaying || !this.ctx || !this.masterGain) return;

    const item = LOY_KRATHONG_MELODY[this.noteIndex % LOY_KRATHONG_MELODY.length];
    this.noteIndex += 1;

    const beatMs = 620; // Calm ~96 BPM
    const durationSec = (item.beats * beatMs) / 1000;

    if (item.note) {
      this.playKhimNote(NOTE_FREQ[item.note], durationSec);
    }

    this.musicTimer = setTimeout(() => {
      this.scheduleNextNote();
    }, item.beats * beatMs);
  }

  private playKhimNote(freq: number, durationSec: number): void {
    if (!this.ctx || !this.masterGain || this.soundMuted) return;
    const now = this.ctx.currentTime;

    // Fundamental warm triangle + soft 2nd harmonic shimmer (Khim struck string)
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(freq, now);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(freq * 2, now);

    const osc2Gain = this.ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.22, now);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2400, now);
    filter.frequency.exponentialRampToValueAtTime(700, now + Math.max(0.35, durationSec));

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + Math.max(0.55, durationSec * 1.4));

    osc1.connect(filter);
    osc2.connect(osc2Gain);
    osc2Gain.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    const stopAt = now + Math.max(0.65, durationSec * 1.5);
    osc1.stop(stopAt);
    osc2.stop(stopAt);
  }

  public playWaterSplash(): void {
    if (this.soundMuted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    // Filtered noise splash
    const bufferSize = Math.floor(ctx.sampleRate * 0.45);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.14));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(320, now + 0.42);
    filter.Q.value = 1.6;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.44);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);

    // Gentle water droplet chime
    const drop = ctx.createOscillator();
    const dropGain = ctx.createGain();
    drop.type = "sine";
    drop.frequency.setValueAtTime(480, now + 0.05);
    drop.frequency.exponentialRampToValueAtTime(760, now + 0.16);
    dropGain.gain.setValueAtTime(0.09, now + 0.05);
    dropGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    drop.connect(dropGain);
    dropGain.connect(this.masterGain);
    drop.start(now + 0.05);
    drop.stop(now + 0.28);
  }

  public playChimeSound(): void {
    if (this.soundMuted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      if (!this.masterGain) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const t = now + idx * 0.06;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.48);
    });
  }

  public playLanternWhoosh(): void {
    if (this.soundMuted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.7);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.9);
  }

  public unlock(): void {
    this.ensureContext();
  }

  public playFireworkLaunch(): void {
    if (this.soundMuted || !this.ctx || !this.masterGain || this.ctx.state !== "running") {
      return;
    }
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // 1. Mortar Tube Thump (กระบอกยิงพลุ)
    const thumpOsc = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thumpOsc.type = "triangle";
    thumpOsc.frequency.setValueAtTime(118, now);
    thumpOsc.frequency.exponentialRampToValueAtTime(36, now + 0.15);
    thumpGain.gain.setValueAtTime(0.001, now);
    thumpGain.gain.linearRampToValueAtTime(0.24, now + 0.006);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    thumpOsc.connect(thumpGain);
    thumpGain.connect(this.masterGain);
    thumpOsc.start(now);
    thumpOsc.stop(now + 0.2);

    // 2. Ascending Fuse Hiss (เสียงฟู่แหวกอากาศขึ้นสู่ท้องฟ้า)
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(380, now);
    filter.frequency.exponentialRampToValueAtTime(980, now + 0.42);
    filter.Q.value = 1.8;

    const hissGain = ctx.createGain();
    hissGain.gain.setValueAtTime(0.001, now);
    hissGain.gain.linearRampToValueAtTime(0.085, now + 0.05);
    hissGain.gain.exponentialRampToValueAtTime(0.001, now + 0.44);

    noise.connect(filter);
    filter.connect(hissGain);
    hissGain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.46);
  }

  public playFireworkExplosion(scale = 1): void {
    if (this.soundMuted || !this.ctx || !this.masterGain || this.ctx.state !== "running") {
      return;
    }
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const sharedNoise = this.getNoiseBuffer(ctx);

    // 1. Sharp Aerial Detonation Snap (เสียงแตกปะทุต้น)
    const snap = ctx.createBufferSource();
    snap.buffer = sharedNoise;
    const snapFilter = ctx.createBiquadFilter();
    snapFilter.type = "bandpass";
    snapFilter.frequency.setValueAtTime(1600, now);
    snapFilter.Q.value = 0.85;
    const snapGain = ctx.createGain();
    snapGain.gain.setValueAtTime(0.001, now);
    snapGain.gain.linearRampToValueAtTime(0.32 * scale, now + 0.003);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    snap.connect(snapFilter);
    snapFilter.connect(snapGain);
    snapGain.connect(this.masterGain);
    snap.start(now);
    snap.stop(now + 0.075);

    // 2. Sub-Bass Air Pressure Boom (แรงอัดความถี่ต่ำ)
    const boomOsc = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boomOsc.type = "sine";
    boomOsc.frequency.setValueAtTime(94, now);
    boomOsc.frequency.exponentialRampToValueAtTime(24, now + 0.55);
    boomGain.gain.setValueAtTime(0.001, now);
    boomGain.gain.linearRampToValueAtTime(0.42 * scale, now + 0.012);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    boomOsc.connect(boomGain);
    boomGain.connect(this.masterGain);
    boomOsc.start(now);
    boomOsc.stop(now + 0.62);

    // 3. Chao Phraya River Reverberation Rumble (เสียงก้องสะท้อนคุ้งน้ำ)
    const rumble = ctx.createBufferSource();
    rumble.buffer = sharedNoise;
    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = "lowpass";
    rumbleFilter.frequency.setValueAtTime(260, now);
    rumbleFilter.frequency.exponentialRampToValueAtTime(48, now + 1.35);
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.setValueAtTime(0.001, now);
    rumbleGain.gain.linearRampToValueAtTime(0.34 * scale, now + 0.025);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 1.42);
    rumble.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(this.masterGain);
    rumble.start(now);
    rumble.stop(now + 1.45);

    // 4. Golden Brocade Micro-Crackles (ประกายแตกปร่าช่วงปลาย)
    const crackleCount = 10 + Math.floor(Math.random() * 5);
    for (let i = 0; i < crackleCount; i++) {
      const offset = 0.2 + Math.random() * 0.88;
      const t = now + offset;
      const cSrc = ctx.createBufferSource();
      cSrc.buffer = sharedNoise;
      const cFilter = ctx.createBiquadFilter();
      cFilter.type = "bandpass";
      cFilter.frequency.setValueAtTime(1900 + Math.random() * 2200, t);
      cFilter.Q.value = 2.4;

      const cGain = ctx.createGain();
      const amp = (0.045 + Math.random() * 0.05) * scale;
      cGain.gain.setValueAtTime(0.001, t);
      cGain.gain.linearRampToValueAtTime(amp, t + 0.002);
      cGain.gain.exponentialRampToValueAtTime(0.001, t + 0.016);

      cSrc.connect(cFilter);
      cFilter.connect(cGain);
      cGain.connect(this.masterGain);
      cSrc.start(t, Math.random() * 0.4, 0.025);
    }
  }

  public playFireworkSound(): void {
    this.playFireworkLaunch();
  }
}

export const festivalAudio = new ThaiFestivalAudio();
