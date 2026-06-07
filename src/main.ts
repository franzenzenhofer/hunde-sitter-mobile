import { bootGame } from './bootstrap';
import { installErrorOverlay, showError } from './ui/error-overlay';

// Catch everything, as early as possible — no silent failures.
installErrorOverlay();

const stage = document.getElementById('stage');
const ui = document.getElementById('ui');
if (!(stage instanceof HTMLDivElement)) throw new Error('stage element missing');
if (!(ui instanceof HTMLDivElement)) throw new Error('ui element missing');

void bootGame(stage, ui)
  .then(() => {
    document.getElementById('boot')?.remove();
  })
  .catch((e: unknown) => showError('Game failed to start', e));

if (import.meta.env.DEV) {
  console.warn('[hunde-sitter] dev build booted');
}
