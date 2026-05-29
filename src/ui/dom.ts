/** Small shared DOM helpers, to keep UI construction DRY across components. */

const injectedStyles = new Set<string>();

/** Inject a <style> with the given id exactly once per document. */
export function injectStyleOnce(id: string, css: string): void {
  if (typeof document === 'undefined' || injectedStyles.has(id)) return;
  injectedStyles.add(id);
  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
}

export type ButtonOptions = {
  className?: string;
  text?: string;
  ariaLabel?: string;
  title?: string;
  onClick?: () => void;
};

/** Create a `<button type="button">` with the common bits wired up. */
export function button(opts: ButtonOptions = {}): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  if (opts.className) b.className = opts.className;
  if (opts.text !== undefined) b.textContent = opts.text;
  if (opts.ariaLabel) b.setAttribute('aria-label', opts.ariaLabel);
  if (opts.title !== undefined) b.title = opts.title;
  if (opts.onClick) b.addEventListener('click', opts.onClick);
  return b;
}

/** Best-effort haptic tap; a no-op where the API is unavailable. */
export function vibrate(ms: number): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(ms);
  }
}
