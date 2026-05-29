// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { injectStyleOnce, button, vibrate } from '../../src/ui/dom';

beforeEach(() => {
  document.head.querySelectorAll('style').forEach((s) => s.remove());
});

describe('injectStyleOnce', () => {
  it('injects a style with the given id', () => {
    injectStyleOnce('test-a', '.x{color:red}');
    const el = document.getElementById('test-a');
    expect(el?.tagName).toBe('STYLE');
    expect(el?.textContent).toBe('.x{color:red}');
  });

  it('is idempotent per id but allows distinct ids', () => {
    injectStyleOnce('dup', '.a{}');
    injectStyleOnce('dup', '.b{}'); // ignored — id already present
    injectStyleOnce('other', '.c{}');
    expect(document.querySelectorAll('style').length).toBe(2);
    expect(document.getElementById('dup')?.textContent).toBe('.a{}');
  });
});

describe('button', () => {
  it('builds a type=button with class, text, aria, title', () => {
    const b = button({ className: 'c1', text: 'Go', ariaLabel: 'go-label', title: 'tip' });
    expect(b.type).toBe('button');
    expect(b.className).toBe('c1');
    expect(b.textContent).toBe('Go');
    expect(b.getAttribute('aria-label')).toBe('go-label');
    expect(b.title).toBe('tip');
  });

  it('wires the click handler', () => {
    const spy = vi.fn();
    const b = button({ onClick: spy });
    b.click();
    expect(spy).toHaveBeenCalledOnce();
  });

  it('omits optional attributes when not provided', () => {
    const b = button();
    expect(b.hasAttribute('aria-label')).toBe(false);
    expect(b.className).toBe('');
  });
});

describe('vibrate', () => {
  it('calls navigator.vibrate when available', () => {
    const spy = vi.fn();
    const original = navigator.vibrate;
    Object.defineProperty(navigator, 'vibrate', { value: spy, configurable: true });
    vibrate(15);
    expect(spy).toHaveBeenCalledWith(15);
    if (original) Object.defineProperty(navigator, 'vibrate', { value: original, configurable: true });
    else Reflect.deleteProperty(navigator, 'vibrate');
  });

  it('is a no-op (no throw) when navigator.vibrate is missing', () => {
    const original = navigator.vibrate;
    Reflect.deleteProperty(navigator, 'vibrate');
    expect(() => vibrate(10)).not.toThrow();
    if (original) Object.defineProperty(navigator, 'vibrate', { value: original, configurable: true });
  });
});
