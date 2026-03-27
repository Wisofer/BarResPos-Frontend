/**
 * Reproduce sonidos del sistema (snackbar, etc.).
 * Archivos en public: /assets/sounds/success.mp3, /assets/sounds/error.mp3
 */
const SOUNDS = {
  success: "/assets/sounds/success.mp3",
  error: "/assets/sounds/error.mp3",
};

let audioCache = {};

function getAudio(type) {
  const src = SOUNDS[type];
  if (!src) return null;
  if (!audioCache[src]) {
    try {
      audioCache[src] = new Audio(src);
    } catch {
      return null;
    }
  }
  return audioCache[src];
}

/**
 * Reproduce un sonido (success | error).
 * @param {'success'|'error'} type
 */
export function playSound(type) {
  const audio = getAudio(type);
  if (!audio) return;
  try {
    audio.volume = 0.5;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch {}
}
