// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { showError, installErrorOverlay } from '../../src/ui/error-overlay';

// The overlay is a module singleton (one crash screen for the whole app), so
// these tests share it in order rather than resetting it between cases.
const overlay = () => document.getElementById('crash-overlay');
const logText = () => overlay()?.querySelector('pre')?.textContent ?? '';

describe('error overlay', () => {
  it('is hidden until something throws', () => {
    expect(overlay()).toBeNull();
  });

  it('shows the message + stack and reveals the overlay', () => {
    showError('Bello brain error', new Error('boom-xyz'));
    const o = overlay()!;
    expect(o).toBeTruthy();
    expect(o.style.display).toBe('flex');
    expect(logText()).toContain('Bello brain error');
    expect(logText()).toContain('boom-xyz');
    expect(logText()).toContain('ua:'); // copy-paste-friendly context
  });

  it('accumulates repeated errors, newest first', () => {
    showError('first', new Error('one-aaa'));
    showError('second', new Error('two-bbb'));
    const text = logText();
    expect(text).toContain('one-aaa');
    expect(text).toContain('two-bbb');
    expect(text.indexOf('two-bbb')).toBeLessThan(text.indexOf('one-aaa'));
  });

  it('Copy button writes the full error text to the clipboard', async () => {
    const writeText = vi.fn((_text: string) => Promise.resolve());
    Object.assign(navigator, { clipboard: { writeText } });
    showError('copy me', new Error('clip-ccc'));
    const btn = [...(overlay()?.querySelectorAll('button') ?? [])].find((b) =>
      b.textContent?.includes('Copy'),
    )!;
    btn.click();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText.mock.calls[0]![0]).toContain('clip-ccc');
  });

  it('installErrorOverlay surfaces unhandled promise rejections', () => {
    installErrorOverlay();
    const ev = new Event('unhandledrejection') as Event & { reason?: unknown };
    ev.reason = new Error('rej-ddd');
    window.dispatchEvent(ev);
    expect(logText()).toContain('rej-ddd');
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
