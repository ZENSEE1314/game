/**
 * ============================================================
 * SOUND MANAGER (Web Audio API)
 * ============================================================
 * Lightweight procedural sound effects generated via the Web Audio
 * API — NO audio files needed. Each sound is a short oscillator
 * envelope, so the whole system is ~3KB and instantiates lazily on
 * the first user gesture (to satisfy browser autoplay policies).
 *
 * Sounds:
 *   - tick        : subtle resource production blip (very quiet)
 *   - upgrade     : rising chime (facility/weapon upgrade)
 *   - recruit     : double-note metallic clang (troop recruited)
 *   - forge       : anvil strike (weapon forged)
 *   - attack      : sword clash (PvP attack initiated)
 *   - victory     : triumphant rising arpeggio
 *   - defeat      : descending minor tone
 *   - loot        : coin clink
 *   - ad          : sparkly chime (ad reward claimed)
 *   - shield      : low protective hum
 *   - quest       : quest-complete fanfare
 *   - achievement : achievement-unlocked fanfare
 *   - rebirth     : powerful reset whoosh
 *   - event       : event-spawn notification
 *   - error       : low buzz (action failed)
 *
 * Mute state persists to localStorage.
 * ============================================================
 */

type SoundName =
  | 'tick'
  | 'upgrade'
  | 'recruit'
  | 'forge'
  | 'attack'
  | 'victory'
  | 'defeat'
  | 'loot'
  | 'ad'
  | 'shield'
  | 'quest'
  | 'achievement'
  | 'rebirth'
  | 'event'
  | 'error';

const MUTE_KEY = 'idle-war-muted';

class SoundManager {
  private ctx: AudioContext | null = null;
  private muted = false;
  private lastTick = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.muted = localStorage.getItem(MUTE_KEY) === '1';
      } catch {
        this.muted = false;
      }
    }
  }

  /** Lazily create the AudioContext on first user gesture. */
  private ensureCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AC();
      } catch {
        return null;
      }
    }
    // Resume if suspended (autoplay policy).
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
      } catch {
        // ignore
      }
    }
    return this.muted;
  }

  /** Play a named sound effect. */
  play(name: SoundName): void {
    if (this.muted) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;

    switch (name) {
      case 'tick':
        // Throttle tick sounds to once per ~800ms to avoid noise.
        if (Date.now() - this.lastTick < 800) return;
        this.lastTick = Date.now();
        this.blip(ctx, 880, 0.04, 0.015);
        break;
      case 'upgrade':
        this.chime(ctx, [523, 659, 784], 0.08, 0.12);
        break;
      case 'recruit':
        this.blip(ctx, 440, 0.06, 0.05);
        setTimeout(() => this.blip(ctx, 330, 0.08, 0.05), 60);
        break;
      case 'forge':
        this.anvil(ctx);
        break;
      case 'attack':
        this.clash(ctx);
        break;
      case 'victory':
        this.chime(ctx, [523, 659, 784, 1047], 0.1, 0.15);
        break;
      case 'defeat':
        this.descend(ctx, [440, 349, 277], 0.15, 0.2);
        break;
      case 'loot':
        this.blip(ctx, 1318, 0.06, 0.04);
        setTimeout(() => this.blip(ctx, 1760, 0.06, 0.03), 50);
        break;
      case 'ad':
        this.chime(ctx, [1047, 1319, 1568], 0.08, 0.1);
        break;
      case 'shield':
        this.hum(ctx, 220, 0.4, 0.06);
        break;
      case 'quest':
        this.chime(ctx, [659, 784, 988, 1319], 0.09, 0.13);
        break;
      case 'achievement':
        this.chime(ctx, [784, 988, 1319, 1568], 0.1, 0.15);
        break;
      case 'rebirth':
        this.whoosh(ctx);
        break;
      case 'event':
        this.chime(ctx, [880, 1109, 1319], 0.08, 0.1);
        break;
      case 'error':
        this.blip(ctx, 150, 0.15, 0.06, 'square');
        break;
    }
  }

  /** Single short blip. */
  private blip(ctx: AudioContext, freq: number, dur: number, vol: number, type: OscillatorType = 'sine'): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.02);
  }

  /** Rising arpeggio of notes. */
  private chime(ctx: AudioContext, freqs: number[], noteDur: number, vol: number): void {
    freqs.forEach((f, i) => {
      setTimeout(() => this.blip(ctx, f, noteDur, vol), i * 70);
    });
  }

  /** Descending sequence. */
  private descend(ctx: AudioContext, freqs: number[], noteDur: number, vol: number): void {
    freqs.forEach((f, i) => {
      setTimeout(() => this.blip(ctx, f, noteDur, vol, 'triangle'), i * 120);
    });
  }

  /** Sustained low hum. */
  private hum(ctx: AudioContext, freq: number, dur: number, vol: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.05);
  }

  /** Anvil strike — metallic clank. */
  private anvil(ctx: AudioContext): void {
    this.blip(ctx, 200, 0.12, 0.08, 'square');
    setTimeout(() => this.blip(ctx, 150, 0.1, 0.05, 'triangle'), 30);
  }

  /** Sword clash — noise burst. */
  private clash(ctx: AudioContext): void {
    this.blip(ctx, 1200, 0.05, 0.06, 'sawtooth');
    setTimeout(() => this.blip(ctx, 800, 0.08, 0.04, 'triangle'), 20);
  }

  /** Rebirth whoosh — sweeping filter. */
  private whoosh(ctx: AudioContext): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.6);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.6);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.75);
  }
}

/** Singleton sound manager. */
export const sound = new SoundManager();

/** Convenience function to play a sound (no-op if muted). */
export function playSound(name: SoundName): void {
  sound.play(name);
}
