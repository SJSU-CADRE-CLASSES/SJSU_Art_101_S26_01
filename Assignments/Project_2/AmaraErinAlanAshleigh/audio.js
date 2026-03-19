// Shared ambient + retro "key click" audio for all pages.
// Uses Web Audio so we don't depend on external mp3 files.
(function () {
    if (window.__tritonAudio) return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const engine = {
        ctx: null,
        master: null,
        ambientStarted: false,
        resumeRequested: false,
    };

    function ensureContext() {
        if (!engine.ctx) {
            engine.ctx = new AudioCtx();

            const compressor = engine.ctx.createDynamicsCompressor();
            compressor.threshold.value = -24;
            compressor.knee.value = 20;
            compressor.ratio.value = 8;
            compressor.attack.value = 0.01;
            compressor.release.value = 0.25;

            engine.master = engine.ctx.createGain();
            engine.master.gain.value = 0.035; // soft volume

            compressor.connect(engine.master);
            engine.master.connect(engine.ctx.destination);
        }
        return engine.ctx;
    }

    function startAmbient() {
        if (engine.ambientStarted) return;
        engine.ambientStarted = true;

        const ctx = ensureContext();
        const now = ctx.currentTime;

        // Drone oscillators
        const osc1 = ctx.createOscillator();
        osc1.type = "sine";
        osc1.frequency.value = 54.0;

        const osc2 = ctx.createOscillator();
        osc2.type = "triangle";
        osc2.frequency.value = 108.0;
        osc2.detune.value = -7;

        // Noise bed (filtered)
        const bufferSize = ctx.sampleRate * 1.5;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            // Brown-ish noise by integrating white noise a bit
            output[i] = (Math.random() * 2 - 1) * 0.25;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = "bandpass";
        noiseFilter.frequency.value = 260;
        noiseFilter.Q.value = 0.7;

        const droneFilter = ctx.createBiquadFilter();
        droneFilter.type = "lowpass";
        droneFilter.frequency.value = 420;
        droneFilter.Q.value = 0.4;

        const droneGain = ctx.createGain();
        droneGain.gain.value = 0.018;

        const noiseGain = ctx.createGain();
        noiseGain.gain.value = 0.010;

        // Slightly animate filter for a "breathing" feeling.
        const lfo = ctx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.value = 0.06;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 80;
        lfo.connect(lfoGain);
        lfoGain.connect(droneFilter.frequency);

        osc1.connect(droneFilter);
        osc2.connect(droneFilter);
        droneFilter.connect(droneGain);
        droneGain.connect(engine.master);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(engine.master);

        lfo.start(now);
        osc1.start(now);
        osc2.start(now);
        noise.start(now);

        // Fade in gently (avoid clicks)
        engine.master.gain.setValueAtTime(0.0001, now);
        engine.master.gain.exponentialRampToValueAtTime(0.035, now + 1.4);
    }

    function resumeIfNeeded() {
        const ctx = ensureContext();
        if (ctx.state === "suspended" && !engine.resumeRequested) {
            engine.resumeRequested = true;
            ctx.resume().catch(() => {});
        }
        if (!engine.ambientStarted) startAmbient();
    }

    function playKeyClick() {
        const ctx = ensureContext();
        const now = ctx.currentTime;

        // Short retro tick using square -> lowpass.
        const osc = ctx.createOscillator();
        osc.type = "square";
        osc.frequency.value = 560 + Math.random() * 220;

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 1300;
        filter.Q.value = 0.7;

        const gain = ctx.createGain();
        gain.gain.value = 0.0001;

        // Envelope
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.05, now + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(engine.master);

        osc.start(now);
        osc.stop(now + 0.06);
    }

    function shouldPlayClick(target) {
        if (!target) return false;
        if (typeof target.closest === "function") {
            return !!target.closest("button");
        }
        return target.tagName === "BUTTON";
    }

    // Start audio after first interaction (autoplay restrictions).
    document.addEventListener(
        "pointerdown",
        () => {
            resumeIfNeeded();
        },
        { once: true }
    );
    document.addEventListener(
        "keydown",
        () => {
            resumeIfNeeded();
        },
        { once: true }
    );

    // Key click on any button press.
    document.addEventListener("click", (e) => {
        if (!shouldPlayClick(e.target)) return;
        try {
            resumeIfNeeded();
            playKeyClick();
        } catch (err) {
            // ignore audio errors
        }
    });

    window.__tritonAudio = engine;
})();

