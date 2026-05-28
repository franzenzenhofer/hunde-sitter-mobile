import { emit } from '../core/bus';

export type ActionButton = {
  el: HTMLButtonElement;
  setLabel(label: string): void;
  onPress(cb: () => void): () => void;
  destroy(): void;
};

export function createActionButton(host: HTMLElement): ActionButton {
  const el = document.createElement('button');
  el.id = 'action';
  el.type = 'button';
  el.textContent = 'Act';
  host.appendChild(el);

  const handlers = new Set<() => void>();
  const onClick = (): void => {
    for (const h of handlers) h();
  };
  const onDown = (): void => {
    emit('input:action-down', {});
  };
  const onUp = (): void => {
    emit('input:action-up', {});
  };
  el.addEventListener('click', onClick);
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);

  return {
    el,
    setLabel: (label) => {
      el.textContent = label;
    },
    onPress: (cb) => {
      handlers.add(cb);
      return () => handlers.delete(cb);
    },
    destroy: () => {
      el.removeEventListener('click', onClick);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.remove();
    },
  };
}
