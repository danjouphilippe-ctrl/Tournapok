// Sons synthétisés à la volée (Web Audio API) — pas de fichier audio à héberger.
let sharedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedContext) {
    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return null;
    sharedContext = new AudioCtor();
  }
  // Les navigateurs suspendent l'audio tant qu'aucune interaction utilisateur
  // n'a eu lieu sur la page ; on relance à chaque tentative de lecture.
  if (sharedContext.state === "suspended") {
    sharedContext.resume().catch(() => {});
  }
  return sharedContext;
}

function tone(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  peakGain: number,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

/** Bip court, joué chaque seconde dans les 15 dernières secondes. */
export function playBeep() {
  const ctx = getContext();
  if (!ctx) return;
  tone(ctx, 880, ctx.currentTime, 0.12, 0.3);
}

/** Son de cloche, joué une fois 1 minute avant la fin du niveau. */
export function playBell() {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  // Deux harmoniques superposées pour un timbre plus proche d'une cloche.
  tone(ctx, 660, now, 1.1, 0.35);
  tone(ctx, 990, now, 0.9, 0.18);
}

/** Clic sec du tirage au sort.
 *
 * La hauteur monte à mesure que le brassage ralentit : c'est ce qui fait
 * entendre la roue qui s'arrête, sans qu'on ait à regarder l'écran. */
export function playTick(frequency = 560) {
  const ctx = getContext();
  if (!ctx) return;
  tone(ctx, frequency, ctx.currentTime, 0.07, 0.45);
}
