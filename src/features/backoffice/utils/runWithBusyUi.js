/**
 * Patrón único: overlay / botones deshabilitados mientras corre una acción async (POS, delivery, etc.).
 */

export function clearBusyUi(setBusy, setMessage) {
  setBusy(false);
  setMessage("");
}

/**
 * @template T
 * @param {{ setBusy: (v: boolean) => void; setMessage: (s: string) => void; caption: string }} ctx
 * @param {() => T | Promise<T>} fn
 * @returns {Promise<T | undefined>}
 */
export async function runWithBusyUi(ctx, fn) {
  const { setBusy, setMessage, caption } = ctx;
  setMessage(caption);
  setBusy(true);
  try {
    return await fn();
  } finally {
    clearBusyUi(setBusy, setMessage);
  }
}
