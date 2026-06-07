/**
 * AI debug HUD. Off by default so the game UI stays minimal. Tap the 🐞 button
 * to reveal, in real time, what Bello's brain is doing: a thought bubble over
 * the scene and a scrolling log of every cue, decision, reward and error.
 */
export type DebugHud = {
  el: HTMLDivElement;
  /** Append an event to the log (newest first). */
  log(line: string): void;
  /** Show Bello's latest thought as a bubble (only visible when debug is on). */
  setThought(text: string): void;
  isOn(): boolean;
};

const MAX_LINES = 40;

export function createDebugHud(host: HTMLElement): DebugHud {
  injectStyle();
  const el = document.createElement('div');
  el.id = 'ai-debug';

  const toggle = document.createElement('button');
  toggle.id = 'ai-debug-toggle';
  toggle.type = 'button';
  toggle.textContent = '🐞';
  toggle.setAttribute('aria-label', 'Toggle AI debug');

  const bubble = document.createElement('div');
  bubble.id = 'ai-debug-bubble';
  bubble.hidden = true;

  const panel = document.createElement('div');
  panel.id = 'ai-debug-log';

  el.append(toggle, bubble, panel);
  host.appendChild(el);

  let on = false;
  const lines: string[] = [];
  let step = 0;

  const render = (): void => {
    panel.textContent = lines.join('\n');
  };
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    on = !on;
    el.classList.toggle('on', on);
    if (on) render();
  });

  return {
    el,
    log: (line) => {
      step += 1;
      lines.unshift(`${String(step).padStart(3, '0')}  ${line}`);
      if (lines.length > MAX_LINES) lines.length = MAX_LINES;
      if (on) render();
    },
    setThought: (text) => {
      if (!text) return;
      bubble.textContent = `💭 ${text}`;
      if (on) {
        bubble.hidden = false;
      }
    },
    isOn: () => on,
  };
}

function injectStyle(): void {
  if (document.getElementById('ai-debug-style')) return;
  const s = document.createElement('style');
  s.id = 'ai-debug-style';
  s.textContent = `
#ai-debug { position: absolute; inset: 0; pointer-events: none; z-index: 60; }
#ai-debug-toggle {
  position: absolute; left: calc(8px + env(safe-area-inset-left));
  bottom: calc(8px + env(safe-area-inset-bottom));
  width: 30px; height: 30px; border-radius: 50%; border: none; cursor: pointer;
  background: rgba(0,0,0,0.35); color: #fff; font-size: 15px; line-height: 30px;
  pointer-events: auto; opacity: 0.5; padding: 0;
}
#ai-debug.on #ai-debug-toggle { opacity: 1; background: rgba(180,40,40,0.85); }
#ai-debug-bubble {
  position: absolute; top: calc(46px + env(safe-area-inset-top)); left: 50%;
  transform: translateX(-50%); max-width: min(80vw, 320px);
  padding: 6px 12px; border-radius: 12px; background: rgba(255,255,255,0.92);
  color: #2a2a2a; font: 600 13px -apple-system, sans-serif; text-align: center;
  box-shadow: 0 3px 10px rgba(0,0,0,0.2);
}
#ai-debug:not(.on) #ai-debug-bubble { display: none; }
#ai-debug-log {
  position: absolute; left: 8px; right: 8px; bottom: 46px; max-height: 38vh;
  overflow: auto; display: none; padding: 8px 10px; border-radius: 10px;
  background: rgba(0,0,0,0.78); color: #c8f7c8; white-space: pre-wrap;
  font: 11px/1.45 ui-monospace, Menlo, Consolas, monospace; pointer-events: auto;
}
#ai-debug.on #ai-debug-log { display: block; }
`;
  document.head.appendChild(s);
}
