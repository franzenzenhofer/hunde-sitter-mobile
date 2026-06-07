/**
 * A loud, copyable crash screen. No silent fallbacks: when anything throws —
 * an uncaught error, an unhandled promise rejection, or Bello's brain failing —
 * we surface the full message + stack here with a one-tap Copy button, so the
 * exact failure can be pasted back verbatim. Errors accumulate (a flaky loop
 * shows every occurrence) and the newest is shown on top.
 */
let overlayEl: HTMLDivElement | null = null;
let logEl: HTMLElement | null = null;
let copyBtn: HTMLButtonElement | null = null;
const entries: string[] = [];

function fmt(title: string, err: unknown): string {
  const e = err as { name?: string; message?: string; stack?: string } | undefined;
  const stack = e && typeof e.stack === 'string' ? e.stack : undefined;
  const msg = e && typeof e.message === 'string' ? e.message : String(err);
  const head = e?.name && msg ? `${e.name}: ${msg}` : msg;
  return [
    `### ${title}`,
    head,
    stack && !stack.includes(msg) ? `\n${stack}` : stack ? `\n${stack}` : '',
    '',
    `when:  ${new Date().toISOString()}`,
    `url:   ${typeof location !== 'undefined' ? location.href : '?'}`,
    `ua:    ${typeof navigator !== 'undefined' ? navigator.userAgent : '?'}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function allText(): string {
  return entries.join('\n\n────────────────────────\n\n');
}

function ensureDom(): void {
  if (overlayEl) return;
  const el = document.createElement('div');
  el.id = 'crash-overlay';
  el.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:2147483647',
    'display:none',
    'flex-direction:column',
    'gap:10px',
    'padding:max(16px,env(safe-area-inset-top)) 14px 14px',
    'background:rgba(18,18,22,0.97)',
    'color:#f2f2f2',
    'font:13px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace',
    'overscroll-behavior:contain',
  ].join(';');

  const title = document.createElement('div');
  title.textContent = '⚠️ Something broke';
  title.style.cssText = 'font:800 17px -apple-system,sans-serif;color:#ff8a8a';

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
  const mkBtn = (label: string): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.style.cssText = [
      'flex:1 1 auto',
      'min-height:46px',
      'padding:10px 14px',
      'border:none',
      'border-radius:12px',
      'font:800 15px -apple-system,sans-serif',
      'cursor:pointer',
    ].join(';');
    return b;
  };
  copyBtn = mkBtn('📋 Copy error');
  copyBtn.style.background = '#ffd86b';
  copyBtn.style.color = '#2a2a2a';
  const reloadBtn = mkBtn('↻ Reload');
  reloadBtn.style.background = '#6ba8ff';
  reloadBtn.style.color = '#fff';
  const closeBtn = mkBtn('✕ Dismiss');
  closeBtn.style.background = '#444';
  closeBtn.style.color = '#fff';
  closeBtn.style.flex = '0 0 auto';

  const pre = document.createElement('pre');
  pre.style.cssText = [
    'flex:1 1 auto',
    'margin:0',
    'overflow:auto',
    '-webkit-overflow-scrolling:touch',
    'white-space:pre-wrap',
    'word-break:break-word',
    'background:rgba(0,0,0,0.35)',
    'border-radius:10px',
    'padding:12px',
    'user-select:text',
    '-webkit-user-select:text',
  ].join(';');
  logEl = pre;

  copyBtn.addEventListener('click', () => void copyAll());
  reloadBtn.addEventListener('click', () => location.reload());
  closeBtn.addEventListener('click', () => {
    el.style.display = 'none';
  });

  row.append(copyBtn, reloadBtn, closeBtn);
  el.append(title, row, pre);
  (document.body ?? document.documentElement).appendChild(el);
  overlayEl = el;
}

async function copyAll(): Promise<void> {
  const text = allText();
  let ok = false;
  try {
    await navigator.clipboard.writeText(text);
    ok = true;
  } catch {
    // Fallback for browsers/contexts without the async clipboard API.
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      ok = document.execCommand('copy');
      ta.remove();
    } catch {
      /* both copy paths failed; leave ok false */
    }
  }
  if (copyBtn) {
    copyBtn.textContent = ok ? '✓ Copied!' : '⚠️ Copy failed — select & copy';
    setTimeout(() => {
      if (copyBtn) copyBtn.textContent = '📋 Copy error';
    }, 2000);
  }
}

/** Show (or append to) the crash overlay. Never throws. */
export function showError(title: string, err: unknown): void {
  try {
    ensureDom();
    entries.unshift(fmt(title, err));
    if (logEl) logEl.textContent = allText();
    if (overlayEl) overlayEl.style.display = 'flex';
    console.error(`[${title}]`, err);
  } catch {
    /* the error reporter must never become the error */
  }
}

/** Wire global handlers so nothing fails silently. Call once, as early as possible. */
export function installErrorOverlay(): void {
  window.addEventListener('error', (e) => {
    const ev = e as Event & { error?: unknown; message?: string };
    showError('Uncaught error', ev.error ?? ev.message);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const ev = e as Event & { reason?: unknown };
    showError('Unhandled promise rejection', ev.reason);
  });
}
