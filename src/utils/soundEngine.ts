export type MusicSceneContext =
  | 'none'
  | 'menu'
  | 'selection'
  | 'city'
  | 'mission'
  | 'mission_1'
  | 'mission_2'
  | 'mission_3'
  | 'mission_4'
  | 'mission_5'
  | 'teleport'
  | 'victory'
  | 'ceremony';

export type TeleportSfxPhase =
  | 'activate'
  | 'eruption'
  | 'ascend'
  | 'transform'
  | 'tunnel'
  | 'arrive';

const AUDIO_PREFS_KEY = 'wordopia_audio_prefs';

interface StoredAudioPrefs {
  musicEnabled?: boolean;
  soundEnabled?: boolean;
  ambientEnabled?: boolean;
  musicVolume?: number;
  sfxVolume?: number;
  ambientVolume?: number;
  muted?: boolean;
}

interface ThemeProfile {
  bpm: number;
  cutoff: number;
  progression: number[][]; // 4 chords: [bassHz, pad1Hz, pad2Hz, pad3Hz]
  leadPattern: number[];   // 8-step or 16-step melody motif
  arpPattern: number[];    // 8-step shimmering synth arp intervals
  style: 'epic' | 'heroic' | 'adventure' | 'focus' | 'teleport' | 'victory';
  percussionLevel: number; // 0 = minimal focus, 1 = full electronic adventure
  padLevel: number;
}

interface AmbientProfile {
  baseFreq: number;
  filterFreq: number;
  filterQ: number;
  noiseGain: number;
  droneGain: number;
  pingFreqs: number[];
  pingChance: number;
}

/**
 * Centralized Hybrid Cinematic, Sci-Fi & Electronic Adventure Audio Manager
 * Manages three independent Web Audio buses (Muzik Latar, Kesan Bunyi, Bunyi Persekitaran),
 * master dynamics compression, smooth fade transitions, and persistent preferences.
 */
