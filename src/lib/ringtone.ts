// Simple Web Audio API ringtone generator — no MP3 files needed.
// Two variants: "customer" (soft dual-tone, like a phone ringing out)
// and "admin" (distinct bell chime).

type Variant = "customer" | "admin";

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let intervalId: number | null = null;
let activeVariant: Variant | null = null;

function ensureCtx(): AudioContext {
  if (!ctx || ctx.state === "closed") {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function playCustomerTone() {
  const c = ensureCtx();
  const now = c.currentTime;
  // Classic "ring-ring": two short 480Hz+620Hz bursts
  for (let i = 0; i < 2; i++) {
    const start = now + i * 0.6;
    [480, 620].forEach((freq) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.4);
      gain.gain.linearRampToValueAtTime(0, start + 0.45);
      osc.connect(gain);
      gain.connect(masterGain!);
      osc.start(start);
      osc.stop(start + 0.5);
    });
  }
}

function playAdminTone() {
  const c = ensureCtx();
  const now = c.currentTime;
  // Bright bell: 880Hz + 1320Hz with fast decay (chime)
  [0, 0.18].forEach((offset) => {
    [880, 1320].forEach((freq, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.value = freq;
      const start = now + offset;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.22, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);
      osc.connect(gain);
      gain.connect(masterGain!);
      osc.start(start);
      osc.stop(start + 0.65);
    });
  });
}

export function startRingtone(variant: Variant, volume = 0.7) {
  stopRingtone();
  const c = ensureCtx();
  masterGain = c.createGain();
  masterGain.gain.value = volume;
  masterGain.connect(c.destination);
  activeVariant = variant;

  const tick = () => (variant === "customer" ? playCustomerTone() : playAdminTone());
  tick();
  // Loop period — customer cycle ~2.5s, admin chime ~2s
  const period = variant === "customer" ? 2500 : 2000;
  intervalId = window.setInterval(tick, period);
}

export function stopRingtone() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (masterGain) {
    try { masterGain.disconnect(); } catch {}
    masterGain = null;
  }
  activeVariant = null;
}
