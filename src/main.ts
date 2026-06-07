import { bootGame } from './bootstrap';

const stage = document.getElementById('stage');
const ui = document.getElementById('ui');
if (!(stage instanceof HTMLDivElement)) throw new Error('stage element missing');
if (!(ui instanceof HTMLDivElement)) throw new Error('ui element missing');

void bootGame(stage, ui).then(() => {
  document.getElementById('boot')?.remove();
});

if (import.meta.env.DEV) {
  console.warn('[hunde-sitter] dev build booted');
}