class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  // 1. Background Music Bus
  private musicGain: GainNode | null = null;
  private musicFadeGain: GainNode | null = null;
  private musicFilter: BiquadFilterNode | null = null;
  private musicDelay: DelayNode | null = null;
  private musicDelayFeedback: GainNode | null = null;

  // 2. Sound Effects Bus
  private sfxGain: GainNode | null = null;
  private sfxDelay: DelayNode | null = null;
  private sfxDelayGain: GainNode | null = null;

  // 3. Environmental Audio Bus
  private ambientGain: GainNode | null = null;
  private ambientFadeGain: GainNode | null = null;
  private ambientFilter: BiquadFilterNode | null = null;
  private ambientNoiseSource: AudioBufferSourceNode | null = null;
  private ambientDroneOsc: OscillatorNode | null = null;
  private ambientDroneOsc2: OscillatorNode | null = null;
  private ambientNoiseBuffer: AudioBuffer | null = null;
  private ambientTimer: number | null = null;

  // Lookahead Music Scheduler
  private musicTimer: number | null = null;
  private nextNoteTime = 0;
  private stepIndex = 0;
  private lastFootstepTime = 0;
  private sceneTransitionTimer: number | null = null;

  // Public persisted preferences
  public soundEnabled = true;
  public musicEnabled = true;
  public ambientEnabled = true;
  public muted = false;
  public voiceEnabled = false;
  public musicVolume = 0.45;
  public sfxVolume = 0.78;
  public ambientVolume = 0.45;
  public currentMusicScene: MusicSceneContext = 'none';
  private userUnlocked = false;

  constructor() {
    this.loadPrefs();
  }

  private loadPrefs(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(AUDIO_PREFS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredAudioPrefs;
      if (typeof parsed.musicEnabled === 'boolean') this.musicEnabled = parsed.musicEnabled;
      if (typeof parsed.soundEnabled === 'boolean') this.soundEnabled = parsed.soundEnabled;
      if (typeof parsed.ambientEnabled === 'boolean') this.ambientEnabled = parsed.ambientEnabled;
      if (typeof parsed.muted === 'boolean') this.muted = parsed.muted;
      if (typeof parsed.musicVolume === 'number') {
        this.musicVolume = Math.max(0, Math.min(1, parsed.musicVolume));
      }
      if (typeof parsed.sfxVolume === 'number') {
        this.sfxVolume = Math.max(0, Math.min(1, parsed.sfxVolume));
      }
      if (typeof parsed.ambientVolume === 'number') {
        this.ambientVolume = Math.max(0, Math.min(1, parsed.ambientVolume));
      }
    } catch {
      // Ignore storage errors
    }
  }

  public savePrefs(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        AUDIO_PREFS_KEY,
        JSON.stringify({
          musicEnabled: this.musicEnabled,
          soundEnabled: this.soundEnabled,
          ambientEnabled: this.ambientEnabled,
          musicVolume: this.musicVolume,
          sfxVolume: this.sfxVolume,
          ambientVolume: this.ambientVolume,
          muted: this.muted,
        })
      );
    } catch {
      // Ignore storage errors
    }
  }

  private effectiveMusicGain(): number {
    if (this.muted || !this.musicEnabled) return 0;
    return this.musicVolume * 0.42;
  }

  private effectiveSfxGain(): number {
    if (this.muted || !this.soundEnabled) return 0;
    return this.sfxVolume * 0.92;
  }

  private effectiveAmbientGain(): number {
    if (this.muted || !this.ambientEnabled) return 0;
    const focusDuck = this.currentMusicScene === 'mission' ? 0.55 : 1;
    return this.ambientVolume * 0.32 * focusDuck;
  }

  private ensureNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.ambientNoiseBuffer && this.ambientNoiseBuffer.sampleRate === ctx.sampleRate) {
      return this.ambientNoiseBuffer;
    }
    const length = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Smooth pink-tinted noise (less harsh hiss, warmer atmospheric body)
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.95 * b2 + white * 0.048;
      data[i] = Math.max(-1, Math.min(1, (b0 + b1 + b2 + white * 0.06) * 0.55));
    }
    this.ambientNoiseBuffer = buffer;
    return buffer;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      // Master bus + safety dynamics compressor
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 1;

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -14;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 4;
      this.compressor.attack.value = 0.008;
      this.compressor.release.value = 0.18;

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);

      // 1. Music Bus + Atmospheric Delay Send
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.effectiveMusicGain();
      this.musicFadeGain = this.ctx.createGain();
      this.musicFadeGain.gain.value = 0.0001;

      this.musicFilter = this.ctx.createBiquadFilter();
      this.musicFilter.type = 'lowpass';
      this.musicFilter.frequency.value = 2400;
      this.musicFilter.Q.value = 0.7;

      this.musicDelay = this.ctx.createDelay(1.0);
      this.musicDelay.delayTime.value = 0.24;
      this.musicDelayFeedback = this.ctx.createGain();
      this.musicDelayFeedback.gain.value = 0.22;

      const delayFilter = this.ctx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.value = 1600;

      this.musicFilter.connect(this.musicFadeGain);
      this.musicFilter.connect(this.musicDelay);
      this.musicDelay.connect(delayFilter);
      delayFilter.connect(this.musicDelayFeedback);
      this.musicDelayFeedback.connect(this.musicDelay);
      delayFilter.connect(this.musicFadeGain);

      this.musicFadeGain.connect(this.musicGain);
      this.musicGain.connect(this.masterGain);

      // 2. SFX Bus + Subtle Spatial Sparkle
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.effectiveSfxGain();
      this.sfxDelay = this.ctx.createDelay(0.5);
      this.sfxDelay.delayTime.value = 0.11;
      this.sfxDelayGain = this.ctx.createGain();
      this.sfxDelayGain.gain.value = 0.14;
      this.sfxGain.connect(this.masterGain);
      this.sfxDelay.connect(this.sfxDelayGain);
      this.sfxDelayGain.connect(this.sfxGain);

      // 3. Environmental Ambient Bus
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = this.effectiveAmbientGain();
      this.ambientFadeGain = this.ctx.createGain();
      this.ambientFadeGain.gain.value = 0.0001;

      this.ambientFilter = this.ctx.createBiquadFilter();
      this.ambientFilter.type = 'lowpass';
      this.ambientFilter.frequency.value = 520;
      this.ambientFilter.Q.value = 0.9;

      this.ambientFilter.connect(this.ambientFadeGain);
      this.ambientFadeGain.connect(this.ambientGain);
      this.ambientGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlockAudio(): void {
    this.userUnlocked = true;
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (this.currentMusicScene !== 'none' && !this.muted) {
      if (this.musicEnabled && !this.musicTimer) {
        this.startHybridMusicEngine(this.currentMusicScene);
      }
      if (this.ambientEnabled && !this.ambientNoiseSource) {
        this.startEnvironmentSoundscape(this.currentMusicScene);
      }
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.savePrefs();
    const ctx = this.ensureContext();
    if (ctx) {
      const now = ctx.currentTime;
      if (this.masterGain) {
        this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, now, 0.08);
      }
      if (this.musicGain) {
        this.musicGain.gain.setTargetAtTime(this.effectiveMusicGain(), now, 0.1);
      }
      if (this.sfxGain) {
        this.sfxGain.gain.setTargetAtTime(this.effectiveSfxGain(), now, 0.05);
      }
      if (this.ambientGain) {
        this.ambientGain.gain.setTargetAtTime(this.effectiveAmbientGain(), now, 0.12);
      }
    }
    if (muted) {
      this.stopMusicLoop(true);
      this.stopEnvironmentSoundscape(true);
      this.stopSpeech();
    } else if (this.userUnlocked && this.currentMusicScene !== 'none') {
      if (this.musicEnabled) this.startHybridMusicEngine(this.currentMusicScene);
      if (this.ambientEnabled) this.startEnvironmentSoundscape(this.currentMusicScene);
    }
  }

  public setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    this.savePrefs();
    const ctx = this.ensureContext();
    if (this.musicGain && ctx) {
      this.musicGain.gain.setTargetAtTime(this.effectiveMusicGain(), ctx.currentTime, 0.16);
    }
    if (!enabled) {
      this.stopMusicLoop(true);
    } else if (this.userUnlocked && !this.muted && this.currentMusicScene !== 'none') {
      this.startHybridMusicEngine(this.currentMusicScene);
    }
  }

  public setSfxEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    this.savePrefs();
    const ctx = this.ensureContext();
    if (this.sfxGain && ctx) {
      this.sfxGain.gain.setTargetAtTime(this.effectiveSfxGain(), ctx.currentTime, 0.06);
    }
    if (!enabled) this.stopSpeech();
  }

  public setAmbientEnabled(enabled: boolean): void {
    this.ambientEnabled = enabled;
    this.savePrefs();
    const ctx = this.ensureContext();
    if (this.ambientGain && ctx) {
      this.ambientGain.gain.setTargetAtTime(this.effectiveAmbientGain(), ctx.currentTime, 0.18);
    }
    if (!enabled) {
      this.stopEnvironmentSoundscape(true);
    } else if (this.userUnlocked && !this.muted && this.currentMusicScene !== 'none') {
      this.startEnvironmentSoundscape(this.currentMusicScene);
    }
  }

  public setMusicVolume(vol: number): void {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    this.savePrefs();
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.effectiveMusicGain(), this.ctx.currentTime, 0.08);
    }
  }

  public setSfxVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    this.savePrefs();
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.effectiveSfxGain(), this.ctx.currentTime, 0.05);
    }
  }

  public setAmbientVolume(vol: number): void {
    this.ambientVolume = Math.max(0, Math.min(1, vol));
    this.savePrefs();
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(this.effectiveAmbientGain(), this.ctx.currentTime, 0.1);
    }
  }

  public setSceneMusic(scene: MusicSceneContext): void {
    const isSame = this.currentMusicScene === scene;
    this.currentMusicScene = scene;

    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(this.effectiveAmbientGain(), this.ctx.currentTime, 0.2);
    }

    if (scene === 'none' || this.muted || !this.userUnlocked) {
      if (scene === 'none') {
        this.stopMusicLoop(true);
        this.stopEnvironmentSoundscape(true);
      }
      return;
    }

    if (!isSame || (this.musicEnabled && this.musicTimer === null)) {
      if (this.sceneTransitionTimer !== null && typeof window !== 'undefined') {
        window.clearTimeout(this.sceneTransitionTimer);
        this.sceneTransitionTimer = null;
      }

      if (this.musicEnabled) {
        // Smooth fade-out before switching profile so transitions feel cinematic & seamless
        if (this.musicTimer !== null && this.musicFadeGain && this.ctx) {
          this.musicFadeGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.12);
          this.sceneTransitionTimer = window.setTimeout(() => {
            this.sceneTransitionTimer = null;
            this.stopMusicLoop(false);
            if (this.musicEnabled && !this.muted && this.currentMusicScene === scene) {
              this.startHybridMusicEngine(scene);
            }
          }, 240);
        } else {
          this.stopMusicLoop(false);
          this.startHybridMusicEngine(scene);
        }
      }
    }

    if (!isSame || (this.ambientEnabled && !this.ambientNoiseSource)) {
      if (this.ambientEnabled) {
        this.startEnvironmentSoundscape(scene);
      }
    }
  }

  private stopMusicLoop(fadeOut = false): void {
    if (fadeOut && this.musicFadeGain && this.ctx) {
      this.musicFadeGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.12);
    }
    if (this.musicTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private getThemeProfile(scene: Exclude<MusicSceneContext, 'none'>): ThemeProfile {
    const profiles: Record<Exclude<MusicSceneContext, 'none'>, ThemeProfile> = {
      menu: {
        // A. MAIN MENU — THE LOST SIGNAL: Epic cinematic sci-fi adventure (Am - F - C - G)
        bpm: 108,
        cutoff: 2500,
        style: 'epic',
        percussionLevel: 0.78,
        padLevel: 1.0,
        progression: [
          [110.0, 220.0, 261.63, 329.63],   // Am
          [87.31, 174.61, 220.0, 261.63],   // F
          [130.81, 261.63, 329.63, 392.0],  // C
          [98.0, 196.0, 246.94, 392.0],     // G
        ],
        leadPattern: [
          440.0, 523.25, 659.25, 587.33, 523.25, 659.25, 783.99, 659.25,
          880.0, 783.99, 659.25, 587.33, 523.25, 587.33, 659.25, 783.99,
        ],
        arpPattern: [220, 329.63, 440, 523.25, 440, 329.63, 392, 523.25],
      },
      selection: {
        // B. CHARACTER SELECTION — CHOOSE YOUR HERO: Confident futuristic heroic adventure
        bpm: 118,
        cutoff: 2650,
        style: 'heroic',
        percussionLevel: 0.85,
        padLevel: 0.82,
        progression: [
          [146.83, 293.66, 369.99, 440.0],  // D
          [98.0, 196.0, 293.66, 392.0],     // G
          [123.47, 246.94, 293.66, 369.99], // Bm
          [110.0, 220.0, 329.63, 440.0],    // A
        ],
        leadPattern: [
          587.33, 739.99, 880.0, 739.99, 783.99, 880.0, 1174.66, 880.0,
          987.77, 880.0, 739.99, 659.25, 587.33, 739.99, 880.0, 1174.66,
        ],
        arpPattern: [293.66, 440, 587.33, 739.99, 587.33, 440, 493.88, 659.25],
      },
      city: {
        // C. WORLD EXPLORATION — NEXUS CITY: Medium-tempo sci-fi electronic adventure
        bpm: 118,
        cutoff: 2450,
        style: 'adventure',
        percussionLevel: 0.85,
        padLevel: 0.85,
        progression: [
          [130.81, 261.63, 329.63, 392.0],
          [98.0, 196.0, 293.66, 392.0],
          [110.0, 220.0, 261.63, 329.63],
          [87.31, 174.61, 261.63, 349.23],
        ],
        leadPattern: [523.25, 659.25, 783.99, 1046.5, 880.0, 783.99, 659.25, 587.33],
        arpPattern: [261.63, 392, 523.25, 659.25, 523.25, 392, 440, 587.33],
      },
      mission: {
        // D. MISSION GAMEPLAY — FOCUS MODE: Softer rhythm, minimal percussion, warm pads
        bpm: 96,
        cutoff: 1280,
        style: 'focus',
        percussionLevel: 0.18,
        padLevel: 0.95,
        progression: [
          [164.81, 329.63, 392.0, 493.88],  // Em
          [130.81, 261.63, 329.63, 392.0],  // C
          [146.83, 293.66, 349.23, 440.0],  // Dm
          [98.0, 196.0, 293.66, 392.0],     // G
        ],
        leadPattern: [659.25, 587.33, 523.25, 587.33, 659.25, 783.99, 659.25, 493.88],
        arpPattern: [329.63, 392, 493.88, 523.25, 493.88, 392, 329.63, 440],
      },
      mission_1: {
        // Kota NEXUS: Futuristic metropolis exploration
        bpm: 118,
        cutoff: 2450,
        style: 'adventure',
        percussionLevel: 0.85,
        padLevel: 0.85,
        progression: [
          [130.81, 261.63, 329.63, 392.0],
          [164.81, 329.63, 392.0, 493.88],
          [110.0, 220.0, 261.63, 329.63],
          [98.0, 196.0, 293.66, 392.0],
        ],
        leadPattern: [523.25, 659.25, 783.99, 659.25, 880.0, 783.99, 659.25, 783.99],
        arpPattern: [261.63, 392, 523.25, 659.25, 523.25, 392, 440, 587.33],
      },
      mission_2: {
        // Makmal Neural: Kinetic sparkling sci-fi lab groove
        bpm: 120,
        cutoff: 2550,
        style: 'adventure',
        percussionLevel: 0.82,
        padLevel: 0.8,
        progression: [
          [146.83, 293.66, 349.23, 440.0],
          [116.54, 233.08, 293.66, 349.23],
          [130.81, 261.63, 329.63, 392.0],
          [110.0, 220.0, 277.18, 329.63],
        ],
        leadPattern: [587.33, 698.46, 880.0, 1046.5, 880.0, 698.46, 783.99, 659.25],
        arpPattern: [293.66, 440, 587.33, 698.46, 587.33, 440, 523.25, 659.25],
      },
      mission_3: {
        // Stesen Orbital: Panoramic space-station synth & orchestral swell
        bpm: 114,
        cutoff: 2250,
        style: 'epic',
        percussionLevel: 0.72,
        padLevel: 1.0,
        progression: [
          [164.81, 329.63, 415.3, 493.88],
          [110.0, 220.0, 329.63, 440.0],
          [146.83, 293.66, 369.99, 440.0],
          [123.47, 246.94, 369.99, 493.88],
        ],
        leadPattern: [659.25, 830.61, 987.77, 880.0, 739.99, 880.0, 987.77, 783.99],
        arpPattern: [329.63, 493.88, 659.25, 830.61, 659.25, 493.88, 440, 587.33],
      },
      mission_4: {
        // Bandar Media Digital: Modern creative broadcast pulse
        bpm: 122,
        cutoff: 2700,
        style: 'heroic',
        percussionLevel: 0.88,
        padLevel: 0.82,
        progression: [
          [87.31, 174.61, 261.63, 349.23],
          [98.0, 196.0, 293.66, 392.0],
          [110.0, 220.0, 329.63, 440.0],
          [130.81, 261.63, 392.0, 523.25],
        ],
        leadPattern: [698.46, 880.0, 1046.5, 987.77, 880.0, 783.99, 659.25, 783.99],
        arpPattern: [349.23, 523.25, 698.46, 880, 698.46, 523.25, 587.33, 783.99],
      },
      mission_5: {
        // Menara Langit: Uplifting climax above the skyline
        bpm: 122,
        cutoff: 2800,
        style: 'heroic',
        percussionLevel: 0.9,
        padLevel: 1.0,
        progression: [
          [130.81, 261.63, 392.0, 523.25],
          [98.0, 196.0, 293.66, 493.88],
          [110.0, 220.0, 329.63, 523.25],
          [87.31, 174.61, 261.63, 440.0],
        ],
        leadPattern: [523.25, 783.99, 1046.5, 987.77, 880.0, 1046.5, 1174.66, 1318.51],
        arpPattern: [261.63, 392, 523.25, 783.99, 659.25, 523.25, 587.33, 783.99],
      },
      teleport: {
        // E. TELEPORTATION — ENERGY TRANSFER: Accelerating rising dimensional pulse
        bpm: 136,
        cutoff: 3200,
        style: 'teleport',
        percussionLevel: 0.9,
        padLevel: 0.95,
        progression: [
          [130.81, 261.63, 392.0, 523.25],
          [146.83, 293.66, 440.0, 587.33],
          [164.81, 329.63, 493.88, 659.25],
          [196.0, 392.0, 587.33, 783.99],
        ],
        leadPattern: [523.25, 659.25, 783.99, 987.77, 1046.5, 1174.66, 1318.51, 1567.98],
        arpPattern: [261.63, 392, 523.25, 659.25, 783.99, 987.77, 1046.5, 1318.51],
      },
      victory: {
        // F. FINAL MISSION — THE LOST SIGNAL RESTORED: Epic celebratory orchestral climax
        bpm: 120,
        cutoff: 3000,
        style: 'victory',
        percussionLevel: 0.95,
        padLevel: 1.1,
        progression: [
          [130.81, 261.63, 329.63, 523.25],  // C
          [123.47, 246.94, 392.0, 587.33],   // G/B
          [110.0, 220.0, 329.63, 523.25],    // Am
          [87.31, 174.61, 261.63, 440.0],    // F
        ],
        leadPattern: [
          523.25, 659.25, 783.99, 1046.5, 1318.51, 1174.66, 1046.5, 1567.98,
          1318.51, 1174.66, 1046.5, 987.77, 880.0, 1046.5, 1318.51, 1567.98,
        ],
        arpPattern: [261.63, 392, 523.25, 783.99, 1046.5, 783.99, 659.25, 1046.5],
      },
      ceremony: {
        // Final Score Dashboard celebratory orchestral adventure
        bpm: 112,
        cutoff: 2400,
        style: 'victory',
        percussionLevel: 0.55,
        padLevel: 1.05,
        progression: [
          [146.83, 293.66, 369.99, 440.0],
          [98.0, 196.0, 293.66, 392.0],
          [110.0, 220.0, 329.63, 554.37],
          [146.83, 293.66, 440.0, 587.33],
        ],
        leadPattern: [587.33, 739.99, 880.0, 1174.66, 987.77, 880.0, 739.99, 880.0],
        arpPattern: [293.66, 440, 587.33, 739.99, 880, 739.99, 587.33, 880],
      },
    };
    return profiles[scene];
  }

  /**
   * Lookahead Web Audio scheduler synthesizing:
   * 1) Warm detuned orchestral string/brass pad
   * 2) Modern sci-fi synth bass & sub pulse
   * 3) Kinetic arpeggio pluck with stereo-feel delay tail
   * 4) Subtle electronic action percussion (muted cleanly during Focus Mode)
   * 5) Heroic dual-oscillator melody motif
   */
  private startHybridMusicEngine(scene: MusicSceneContext): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.musicFilter || !this.musicFadeGain || scene === 'none') return;

    this.stopMusicLoop(false);
    const cfg = this.getThemeProfile(scene);
    const stepDur = 60 / cfg.bpm / 2; // eighth-note duration in seconds

    this.musicFilter.frequency.setTargetAtTime(cfg.cutoff, ctx.currentTime, 0.18);
    this.musicFadeGain.gain.cancelScheduledValues(ctx.currentTime);
    this.musicFadeGain.gain.setValueAtTime(Math.max(0.0001, this.musicFadeGain.gain.value), ctx.currentTime);
    this.musicFadeGain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.55);

    this.stepIndex = 0;
    this.nextNoteTime = ctx.currentTime + 0.04;

    const scheduleStep = (when: number, step: number) => {
      if (!this.ctx || !this.musicFilter || !this.musicEnabled || this.muted) return;
      const chordIdx = Math.floor(step / 8) % cfg.progression.length;
      const barStep = step % 8;
      const phraseBar = Math.floor(step / 8) % 4;
      const chord = cfg.progression[chordIdx];

      // 1. Cinematic Orchestral String / Brass Pad Swell (at bar start)
      if (barStep === 0) {
        const padDur = stepDur * 7.8;
        chord.slice(1).forEach((freq, voiceIdx) => {
          if (!this.ctx || !this.musicFilter) return;
          const oscA = this.ctx.createOscillator();
          const oscB = this.ctx.createOscillator();
          const padFilt = this.ctx.createBiquadFilter();
          const padEnv = this.ctx.createGain();

          oscA.type = cfg.style === 'focus' ? 'triangle' : 'sawtooth';
          oscB.type = 'triangle';
          oscA.frequency.setValueAtTime(freq, when);
          oscB.frequency.setValueAtTime(freq * 1.0035, when); // Subtle lush chorus detune

          padFilt.type = 'lowpass';
          padFilt.frequency.setValueAtTime(cfg.style === 'focus' ? 900 : 1200, when);
          padFilt.frequency.linearRampToValueAtTime(
            cfg.style === 'victory' || cfg.style === 'epic' ? 2300 : 1650,
            when + padDur * 0.45
          );

          const peak = (0.045 - voiceIdx * 0.007) * cfg.padLevel;
          padEnv.gain.setValueAtTime(0.0001, when);
          padEnv.gain.linearRampToValueAtTime(peak, when + Math.min(0.42, padDur * 0.25));
          padEnv.gain.setValueAtTime(peak * 0.85, when + padDur * 0.72);
          padEnv.gain.exponentialRampToValueAtTime(0.0001, when + padDur);

          oscA.connect(padFilt);
          oscB.connect(padFilt);
          padFilt.connect(padEnv);
          padEnv.connect(this.musicFilter);

          oscA.start(when);
          oscB.start(when);
          oscA.stop(when + padDur + 0.05);
          oscB.stop(when + padDur + 0.05);
        });
      }

      // 2. Hybrid Sci-Fi Synth Bass (solid root pulse + syncopated octave)
      const bassActive = cfg.style === 'focus' ? barStep === 0 || barStep === 4 : barStep % 2 === 0 || barStep === 5;
      if (bassActive) {
        const bassOsc = this.ctx.createOscillator();
        const subOsc = this.ctx.createOscillator();
        const bassFilt = this.ctx.createBiquadFilter();
        const bassEnv = this.ctx.createGain();

        const targetFreq = barStep === 5 ? chord[0] * 1.5 : chord[0];
        bassOsc.type = 'sawtooth';
        subOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(targetFreq, when);
        subOsc.frequency.setValueAtTime(targetFreq, when);

        bassFilt.type = 'lowpass';
        bassFilt.frequency.setValueAtTime(cfg.style === 'focus' ? 380 : 620, when);
        bassFilt.frequency.exponentialRampToValueAtTime(240, when + stepDur * 0.9);

        const bassPeak = cfg.style === 'focus' ? 0.11 : 0.17;
        bassEnv.gain.setValueAtTime(0.001, when);
        bassEnv.gain.linearRampToValueAtTime(bassPeak, when + 0.015);
        bassEnv.gain.exponentialRampToValueAtTime(0.0008, when + stepDur * 0.95);

        bassOsc.connect(bassFilt);
        subOsc.connect(bassFilt);
        bassFilt.connect(bassEnv);
        bassEnv.connect(this.musicFilter);

        bassOsc.start(when);
        subOsc.start(when);
        bassOsc.stop(when + stepDur);
        subOsc.stop(when + stepDur);
      }

      // 3. Futuristic Electronic Arpeggiator Texture
      const arpFreq = cfg.arpPattern[(step + chordIdx * 2) % cfg.arpPattern.length];
      if (cfg.style !== 'focus' || barStep % 2 === 0) {
        const arpOsc = this.ctx.createOscillator();
        const arpEnv = this.ctx.createGain();
        arpOsc.type = 'triangle';
        arpOsc.frequency.setValueAtTime(arpFreq, when);

        const arpPeak = cfg.style === 'focus' ? 0.032 : 0.052;
        arpEnv.gain.setValueAtTime(0.0008, when);
        arpEnv.gain.linearRampToValueAtTime(arpPeak, when + 0.012);
        arpEnv.gain.exponentialRampToValueAtTime(0.0005, when + stepDur * 0.85);

        arpOsc.connect(arpEnv);
        arpEnv.connect(this.musicFilter);
        arpOsc.start(when);
        arpOsc.stop(when + stepDur * 0.9);
      }

      // 4. Subtle Action-Adventure Percussion (Kick + Crisp Hat + Cinematic Snare/Tom)
      if (cfg.percussionLevel > 0.2) {
        if (barStep === 0 || barStep === 4 || (cfg.style === 'teleport' && barStep % 2 === 0)) {
          const kick = this.ctx.createOscillator();
          const kickEnv = this.ctx.createGain();
          kick.type = 'sine';
          kick.frequency.setValueAtTime(132, when);
          kick.frequency.exponentialRampToValueAtTime(46, when + 0.09);
          kickEnv.gain.setValueAtTime(0.16 * cfg.percussionLevel, when);
          kickEnv.gain.exponentialRampToValueAtTime(0.001, when + 0.13);
          kick.connect(kickEnv);
          kickEnv.connect(this.musicFilter);
          kick.start(when);
          kick.stop(when + 0.14);
        }

        // Crisp subtle off-beat hi-hat / electronic tick
        if (barStep % 2 === 1 && cfg.percussionLevel >= 0.6) {
          const noiseSrc = this.ctx.createBufferSource();
          noiseSrc.buffer = this.ensureNoiseBuffer(this.ctx);
          const hp = this.ctx.createBiquadFilter();
          hp.type = 'highpass';
          hp.frequency.value = 5400;
          const hatEnv = this.ctx.createGain();
          hatEnv.gain.setValueAtTime(0.025 * cfg.percussionLevel, when);
          hatEnv.gain.exponentialRampToValueAtTime(0.0005, when + 0.045);
          noiseSrc.connect(hp);
          hp.connect(hatEnv);
          hatEnv.connect(this.musicFilter);
          noiseSrc.start(when, Math.random() * 1.5, 0.05);
        }

        // Light cinematic snare/clap pulse on beat 4 (every bar except bar 0 intro feel)
        if (barStep === 4 && (phraseBar > 0 || cfg.style === 'heroic' || cfg.style === 'victory')) {
          const snareNoise = this.ctx.createBufferSource();
          snareNoise.buffer = this.ensureNoiseBuffer(this.ctx);
          const bp = this.ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = 1850;
          bp.Q.value = 0.8;
          const snEnv = this.ctx.createGain();
          snEnv.gain.setValueAtTime(0.042 * cfg.percussionLevel, when);
          snEnv.gain.exponentialRampToValueAtTime(0.0008, when + 0.11);
          snareNoise.connect(bp);
          bp.connect(snEnv);
          snEnv.connect(this.musicFilter);
          snareNoise.start(when, Math.random() * 1.2, 0.12);
        }
      }

      // 5. Expressive Heroic Lead Voice (enters cleanly & evolves across 4-bar phrases)
      const leadIdx = step % cfg.leadPattern.length;
      const shouldPlayLead =
        cfg.style === 'victory' ||
        cfg.style === 'teleport' ||
        (barStep !== 3 && (phraseBar >= 1 || barStep % 2 === 0));

      if (shouldPlayLead) {
        const leadFreq = cfg.leadPattern[leadIdx];
        const leadOsc = this.ctx.createOscillator();
        const leadSub = this.ctx.createOscillator();
        const leadEnv = this.ctx.createGain();

        leadOsc.type = cfg.style === 'focus' ? 'sine' : 'triangle';
        leadSub.type = 'sine';
        leadOsc.frequency.setValueAtTime(leadFreq, when);
        leadSub.frequency.setValueAtTime(leadFreq * 0.5, when);

        const peak = cfg.style === 'focus' ? 0.045 : cfg.style === 'victory' ? 0.092 : 0.074;
        const holdDur = barStep === 6 ? stepDur * 1.6 : stepDur * 0.96;
        leadEnv.gain.setValueAtTime(0.0008, when);
        leadEnv.gain.linearRampToValueAtTime(peak, when + 0.022);
        leadEnv.gain.exponentialRampToValueAtTime(0.0006, when + holdDur);

        leadOsc.connect(leadEnv);
        leadSub.connect(leadEnv);
        leadEnv.connect(this.musicFilter);
        leadOsc.start(when);
        leadSub.start(when);
        leadOsc.stop(when + holdDur + 0.03);
        leadSub.stop(when + holdDur + 0.03);
      }
    };

    const tickScheduler = () => {
      if (!this.ctx || !this.musicEnabled || this.muted || this.ctx.state === 'suspended') return;
      const lookahead = 0.16;
      while (this.nextNoteTime < this.ctx.currentTime + lookahead) {
        scheduleStep(this.nextNoteTime, this.stepIndex);
        this.nextNoteTime += stepDur;
        this.stepIndex += 1;
      }
    };

    tickScheduler();
    this.musicTimer = window.setInterval(tickScheduler, 45);
  }

  private getAmbientProfile(scene: Exclude<MusicSceneContext, 'none'>): AmbientProfile {
    switch (scene) {
      case 'mission_2':
        return {
          baseFreq: 68,
          filterFreq: 420,
          filterQ: 1.8,
          noiseGain: 0.16,
          droneGain: 0.048,
          pingFreqs: [523.25, 659.25, 880],
          pingChance: 0.35,
        };
      case 'mission_3':
        return {
          baseFreq: 55,
          filterFreq: 340,
          filterQ: 2.2,
          noiseGain: 0.14,
          droneGain: 0.055,
          pingFreqs: [392.0, 587.33, 783.99],
          pingChance: 0.4,
        };
      case 'mission_4':
        return {
          baseFreq: 74,
          filterFreq: 480,
          filterQ: 1.2,
          noiseGain: 0.13,
          droneGain: 0.04,
          pingFreqs: [440, 554.37, 659.25],
          pingChance: 0.3,
        };
      case 'mission_5':
      case 'victory':
      case 'ceremony':
        return {
          baseFreq: 65.4,
          filterFreq: 640,
          filterQ: 1.0,
          noiseGain: 0.22,
          droneGain: 0.045,
          pingFreqs: [523.25, 783.99, 1046.5],
          pingChance: 0.32,
        };
      case 'mission':
        return {
          baseFreq: 62,
          filterFreq: 320,
          filterQ: 1.1,
          noiseGain: 0.1,
          droneGain: 0.03,
          pingFreqs: [440, 523.25],
          pingChance: 0.15,
        };
      case 'teleport':
        return {
          baseFreq: 82.4,
          filterFreq: 820,
          filterQ: 2.4,
          noiseGain: 0.24,
          droneGain: 0.06,
          pingFreqs: [659.25, 987.77],
          pingChance: 0.5,
        };
      default:
        // menu, selection, city, mission_1: Futuristic NEXUS city air & energy hum
        return {
          baseFreq: 65.4,
          filterFreq: 480,
          filterQ: 1.3,
          noiseGain: 0.18,
          droneGain: 0.045,
          pingFreqs: [440, 587.33, 659.25],
          pingChance: 0.28,
        };
    }
  }

  /**
   * Continuous Environmental Soundscape (Bunyi Persekitaran)
   * Renders filtered atmospheric wind/city noise, subtle machine harmonics, and distant sci-fi telemetry.
   */
  private startEnvironmentSoundscape(scene: MusicSceneContext): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.ambientFilter || !this.ambientFadeGain || scene === 'none') return;

    this.stopEnvironmentSoundscape(false);
    const prof = this.getAmbientProfile(scene);
    const now = ctx.currentTime;

    this.ambientFilter.frequency.setTargetAtTime(prof.filterFreq, now, 0.35);
    this.ambientFilter.Q.setTargetAtTime(prof.filterQ, now, 0.35);

    const noise = ctx.createBufferSource();
    noise.buffer = this.ensureNoiseBuffer(ctx);
    noise.loop = true;
    const nGain = ctx.createGain();
    nGain.gain.value = prof.noiseGain;
    noise.connect(nGain);
    nGain.connect(this.ambientFilter);
    noise.start(now);
    this.ambientNoiseSource = noise;

    const droneA = ctx.createOscillator();
    const droneB = ctx.createOscillator();
    const dGain = ctx.createGain();
    droneA.type = 'sine';
    droneB.type = 'triangle';
    droneA.frequency.setValueAtTime(prof.baseFreq, now);
    droneB.frequency.setValueAtTime(prof.baseFreq * 1.5, now);
    dGain.gain.value = prof.droneGain;
    droneA.connect(dGain);
    droneB.connect(dGain);
    dGain.connect(this.ambientFilter);
    droneA.start(now);
    droneB.start(now);
    this.ambientDroneOsc = droneA;
    this.ambientDroneOsc2 = droneB;

    this.ambientFadeGain.gain.cancelScheduledValues(now);
    this.ambientFadeGain.gain.setValueAtTime(Math.max(0.0001, this.ambientFadeGain.gain.value), now);
    this.ambientFadeGain.gain.linearRampToValueAtTime(1.0, now + 0.75);

    // Occasional distant sci-fi telemetry chime / sky-traffic whoosh
    this.ambientTimer = window.setInterval(() => {
      if (!this.ctx || !this.ambientFilter || !this.ambientEnabled || this.muted) return;
      if (this.ctx.state === 'suspended' || Math.random() > prof.pingChance) return;
      const t = this.ctx.currentTime;
      if (Math.random() < 0.55) {
        // Distant soft telemetry harmonic
        const freq = prof.pingFreqs[Math.floor(Math.random() * prof.pingFreqs.length)];
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0005, t);
        g.gain.linearRampToValueAtTime(0.025, t + 0.14);
        g.gain.exponentialRampToValueAtTime(0.0003, t + 1.1);
        osc.connect(g);
        g.connect(this.ambientFilter);
        osc.start(t);
        osc.stop(t + 1.15);
      } else {
        // Distant hover-transport pass-by filter sweep
        const pass = this.ctx.createBufferSource();
        pass.buffer = this.ensureNoiseBuffer(this.ctx);
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(220, t);
        bp.frequency.exponentialRampToValueAtTime(640, t + 0.75);
        bp.frequency.exponentialRampToValueAtTime(190, t + 1.6);
        bp.Q.value = 2.4;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0005, t);
        g.gain.linearRampToValueAtTime(0.05, t + 0.7);
        g.gain.exponentialRampToValueAtTime(0.0004, t + 1.65);
        pass.connect(bp);
        bp.connect(g);
        g.connect(this.ambientFilter);
        pass.start(t, 0, 1.7);
      }
    }, 2800);
  }

  private stopEnvironmentSoundscape(fadeOut = false): void {
    if (this.ambientTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    }
    if (fadeOut && this.ambientFadeGain && this.ctx) {
      this.ambientFadeGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.15);
    }
    try {
      this.ambientNoiseSource?.stop();
    } catch {
      // Ignore already stopped
    }
    try {
      this.ambientDroneOsc?.stop();
    } catch {
      // Ignore
    }
    try {
      this.ambientDroneOsc2?.stop();
    } catch {
      // Ignore
    }
    this.ambientNoiseSource = null;
    this.ambientDroneOsc = null;
    this.ambientDroneOsc2 = null;
  }

  private connectSfx(node: AudioNode, withSparkle = false): void {
    if (this.sfxGain) {
      node.connect(this.sfxGain);
      if (withSparkle && this.sfxDelay) {
        node.connect(this.sfxDelay);
      }
    } else if (this.ctx) {
      node.connect(this.ctx.destination);
    }
  }

  private canPlaySfx(): boolean {
    return this.soundEnabled && !this.muted;
  }

  public playClick(): void {
    this.userUnlocked = true;
    if (!this.canPlaySfx()) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.05);
    gain.gain.setValueAtTime(0.075, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    osc.connect(gain);
    this.connectSfx(gain);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  /**
   * Subtle non-repetitive futuristic boot footsteps synced to walking/running speed.
   */
  public playFootstep(running = false): void {
    if (!this.canPlaySfx()) return;
    const nowMs = performance.now();
    const minInterval = running ? 250 : 390;
    if (nowMs - this.lastFootstepTime < minInterval) return;
    this.lastFootstepTime = nowMs;

    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const jitter = 0.94 + Math.random() * 0.12;

    // Soft muted boot thump
    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.type = 'triangle';
    thump.frequency.setValueAtTime((running ? 132 : 106) * jitter, now);
    thump.frequency.exponentialRampToValueAtTime(46, now + 0.055);
    thumpGain.gain.setValueAtTime(running ? 0.055 : 0.038, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    thump.connect(thumpGain);
    this.connectSfx(thumpGain);
    thump.start(now);
    thump.stop(now + 0.075);

    // Subtle crisp boot texture transient
    const scuff = ctx.createBufferSource();
    scuff.buffer = this.ensureNoiseBuffer(ctx);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = (running ? 1350 : 980) * jitter;
    bp.Q.value = 1.4;
    const scuffGain = ctx.createGain();
    scuffGain.gain.setValueAtTime(running ? 0.028 : 0.018, now);
    scuffGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.045);
    scuff.connect(bp);
    bp.connect(scuffGain);
    this.connectSfx(scuffGain);
    scuff.start(now, Math.random() * 1.4, 0.05);
  }

  public playJump(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(510, now + 0.14);
    gain.gain.setValueAtTime(0.075, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    this.connectSfx(gain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playLand(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(125, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.09);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    this.connectSfx(gain);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  public playInteract(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 783.99].forEach((freq, i) => {
      const t = now + i * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.075, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      this.connectSfx(gain, true);
      osc.start(t);
      osc.stop(t + 0.13);
    });
  }

  /**
   * XP REWARD: Satisfying digital reward collection sound + short rising electronic chime.
   */
  public playCollect(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [659.25, 987.77, 1318.51, 1567.98].forEach((freq, i) => {
      const t = now + i * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 3 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.085, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.24);
      osc.connect(gain);
      this.connectSfx(gain, true);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  }

  public playXpReward(): void {
    this.playCollect();
  }

  public playAlert(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [0, 0.18].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(460, now + offset);
      osc.frequency.linearRampToValueAtTime(340, now + offset + 0.13);
      gain.gain.setValueAtTime(0.065, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.15);
      osc.connect(gain);
      this.connectSfx(gain);
      osc.start(now + offset);
      osc.stop(now + offset + 0.16);
    });
  }

  public playPortalWhoosh(): void {
    this.userUnlocked = true;
    if (!this.canPlaySfx()) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.38);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.44);
    osc.connect(gain);
    this.connectSfx(gain, true);
    osc.start(now);
    osc.stop(now + 0.46);
  }

  /**
   * TELEPORTATION — ENERGY TRANSFER:
   * Synchronized multi-layered SFX across all 6 Quantum Ascension phases:
   * low energy hum -> rising charge -> pulsing surge -> controlled whoosh -> warp glide -> energy release.
   */
  public playTeleportPhase(phase: TeleportSfxPhase): void {
    this.userUnlocked = true;
    if (!this.canPlaySfx()) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (phase === 'activate') {
      // 1. Low futuristic energy hum + activation lock
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sawtooth';
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(180, now);
      lp.frequency.exponentialRampToValueAtTime(520, now + 1.15);
      sub.frequency.setValueAtTime(72, now);
      sub.frequency.exponentialRampToValueAtTime(145, now + 1.15);
      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.linearRampToValueAtTime(0.11, now + 0.28);
      subGain.gain.exponentialRampToValueAtTime(0.0015, now + 1.25);
      sub.connect(lp);
      lp.connect(subGain);
      this.connectSfx(subGain);
      sub.start(now);
      sub.stop(now + 1.3);

      const ping = ctx.createOscillator();
      const pingGain = ctx.createGain();
      ping.type = 'sine';
      ping.frequency.setValueAtTime(523.25, now + 0.16);
      ping.frequency.exponentialRampToValueAtTime(783.99, now + 0.72);
      pingGain.gain.setValueAtTime(0.001, now + 0.16);
      pingGain.gain.linearRampToValueAtTime(0.085, now + 0.25);
      pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.92);
      ping.connect(pingGain);
      this.connectSfx(pingGain, true);
      ping.start(now + 0.16);
      ping.stop(now + 0.96);
    } else if (phase === 'eruption') {
      // 2. Gradually rising electronic charge + surging pulses
      const sweep = ctx.createOscillator();
      const g = ctx.createGain();
      sweep.type = 'triangle';
      sweep.frequency.setValueAtTime(150, now);
      sweep.frequency.exponentialRampToValueAtTime(620, now + 1.1);
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.14, now + 0.2);
      g.gain.exponentialRampToValueAtTime(0.002, now + 1.25);
      sweep.connect(g);
      this.connectSfx(g, true);
      sweep.start(now);
      sweep.stop(now + 1.3);

      [0, 0.24, 0.45, 0.63, 0.78].forEach((offset, idx) => {
        const p = ctx.createOscillator();
        const pg = ctx.createGain();
        p.type = 'sine';
        p.frequency.setValueAtTime(320 + idx * 95, now + offset);
        pg.gain.setValueAtTime(0.075, now + offset);
        pg.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.14);
        p.connect(pg);
        this.connectSfx(pg);
        p.start(now + offset);
        p.stop(now + offset + 0.15);
      });
    } else if (phase === 'ascend') {
      // 3. Shimmering harmonic levitation & increasing energy pulses
      [261.63, 392.0, 523.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.35, now + 2.0);
        g.gain.setValueAtTime(0.001, now + i * 0.08);
        g.gain.linearRampToValueAtTime(0.068, now + i * 0.08 + 0.24);
        g.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
        osc.connect(g);
        this.connectSfx(g, true);
        osc.start(now + i * 0.08);
        osc.stop(now + 2.25);
      });
    } else if (phase === 'transform') {
      // 4. Controlled cinematic whoosh + warp energy burst
      const whoosh = ctx.createBufferSource();
      whoosh.buffer = this.ensureNoiseBuffer(ctx);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(280, now);
      bp.frequency.exponentialRampToValueAtTime(2600, now + 0.75);
      bp.Q.value = 1.6;
      const wg = ctx.createGain();
      wg.gain.setValueAtTime(0.001, now);
      wg.gain.linearRampToValueAtTime(0.18, now + 0.55);
      wg.gain.exponentialRampToValueAtTime(0.002, now + 1.1);
      whoosh.connect(bp);
      bp.connect(wg);
      this.connectSfx(wg, true);
      whoosh.start(now, 0, 1.15);

      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(1280, now + 0.85);
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.12, now + 0.14);
      g.gain.exponentialRampToValueAtTime(0.002, now + 1.0);
      osc.connect(g);
      this.connectSfx(g, true);
      osc.start(now);
      osc.stop(now + 1.05);
    } else if (phase === 'tunnel') {
      // 5. Dimensional velocity glide + atmospheric air sweep
      const wind = ctx.createBufferSource();
      wind.buffer = this.ensureNoiseBuffer(ctx);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(750, now);
      bp.frequency.linearRampToValueAtTime(1450, now + 1.0);
      bp.frequency.linearRampToValueAtTime(620, now + 1.9);
      bp.Q.value = 1.2;
      const wg = ctx.createGain();
      wg.gain.setValueAtTime(0.001, now);
      wg.gain.linearRampToValueAtTime(0.11, now + 0.4);
      wg.gain.exponentialRampToValueAtTime(0.001, now + 1.95);
      wind.connect(bp);
      bp.connect(wg);
      this.connectSfx(wg);
      wind.start(now, 0, 2.0);

      [329.63, 493.88, 659.25].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.linearRampToValueAtTime(freq * 1.5, now + 1.65);
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.055 - i * 0.01, now + 0.35);
        g.gain.exponentialRampToValueAtTime(0.001, now + 1.85);
        osc.connect(g);
        this.connectSfx(g, true);
        osc.start(now);
        osc.stop(now + 1.9);
      });
    } else if (phase === 'arrive') {
      // 6. Soft controlled energy release + bright arrival chime
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const t = now + i * 0.075;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = i === 3 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(0.095, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.56);
        osc.connect(g);
        this.connectSfx(g, true);
        osc.start(t);
        osc.stop(t + 0.6);
      });
    }
  }

  /**
   * MISSION COMPLETED: Cinematic achievement accent + radiant harmonic flourish.
   */
  public playMissionUnlock(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Warm cinematic sub-swell
    const pad = ctx.createOscillator();
    const padGain = ctx.createGain();
    pad.type = 'triangle';
    pad.frequency.setValueAtTime(196.0, now);
    padGain.gain.setValueAtTime(0.001, now);
    padGain.gain.linearRampToValueAtTime(0.11, now + 0.08);
    padGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    pad.connect(padGain);
    this.connectSfx(padGain, true);
    pad.start(now);
    pad.stop(now + 0.9);

    const notes = [392.0, 493.88, 587.33, 783.99, 987.77, 1174.66];
    notes.forEach((freq, i) => {
      const t = now + i * 0.075;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i >= 4 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.095, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.42);
      osc.connect(gain);
      this.connectSfx(gain, true);
      osc.start(t);
      osc.stop(t + 0.44);
    });
  }

  /**
   * CORRECT ANSWER: Bright futuristic confirmation sound + pleasant digital chime.
   */
  public playSuccess(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const now = ctx.currentTime + i * 0.065;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === notes.length - 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(i === notes.length - 1 ? 0.11 : 0.085, now + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.34);
      osc.connect(gain);
      this.connectSfx(gain, true);
      osc.start(now);
      osc.stop(now + 0.36);
    });
  }

  /**
   * INCORRECT ANSWER: Gentle low-pitched encouraging feedback (non-threatening).
   */
  public playIncorrect(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [329.63, 261.63].forEach((freq, i) => {
      const t = now + i * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.068, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.22);
      osc.connect(gain);
      this.connectSfx(gain);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  public playAchievement(): void {
    this.playMissionUnlock();
  }

  /**
   * FINAL VICTORY: Epic cinematic fanfare transitioning into celebration & score dashboard.
   */
  public playVictory(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [130.81, 261.63, 392.0].forEach((freq) => {
      const pad = ctx.createOscillator();
      const g = ctx.createGain();
      pad.type = 'sawtooth';
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1400;
      pad.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.06, now + 0.14);
      g.gain.exponentialRampToValueAtTime(0.0008, now + 1.5);
      pad.connect(lp);
      lp.connect(g);
      this.connectSfx(g, true);
      pad.start(now);
      pad.stop(now + 1.55);
    });

    const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
    fanfare.forEach((freq, i) => {
      const t = now + i * 0.095;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.11, t + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.65);
      osc.connect(gain);
      this.connectSfx(gain, true);
      osc.start(t);
      osc.stop(t + 0.68);
    });
  }

  public playHint(): void {
    this.playIncorrect();
  }

  public playRoboChirp(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(760, now);
    osc.frequency.setValueAtTime(980, now + 0.06);
    osc.frequency.setValueAtTime(860, now + 0.12);
    gain.gain.setValueAtTime(0.052, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    osc.connect(gain);
    this.connectSfx(gain, true);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public speakMalay(text: string): void {
    if (!this.canPlaySfx() || !this.voiceEnabled || typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'ms-MY';
      utter.rate = 0.96;
      utter.pitch = 1.04;
      window.speechSynthesis.speak(utter);
    } catch {
      // Ignore speech synthesis errors on unsupported browsers
    }
  }

  public stopSpeech(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
  }
}

export const audioManager = new AudioManager();
export const soundEngine = audioManager;
