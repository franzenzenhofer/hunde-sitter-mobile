import { persistSave } from './store';
import type { SaveV2 } from './schema';

const INTERVAL_MS = 5000;

export type Snapshot = () => SaveV2;

export function startAutosave(snapshot: Snapshot): () => void {
  const tick = (): void => {
    try {
      persistSave(snapshot());
    } catch (err) {
      console.error('[autosave] failed', err);
    }
  };
  const id = setInterval(tick, INTERVAL_MS);
  const onVisibility = (): void => {
    if (document.visibilityState === 'hidden') tick();
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', tick);
  return () => {
    clearInterval(id);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', tick);
  };
}
