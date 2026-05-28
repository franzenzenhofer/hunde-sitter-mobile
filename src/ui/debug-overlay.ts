import { loadSave, persistSave, clearSave, saveBytes } from '../persistence/store';

const REFRESH_MS = 500;

export type DebugOverlay = {
  el: HTMLDivElement;
  toggle(): void;
  destroy(): void;
};

export function createDebugOverlay(host: HTMLElement): DebugOverlay {
  const el = document.createElement('div');
  el.id = 'debug-overlay';
  el.style.cssText = [
    'position:fixed',
    'inset:0',
    'background:rgba(0,0,0,0.84)',
    'color:#e8e8e8',
    'z-index:9999',
    'overflow:auto',
    'padding:14px 16px',
    'font:12px/1.5 ui-monospace,Menlo,Consolas,monospace',
    'display:none',
  ].join(';');

  el.appendChild(buildHeader());
  const body = document.createElement('pre');
  body.id = 'debug-body';
  body.style.cssText = 'margin:8px 0 0;white-space:pre-wrap;word-break:break-word';
  el.appendChild(buildButtons(body));
  el.appendChild(body);

  host.appendChild(el);

  let timer = 0;
  let open = false;

  const render = (): void => {
    const save = loadSave();
    const bytes = saveBytes();
    body.textContent =
      `bytes: ${bytes}  ts: ${new Date().toISOString()}\n\n` +
      (save ? JSON.stringify(save, null, 2) : '(no save in localStorage)');
  };

  const onKey = (e: KeyboardEvent): void => {
    const k = e.key.toLowerCase();
    if (k === 'd' && !e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      toggle();
    } else if (open && k === 'escape') {
      toggle();
    }
  };

  const toggle = (): void => {
    open = !open;
    el.style.display = open ? 'block' : 'none';
    if (open) {
      render();
      timer = window.setInterval(render, REFRESH_MS);
    } else {
      clearInterval(timer);
    }
  };

  window.addEventListener('keydown', onKey);

  return {
    el,
    toggle,
    destroy: () => {
      window.removeEventListener('keydown', onKey);
      clearInterval(timer);
      el.remove();
    },
  };
}

function buildHeader(): HTMLDivElement {
  const h = document.createElement('div');
  h.textContent = 'STATE — press D or Esc to close';
  h.style.cssText = 'font-weight:700;letter-spacing:0.08em;color:#9beaff;margin-bottom:6px';
  return h;
}

function buildButtons(body: HTMLPreElement): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin:4px 0';

  const copyBtn = makeBtn('Copy save JSON', () => {
    void navigator.clipboard?.writeText(body.textContent ?? '');
  });
  const clearBtn = makeBtn('Clear save + reload', () => {
    clearSave();
    location.reload();
  });
  const dumpBtn = makeBtn('Re-snapshot', () => {
    const s = loadSave();
    if (s) persistSave({ ...s, ts: Date.now() });
  });
  wrap.append(copyBtn, clearBtn, dumpBtn);
  return wrap;
}

function makeBtn(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.style.cssText = [
    'padding:6px 10px',
    'background:#1f2937',
    'color:#e8e8e8',
    'border:1px solid #3b4555',
    'border-radius:6px',
    'font:600 11px ui-monospace,monospace',
    'cursor:pointer',
  ].join(';');
  b.addEventListener('click', onClick);
  return b;
}
