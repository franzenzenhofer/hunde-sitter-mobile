// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTrickComposer } from '../../src/ui/trick-composer';
import type { Program, Trick } from '../../src/training/types';

function mount() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const onSave = vi.fn<(t: Trick) => void>();
  const onTest = vi.fn<(p: Program) => void>();
  const composer = createTrickComposer(host, { onSave, onTest });
  composer.open();
  return { host, onSave, onTest, composer };
}

const add = (host: HTMLElement, nodeId: string): void =>
  host.querySelector<HTMLButtonElement>(`[data-add="${nodeId}"]`)!.click();
const setName = (host: HTMLElement, value: string): void => {
  const input = host.querySelector('.cmp-name') as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
};
const click = (host: HTMLElement, sel: string): void =>
  host.querySelector<HTMLButtonElement>(sel)!.click();
const savedTrick = (onSave: ReturnType<typeof vi.fn>): Trick => onSave.mock.calls[0]![0] as Trick;

beforeEach(() => document.body.replaceChildren());

describe('TrickComposer — structure', () => {
  it('opens a modal with an add-button per palette action', () => {
    const { host } = mount();
    expect(host.querySelector('#composer')!.classList.contains('is-open')).toBe(true);
    const adds = [...host.querySelectorAll('.cmp-add')].map((b) => b.getAttribute('data-add'));
    expect(adds).toEqual(['sit', 'spin-cw', 'bark', 'paw-up', 'walk-forward', 'pause']);
  });

  it('shows an empty hint until a step is added', () => {
    const { host } = mount();
    expect(host.querySelector('.cmp-empty')).toBeTruthy();
    add(host, 'sit');
    expect(host.querySelector('.cmp-empty')).toBeNull();
    expect(host.querySelectorAll('.cmp-step')).toHaveLength(1);
  });
});

describe('TrickComposer — authoring', () => {
  it('saves an ordered multi-step trick', () => {
    const { host, onSave } = mount();
    setName(host, 'Dance');
    add(host, 'sit');
    add(host, 'spin-cw');
    add(host, 'bark');
    click(host, '.cmp-save');

    expect(onSave).toHaveBeenCalledOnce();
    const trick = savedTrick(onSave);
    expect(trick.name).toBe('Dance');
    expect(trick.authoredBy).toBe('player');
    expect(trick.program).toEqual({
      nodeId: 'seq',
      children: [{ nodeId: 'sit' }, { nodeId: 'spin-cw' }, { nodeId: 'bark' }],
    });
  });

  it('blocks save without a name or without steps, surfacing an error', () => {
    const { host, onSave } = mount();
    add(host, 'sit'); // step but no name
    click(host, '.cmp-save');
    expect(onSave).not.toHaveBeenCalled();
    expect(host.querySelector('.cmp-error')!.textContent).toMatch(/name/i);

    // name but no steps
    document.body.replaceChildren();
    const second = mount();
    setName(second.host, 'Empty');
    click(second.host, '.cmp-save');
    expect(second.onSave).not.toHaveBeenCalled();
    expect(second.host.querySelector('.cmp-error')!.textContent).toMatch(/step/i);
  });

  it('removes a step', () => {
    const { host } = mount();
    add(host, 'sit');
    add(host, 'bark');
    expect(host.querySelectorAll('.cmp-step')).toHaveLength(2);
    host.querySelector<HTMLButtonElement>('[data-step="0"] .cmp-step-rm')!.click();
    expect(host.querySelectorAll('.cmp-step')).toHaveLength(1);
    expect(host.querySelector('.cmp-step-name')!.textContent).toBe('Bark');
  });

  it('wraps the program in repeat-n via the stepper', () => {
    const { host, onSave } = mount();
    setName(host, 'Twirls');
    add(host, 'spin-cw');
    const inc = host.querySelectorAll<HTMLButtonElement>('.cmp-step-btn')[1]!; // [−, +]
    inc.click();
    inc.click(); // repeat 1 -> 3
    click(host, '.cmp-save');
    expect(savedTrick(onSave).program).toEqual({
      nodeId: 'repeat-n',
      args: { n: 3 },
      children: [{ nodeId: 'spin-cw' }],
    });
  });

  it('binds a chosen cue and can clear it', () => {
    const { host, onSave } = mount();
    setName(host, 'Speak');
    add(host, 'bark');
    click(host, '[data-cue="whistle"]');
    expect(host.querySelector('[data-cue="whistle"]')!.classList.contains('is-on')).toBe(true);
    click(host, '.cmp-save');
    expect(savedTrick(onSave).cueGestureId).toBe('whistle');
  });

  it('carries a tuned numeric arg into the program', () => {
    const { host, onSave } = mount();
    setName(host, 'Trot');
    add(host, 'walk-forward');
    const slider = host.querySelector('.cmp-step-arg') as HTMLInputElement;
    slider.value = '3';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    click(host, '.cmp-save');
    expect(savedTrick(onSave).program).toEqual({
      nodeId: 'walk-forward',
      args: { distance: 3 },
    });
  });

  it('Test runs the current draft program without saving', () => {
    const { host, onTest, onSave } = mount();
    add(host, 'sit');
    add(host, 'spin-cw');
    click(host, '.cmp-test');
    expect(onSave).not.toHaveBeenCalled();
    expect(onTest).toHaveBeenCalledOnce();
    expect(onTest.mock.calls[0]![0]).toEqual({
      nodeId: 'seq',
      children: [{ nodeId: 'sit' }, { nodeId: 'spin-cw' }],
    });
  });

  it('closes on cancel', () => {
    const { host } = mount();
    click(host, '.cmp-cancel');
    expect(host.querySelector('#composer')!.classList.contains('is-open')).toBe(false);
  });
});

describe('TrickComposer — manage', () => {
  function mountWithTricks(initial: Array<{ id: string; name: string }>) {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const list = [...initial];
    const onSave = vi.fn<(t: Trick) => void>();
    const onDelete = vi.fn<(id: string) => void>((id: string) => {
      const i = list.findIndex((t) => t.id === id);
      if (i >= 0) list.splice(i, 1);
    });
    const composer = createTrickComposer(host, { onSave, onDelete, playerTricks: () => list });
    composer.open();
    return { host, onDelete, list, composer };
  }

  it('hides the manage section when there are no player tricks', () => {
    const { host } = mountWithTricks([]);
    expect((host.querySelector('.cmp-manage') as HTMLElement).style.display).toBe('none');
  });

  it('lists player tricks and deletes one, refreshing the list', () => {
    const { host, onDelete } = mountWithTricks([
      { id: 'a', name: 'Dance' },
      { id: 'b', name: 'Beg' },
    ]);
    expect([...host.querySelectorAll('.cmp-manage-name')].map((n) => n.textContent)).toEqual([
      'Dance',
      'Beg',
    ]);
    host.querySelector<HTMLButtonElement>('[data-del="a"]')!.click();
    expect(onDelete).toHaveBeenCalledWith('a');
    expect([...host.querySelectorAll('.cmp-manage-name')].map((n) => n.textContent)).toEqual(['Beg']);
  });
});
