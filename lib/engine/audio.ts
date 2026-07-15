/* WebAudio feedback beeps — ported verbatim from the prototype. */

export type BeepType = "win" | "tick" | "pause" | "death";

let actx: AudioContext | null = null;

export function beep(type: BeepType) {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    actx = actx || new AC();
    const o = actx.createOscillator(),
      g = actx.createGain();
    o.connect(g);
    g.connect(actx.destination);
    const t = actx.currentTime;
    if (type === "win") {
      o.type = "triangle";
      o.frequency.setValueAtTime(660, t);
      o.frequency.exponentialRampToValueAtTime(1320, t + 0.18);
      g.gain.setValueAtTime(0.14, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      o.start(t);
      o.stop(t + 0.4);
    } else if (type === "tick") {
      o.type = "square";
      o.frequency.setValueAtTime(880, t);
      g.gain.setValueAtTime(0.05, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      o.start(t);
      o.stop(t + 0.06);
    } else if (type === "pause") {
      o.type = "sine";
      o.frequency.setValueAtTime(520, t);
      g.gain.setValueAtTime(0.09, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.start(t);
      o.stop(t + 0.18);
    } else {
      o.type = "sawtooth";
      o.frequency.setValueAtTime(200, t);
      o.frequency.exponentialRampToValueAtTime(60, t + 0.25);
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.start(t);
      o.stop(t + 0.3);
    }
  } catch {
    /* audio is best-effort */
  }
}
