class AudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.volume = 0.5;
        this.musicEnabled = true;
        
        this.musicInterval = null;
        this.musicStep = 0;
        
        // Pentatonic scale in A minor for arpeggios
        this.scale = [220, 261.63, 293.66, 329.63, 392.00, 440, 523.25, 587.33, 659.25, 783.99, 880];
        // Chord progressions (bass notes): Am -> F -> C -> G
        this.bassNotes = [110.00, 87.31, 130.81, 98.00];
        
        // Pre-create noise buffer for collision sounds
        this.noiseBuffer = null;
    }

    /**
     * Initializes the Audio Context on user gesture to comply with autoplay policy.
     */
    init() {
        if (this.ctx) return;
        
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            console.warn("Web Audio API not supported in this browser.");
            return;
        }

        try {
            this.ctx = new AudioContextClass();
            
            // Master volume gain node
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            // Music volume gain node
            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.setValueAtTime(0.08, this.ctx.currentTime); // Ambient background level
            this.musicGain.connect(this.masterGain);

            // Generate noise buffer
            this.noiseBuffer = this.createNoiseBuffer();

            // Resume context if suspended
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }

            if (this.musicEnabled) {
                this.startMusic();
            }
        } catch (e) {
            console.error("Failed to initialize AudioContext", e);
        }
    }

    createNoiseBuffer() {
        if (!this.ctx) return null;
        const bufferSize = this.ctx.sampleRate * 0.25; // 0.25 seconds of noise
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
        }
    }

    toggleMusic(enabled) {
        this.musicEnabled = enabled;
        if (enabled) {
            this.startMusic();
        } else {
            this.stopMusic();
        }
    }

    startMusic() {
        this.stopMusic();
        if (!this.ctx) return;

        this.musicStep = 0;
        const stepDuration = 0.25; // Quarter second per step

        const playSynthStep = () => {
            if (!this.ctx || this.ctx.state === 'suspended' || !this.musicEnabled) return;

            const t = this.ctx.currentTime;
            const beat = this.musicStep % 16;
            const chordIndex = Math.floor(this.musicStep / 16) % 4;

            // Bass drone chord changes every 16 steps (4 seconds)
            if (beat === 0) {
                this.playBassTone(this.bassNotes[chordIndex], t, stepDuration * 15);
            }

            // High pluck arpeggio: soft ambient note on some steps
            const synthPattern = [0, 3, 6, 8, 10, 12, 14];
            if (synthPattern.includes(beat)) {
                // Pick a note from the pentatonic scale relative to the chord
                const rootFreq = this.bassNotes[chordIndex];
                let noteIndex = 3; // default
                
                if (beat === 3) noteIndex = 5;
                if (beat === 6) noteIndex = 4;
                if (beat === 8) noteIndex = 6;
                if (beat === 10) noteIndex = 7;
                if (beat === 12) noteIndex = 5;
                if (beat === 14) noteIndex = 8;
                
                // Add minor random deviation
                if (Math.random() > 0.6) noteIndex = (noteIndex + 1) % this.scale.length;
                
                const noteFreq = this.scale[noteIndex];
                this.playPluckTone(noteFreq, t, stepDuration * 1.5);
            }

            this.musicStep++;
        };

        // Standard timer loop
        this.musicInterval = setInterval(playSynthStep, stepDuration * 1000);
    }

    stopMusic() {
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
    }

    playBassTone(freq, startTime, duration) {
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        // Lowpass filter makes it warm and atmospheric
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, startTime);

        // Envelope
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.5); // Slow fade-in
        gain.gain.setValueAtTime(0.3, startTime + duration - 0.5);
        gain.gain.linearRampToValueAtTime(0, startTime + duration); // Smooth fade-out

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(startTime);
        osc.stop(startTime + duration);
    }

    playPluckTone(freq, startTime, duration) {
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        // Bandpass filter to isolate the sweet frequencies
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, startTime);

        // Pluck envelope: sudden rise, quick release
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(startTime);
        osc.stop(startTime + duration);
    }

    /**
     * SOUND FX: Fliers jumping flap sound
     */
    playFlap() {
        this.init();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        // Fast pitch sweep upwards to mimic wing movement
        osc.frequency.setValueAtTime(250, t);
        osc.frequency.exponentialRampToValueAtTime(550, t + 0.12);

        // Gain envelope
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.13);
    }

    /**
     * SOUND FX: Clearing pipe score sound
     */
    playScore() {
        this.init();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        
        // Double tone chime
        const note1 = 587.33; // D5
        const note2 = 880.00; // A5

        osc.frequency.setValueAtTime(note1, t);
        osc.frequency.setValueAtTime(note2, t + 0.08);

        gain.gain.setValueAtTime(0.12, t);
        gain.gain.setValueAtTime(0.12, t + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.26);
    }

    /**
     * SOUND FX: Crashing hit sound
     */
    playHit() {
        this.init();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        
        // 1. Synth bass crash tone
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.25);
        
        oscGain.gain.setValueAtTime(0.25, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        
        osc.connect(oscGain);
        oscGain.connect(this.masterGain);
        
        osc.start(t);
        osc.stop(t + 0.26);

        // 2. Noise explosion burst
        if (this.noiseBuffer) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;
            
            const noiseFilter = this.ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(500, t);
            noiseFilter.Q.setValueAtTime(2.0, t);
            
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.3, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            
            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.masterGain);
            
            noise.start(t);
            noise.stop(t + 0.21);
        }
    }

    /**
     * SOUND FX: Falling down to ground sound
     */
    playFall() {
        this.init();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        // Falling slide down
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.linearRampToValueAtTime(40, t + 0.45);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.46);
    }
}

// Create a globally accessible singleton instance
const GameAudio = new AudioEngine();
window.GameAudio = GameAudio;
window.AudioEngine = GameAudio; // Maintain compatibility
