// Sound for Nusantara Skies: everything is synthesised with WebAudio, no
// audio files and no network. Engine hum follows the throttle, wind follows
// speed, and rings, landings, drops and crashes each get their own cue.
export function createAudio() {
  const audio = {
    ctx: null,
    master: null,
    engineOsc: null,
    engineOsc2: null,
    engineGain: null,
    windGain: null,
    muted: false,
    started: false,
  };

  function ensure() {
    if (audio.ctx) return true;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      audio.ctx = new Ctx();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = audio.muted ? 0 : 0.5;
      audio.master.connect(audio.ctx.destination);

      // Engine: two detuned saws through a lowpass, gain tied to throttle.
      audio.engineGain = audio.ctx.createGain();
      audio.engineGain.gain.value = 0;
      const filter = audio.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      audio.engineOsc = audio.ctx.createOscillator();
      audio.engineOsc.type = 'sawtooth';
      audio.engineOsc.frequency.value = 62;
      audio.engineOsc2 = audio.ctx.createOscillator();
      audio.engineOsc2.type = 'sawtooth';
      audio.engineOsc2.frequency.value = 93;
      audio.engineOsc.connect(filter);
      audio.engineOsc2.connect(filter);
      filter.connect(audio.engineGain);
      audio.engineGain.connect(audio.master);
      audio.engineOsc.start();
      audio.engineOsc2.start();

      // Wind: looped noise buffer through a bandpass.
      const len = audio.ctx.sampleRate * 2;
      const buffer = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const noise = audio.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const band = audio.ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 700;
      band.Q.value = 0.6;
      audio.windGain = audio.ctx.createGain();
      audio.windGain.gain.value = 0;
      noise.connect(band);
      band.connect(audio.windGain);
      audio.windGain.connect(audio.master);
      noise.start();
      audio.started = true;
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, when = 0) {
    if (!audio.ctx || audio.muted) return;
    const t0 = audio.ctx.currentTime + when;
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol || 0.25, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  return {
    audio,
    unlock() { ensure(); if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume(); },
    setMuted(muted) {
      audio.muted = muted;
      if (audio.master) audio.master.gain.value = muted ? 0 : 0.5;
    },
    update(throttle, speed, flying) {
      if (!audio.ctx || audio.muted) return;
      const t = audio.ctx.currentTime;
      const target = flying ? 0.05 + throttle * 0.11 : 0;
      audio.engineGain.gain.setTargetAtTime(target, t, 0.1);
      audio.engineOsc.frequency.setTargetAtTime(52 + throttle * 70, t, 0.1);
      audio.engineOsc2.frequency.setTargetAtTime(78 + throttle * 105, t, 0.1);
      audio.windGain.gain.setTargetAtTime(flying ? Math.max(0, (speed - 120) / 900) : 0, t, 0.2);
    },
    ring() { tone(880, 0.18, 'sine', 0.3); tone(1318, 0.28, 'sine', 0.28, 0.09); },
    land() { tone(220, 0.25, 'triangle', 0.3); tone(330, 0.3, 'triangle', 0.25, 0.12); },
    drop() { tone(520, 0.12, 'square', 0.18); tone(392, 0.2, 'square', 0.18, 0.1); },
    success() {
      tone(523, 0.16, 'sine', 0.3);
      tone(659, 0.16, 'sine', 0.3, 0.12);
      tone(784, 0.3, 'sine', 0.3, 0.24);
    },
    crash() {
      if (!audio.ctx || audio.muted) return;
      const t0 = audio.ctx.currentTime;
      const len = audio.ctx.sampleRate * 0.7;
      const buffer = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = audio.ctx.createBufferSource();
      src.buffer = buffer;
      const gain = audio.ctx.createGain();
      gain.gain.value = 0.5;
      const filter = audio.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(audio.master);
      src.start(t0);
      tone(90, 0.6, 'sawtooth', 0.3);
    },
    click() { tone(660, 0.07, 'sine', 0.2); },
  };
}
