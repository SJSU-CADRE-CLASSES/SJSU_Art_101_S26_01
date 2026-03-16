/**
 * PRESSURE CONSOLE — Audio Feedback System
 * Sound-based operational reports for hominids who sense through hearing.
 * Chimes, pings, tones replace visual feedback.
 */

const AudioSystem = (function () {
  let audioContext = null;
  let masterGain = null;

  const TONES = {
    confirm: { freq: 440, duration: 0.15, type: 'sine' },
    click: { freq: 660, duration: 0.08, type: 'square' },
    warning: { freq: 330, duration: 0.25, type: 'sawtooth' },
    ascent: { freq: 523, duration: 0.2, type: 'sine' },
    descent: { freq: 392, duration: 0.2, type: 'sine' },
    dial: { freq: 880, duration: 0.05, type: 'sine' },
    lever: { freq: 220, duration: 0.1, type: 'triangle' },
  };

  function init() {
    if (audioContext) return audioContext;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.4;
    masterGain.connect(audioContext.destination);
    return audioContext;
  }

  function playTone(config, variation = 0) {
    const ctx = init();
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const freq = config.freq * (1 + variation * 0.05);
    osc.type = config.type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.8, ctx.currentTime + config.duration);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + config.duration);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + config.duration);
  }

  function playNavTone(freqs) {
    const ctx = init();
    if (ctx.state === 'suspended') ctx.resume();

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.12);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.12);
    });
  }

  function playChime(sequence = [523, 659, 784]) {
    const ctx = init();
    if (ctx.state === 'suspended') ctx.resume();

    sequence.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.3);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.3);
    });
  }

  function playSonarPing() {
    const ctx = init();
    if (ctx.state === 'suspended') ctx.resume();

    // Multilayer ping - multiple frequencies for rich echo
    const layers = [1200, 800, 400];
    layers.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const delay = ctx.createDelay(0.5);
      const feedback = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.3, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.4 - i * 0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08 + i * 0.02);

      delay.delayTime.setValueAtTime(0.02 + i * 0.01, ctx.currentTime);
      feedback.gain.value = 0.3;

      osc.connect(gain);
      gain.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(masterGain);

      osc.start(ctx.currentTime + i * 0.01);
      osc.stop(ctx.currentTime + 0.1 + i * 0.02);
    });
  }

  function playEcho(distance, intensity) {
    const ctx = init();
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const delayTime = Math.min(0.5, distance * 0.01);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600 - distance * 2, ctx.currentTime);

    gain.gain.setValueAtTime(intensity * 0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(ctx.currentTime + delayTime);
    osc.stop(ctx.currentTime + delayTime + 0.1);
  }

  function speakReport(text) {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.9;
      u.pitch = 1;
      u.volume = 0.8;
      window.speechSynthesis.speak(u);
    }
  }

  return {
    init,
    playNavTone,
    playTone: (name) => {
      const config = TONES[name];
      if (config) playTone(config, Math.random() * 0.2 - 0.1);
    },
    playChime,
    playSonarPing,
    playEcho,
    speakReport,
    TONES,
  };
})();
