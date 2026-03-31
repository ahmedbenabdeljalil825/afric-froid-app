/**
 * High-fidelity 'Industrial Bell' sound synthesis using Web Audio API.
 * Uses additive synthesis (multiple inharmonic sine partials) with linear/exponential decay.
 */

let audioContext: AudioContext | null = null;

/**
 * Initializes/resumes the AudioContext on user gesture.
 * Browsers block audio until a user intereacts with the page.
 */
export const initAudio = async () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }
    return audioContext;
};

/**
 * Synthesizes a realistic industrial siren sound.
 * @param duration Total time of the siren (default: 3.0s)
 */
export const playSiren = async (duration = 3.0) => {
    const ctx = await initAudio();
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    // Fade in to avoid clicks, then fade out at the end
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.3, now + 0.1);
    masterGain.gain.setValueAtTime(0.3, now + duration - 0.5);
    masterGain.gain.linearRampToValueAtTime(0, now + duration);
    masterGain.connect(ctx.destination);

    // Main oscillator (harsh sawtooth waveform)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(600, now); // Base frequency 600Hz

    // Second oscillator slightly detuned for thickness/dissonance
    const osc2 = ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(615, now); // Slightly detuned

    // LFO (Low Frequency Oscillator) to sweep the frequency up and down like a siren
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.5, now); // 0.5Hz = 1 full cycle every 2 seconds

    // Gain to control the depth of the frequency sweep
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(300, now); // The sweep will go +/- 300Hz (300Hz to 900Hz)

    // Connect LFO to modulate both oscillators' frequencies
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);

    // Connect oscillators to the master output
    osc1.connect(masterGain);
    osc2.connect(masterGain);

    // Start everything
    lfo.start(now);
    osc1.start(now);
    osc2.start(now);

    // Stop everything at the end of the duration
    lfo.stop(now + duration);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
};
