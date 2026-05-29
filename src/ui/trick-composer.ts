/**
 * Trick Composer panel — the authoring UI for the programmable dog.
 *
 * A focused modal: name the trick, tap actions to append steps (tune the
 * numeric ones), optionally Repeat the whole thing, optionally bind a cue, then
 * Test it on Bello or Save it. Save lowers the draft to a real engine program
 * (see ../training/composer) so authored tricks behave exactly like built-ins.
 */
import {
  STEP_PALETTE,
  buildProgram,
  clampArg,
  clampRepeat,
  draftToTrick,
  emptyDraft,
  makeStep,
  paletteEntry,
  validateDraft,
  type TrickDraft,
} from '../training/composer';
import type { Program, Trick } from '../training/types';

export type TrickComposerDeps = {
  onSave: (trick: Trick) => void;
  onTest?: (program: Program) => void;
  /** Player-authored tricks currently known, for the manage list. */
  playerTricks?: () => Array<{ id: string; name: string }>;
  onDelete?: (id: string) => void;
};

export type TrickComposer = {
  el: HTMLDivElement;
  open(): void;
  close(): void;
  destroy(): void;
};

const CUES: Array<{ id: 'none' | 'clap' | 'whistle'; label: string }> = [
  { id: 'none', label: 'No cue' },
  { id: 'clap', label: '👏 Clap' },
  { id: 'whistle', label: '😙 Whistle' },
];

export function createTrickComposer(host: HTMLElement, deps: TrickComposerDeps): TrickComposer {
  injectComposerStyle();
  let draft: TrickDraft = emptyDraft();

  const el = document.createElement('div');
  el.id = 'composer';
  el.addEventListener('pointerdown', (e) => e.stopPropagation());

  const scrim = document.createElement('div');
  scrim.className = 'cmp-scrim';
  scrim.addEventListener('pointerdown', () => api.close());

  const card = document.createElement('div');
  card.className = 'cmp-card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Teach Bello a trick');

  const title = document.createElement('div');
  title.className = 'cmp-title';
  title.textContent = 'Teach Bello a trick';

  const manageWrap = document.createElement('div');
  manageWrap.className = 'cmp-manage';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'cmp-name';
  nameInput.placeholder = 'Trick name (e.g. Dance)';
  nameInput.maxLength = 24;
  nameInput.setAttribute('aria-label', 'Trick name');
  nameInput.addEventListener('input', () => {
    draft.name = nameInput.value;
  });

  const stepsWrap = document.createElement('div');
  stepsWrap.className = 'cmp-steps';

  const paletteWrap = document.createElement('div');
  paletteWrap.className = 'cmp-palette';
  for (const entry of STEP_PALETTE) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cmp-add';
    b.dataset.add = entry.nodeId;
    b.setAttribute('aria-label', `Add ${entry.name}`);
    b.innerHTML = '';
    const ico = document.createElement('span');
    ico.textContent = entry.icon;
    const lbl = document.createElement('span');
    lbl.className = 'cmp-add-lbl';
    lbl.textContent = entry.name;
    b.append(ico, lbl);
    b.addEventListener('click', () => addStep(entry.nodeId));
    paletteWrap.appendChild(b);
  }

  // Repeat stepper
  const repeatRow = document.createElement('div');
  repeatRow.className = 'cmp-row';
  const repeatLbl = document.createElement('span');
  repeatLbl.className = 'cmp-row-lbl';
  repeatLbl.textContent = 'Repeat';
  const repDec = stepperBtn('−', 'Fewer repeats', () => setRepeat(draft.repeat - 1));
  const repVal = document.createElement('span');
  repVal.className = 'cmp-rep-val';
  const repInc = stepperBtn('+', 'More repeats', () => setRepeat(draft.repeat + 1));
  repeatRow.append(repeatLbl, repDec, repVal, repInc);

  // Cue selector
  const cueRow = document.createElement('div');
  cueRow.className = 'cmp-row';
  const cueLbl = document.createElement('span');
  cueLbl.className = 'cmp-row-lbl';
  cueLbl.textContent = 'Cue';
  cueRow.appendChild(cueLbl);
  const cueBtns = new Map<string, HTMLButtonElement>();
  for (const c of CUES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cmp-cue';
    b.dataset.cue = c.id;
    b.textContent = c.label;
    b.addEventListener('click', () => setCue(c.id));
    cueBtns.set(c.id, b);
    cueRow.appendChild(b);
  }

  const error = document.createElement('div');
  error.className = 'cmp-error';
  error.setAttribute('role', 'alert');

  const footer = document.createElement('div');
  footer.className = 'cmp-footer';
  const cancelBtn = makeFooterBtn('Cancel', 'cmp-cancel', () => api.close());
  footer.appendChild(cancelBtn);
  if (deps.onTest) {
    footer.appendChild(makeFooterBtn('Test ▶', 'cmp-test', test));
  }
  const saveBtn = makeFooterBtn('Save', 'cmp-save', save);
  footer.appendChild(saveBtn);

  card.append(title, manageWrap, nameInput, stepsWrap, paletteWrap, repeatRow, cueRow, error, footer);
  el.append(scrim, card);
  host.appendChild(el);

  function addStep(nodeId: string): void {
    if (draft.steps.length >= 24) return;
    draft.steps.push(makeStep(nodeId));
    error.textContent = '';
    render();
  }

  function removeStep(index: number): void {
    draft.steps.splice(index, 1);
    render();
  }

  function setRepeat(n: number): void {
    draft.repeat = clampRepeat(n);
    render();
  }

  function setCue(id: 'none' | 'clap' | 'whistle'): void {
    if (id === 'none') delete draft.cueGestureId;
    else draft.cueGestureId = id;
    render();
  }

  function save(): void {
    const err = validateDraft(draft);
    if (err) {
      error.textContent = err;
      return;
    }
    deps.onSave(draftToTrick(draft));
    api.close();
  }

  function test(): void {
    if (draft.steps.length === 0) {
      error.textContent = 'Add a step to test';
      return;
    }
    error.textContent = '';
    deps.onTest?.(buildProgram(draft));
  }

  function renderManage(): void {
    manageWrap.replaceChildren();
    const tricks = deps.playerTricks?.() ?? [];
    if (tricks.length === 0) {
      manageWrap.style.display = 'none';
      return;
    }
    manageWrap.style.display = '';
    const lbl = document.createElement('div');
    lbl.className = 'cmp-manage-lbl';
    lbl.textContent = 'Your tricks';
    manageWrap.appendChild(lbl);
    for (const t of tricks) {
      const row = document.createElement('div');
      row.className = 'cmp-manage-row';
      row.dataset.trick = t.id;
      const name = document.createElement('span');
      name.className = 'cmp-manage-name';
      name.textContent = t.name;
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'cmp-del';
      del.dataset.del = t.id;
      del.textContent = 'Forget ✕';
      del.setAttribute('aria-label', `Delete ${t.name}`);
      del.addEventListener('click', () => {
        deps.onDelete?.(t.id);
        renderManage();
      });
      row.append(name, del);
      manageWrap.appendChild(row);
    }
  }

  function render(): void {
    stepsWrap.replaceChildren();
    if (draft.steps.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'cmp-empty';
      empty.textContent = 'Tap an action below to add a step.';
      stepsWrap.appendChild(empty);
    }
    draft.steps.forEach((step, i) => {
      const entry = paletteEntry(step.nodeId);
      const row = document.createElement('div');
      row.className = 'cmp-step';
      row.dataset.step = String(i);

      const num = document.createElement('span');
      num.className = 'cmp-step-num';
      num.textContent = String(i + 1);
      const ico = document.createElement('span');
      ico.textContent = entry?.icon ?? '✨';
      const name = document.createElement('span');
      name.className = 'cmp-step-name';
      name.textContent = entry?.name ?? step.nodeId;
      row.append(num, ico, name);

      if (entry?.arg) {
        const arg = entry.arg;
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'cmp-step-arg';
        slider.min = String(arg.min);
        slider.max = String(arg.max);
        slider.step = String(arg.step);
        slider.value = String(step.args[arg.key] ?? arg.default);
        slider.setAttribute('aria-label', `${entry.name} ${arg.label}`);
        const argVal = document.createElement('span');
        argVal.className = 'cmp-arg-val';
        const show = (v: number): void => {
          argVal.textContent = `${v}${arg.unit ?? ''}`;
        };
        show(Number(slider.value));
        slider.addEventListener('input', () => {
          const v = clampArg(entry, Number(slider.value));
          step.args[arg.key] = v;
          show(v);
        });
        row.append(slider, argVal);
      }

      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'cmp-step-rm';
      rm.textContent = '✕';
      rm.setAttribute('aria-label', `Remove step ${i + 1}`);
      rm.addEventListener('click', () => removeStep(i));
      row.appendChild(rm);

      stepsWrap.appendChild(row);
    });

    repVal.textContent = `${draft.repeat}×`;
    for (const [id, b] of cueBtns) {
      const active = (draft.cueGestureId ?? 'none') === id;
      b.classList.toggle('is-on', active);
    }
  }

  const api: TrickComposer = {
    el,
    open() {
      draft = emptyDraft();
      nameInput.value = '';
      error.textContent = '';
      renderManage();
      render();
      el.classList.add('is-open');
      nameInput.focus();
    },
    close() {
      el.classList.remove('is-open');
    },
    destroy() {
      el.remove();
    },
  };

  return api;
}

function stepperBtn(text: string, label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'cmp-step-btn';
  b.textContent = text;
  b.setAttribute('aria-label', label);
  b.addEventListener('click', onClick);
  return b;
}

function makeFooterBtn(text: string, cls: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `cmp-btn ${cls}`;
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

let composerStyleInjected = false;
function injectComposerStyle(): void {
  if (composerStyleInjected || typeof document === 'undefined') return;
  composerStyleInjected = true;
  const css = `
#composer { position: absolute; inset: 0; pointer-events: none; z-index: 60; }
#composer.is-open { pointer-events: auto; }
#composer .cmp-scrim {
  position: absolute; inset: 0; background: rgba(20,28,38,0.32);
  opacity: 0; transition: opacity 160ms ease;
}
#composer.is-open .cmp-scrim { opacity: 1; }
.cmp-card {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -46%) scale(0.97);
  width: min(360px, calc(100vw - 28px)); max-height: min(86vh, 720px); overflow-y: auto;
  padding: 16px; box-sizing: border-box;
  background: rgba(252,250,247,0.97); border-radius: 20px;
  box-shadow: 0 18px 50px rgba(0,0,0,0.32); backdrop-filter: blur(12px);
  opacity: 0; transition: opacity 160ms ease, transform 200ms ease;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #2a2a2a;
}
#composer.is-open .cmp-card { opacity: 1; transform: translate(-50%, -50%) scale(1); }
.cmp-title { font: 800 18px -apple-system, sans-serif; margin-bottom: 12px; }
.cmp-manage { margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #eee4d6; }
.cmp-manage-lbl { font: 800 11px -apple-system, sans-serif; letter-spacing: 0.06em; text-transform: uppercase; color: #6a6a72; margin-bottom: 6px; }
.cmp-manage-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 5px 0; }
.cmp-manage-name { font: 700 13px -apple-system, sans-serif; }
.cmp-del {
  border: none; border-radius: 8px; cursor: pointer; padding: 5px 9px;
  background: #f6e2dc; color: #b34a32; font: 700 11px -apple-system, sans-serif;
}
.cmp-del:active { transform: scale(0.94); }
.cmp-name {
  width: 100%; box-sizing: border-box; padding: 10px 12px; margin-bottom: 12px;
  border: 2px solid #e3ddd2; border-radius: 12px; font: 600 15px -apple-system, sans-serif;
  background: #fff; color: #2a2a2a;
}
.cmp-name:focus { outline: none; border-color: #ff9a5a; }
.cmp-steps { display: flex; flex-direction: column; gap: 6px; min-height: 38px; margin-bottom: 10px; }
.cmp-empty { font: 500 13px -apple-system, sans-serif; color: #999; padding: 9px 4px; }
.cmp-step {
  display: flex; align-items: center; gap: 8px; padding: 7px 8px;
  background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); font-size: 18px;
}
.cmp-step-num {
  width: 20px; height: 20px; flex: 0 0 auto; border-radius: 50%; background: #ffd86b;
  font: 800 11px -apple-system, sans-serif; display: flex; align-items: center; justify-content: center;
}
.cmp-step-name { font: 700 13px -apple-system, sans-serif; flex: 1 1 auto; }
.cmp-step-arg { flex: 1 1 90px; min-width: 60px; accent-color: #ff9a5a; }
.cmp-arg-val { font: 700 12px ui-monospace, monospace; min-width: 34px; text-align: right; color: #6a6a72; }
.cmp-step-rm {
  flex: 0 0 auto; width: 26px; height: 26px; border: none; border-radius: 8px; cursor: pointer;
  background: #f3ece1; color: #8a8a92; font-size: 13px;
}
.cmp-step-rm:active { transform: scale(0.9); }
.cmp-palette { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 12px; }
.cmp-add {
  display: flex; flex-direction: column; align-items: center; gap: 2px; width: 60px; padding: 7px 2px;
  border: 2px dashed #d9d2c6; border-radius: 12px; background: #fff; cursor: pointer; font-size: 20px;
}
.cmp-add:active { transform: scale(0.94); }
.cmp-add-lbl { font: 700 10px -apple-system, sans-serif; color: #2a2a2a; }
.cmp-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
.cmp-row-lbl { font: 800 11px -apple-system, sans-serif; letter-spacing: 0.06em; text-transform: uppercase; color: #6a6a72; width: 52px; }
.cmp-step-btn {
  width: 32px; height: 32px; border: none; border-radius: 9px; cursor: pointer;
  background: #ffd86b; font: 800 18px -apple-system, sans-serif; color: #2a2a2a;
}
.cmp-step-btn:active { transform: scale(0.9); }
.cmp-rep-val { font: 800 15px -apple-system, sans-serif; min-width: 34px; text-align: center; }
.cmp-cue {
  padding: 7px 11px; border: 2px solid #e3ddd2; border-radius: 999px; background: #fff; cursor: pointer;
  font: 700 12px -apple-system, sans-serif; color: #2a2a2a;
}
.cmp-cue.is-on { background: #ffe7b8; border-color: #ff9a5a; }
.cmp-error { min-height: 16px; color: #d8513a; font: 700 12px -apple-system, sans-serif; margin-bottom: 8px; }
.cmp-footer { display: flex; gap: 8px; justify-content: flex-end; }
.cmp-btn {
  padding: 11px 18px; border: none; border-radius: 13px; cursor: pointer;
  font: 800 14px -apple-system, sans-serif;
}
.cmp-btn:active { transform: translateY(1px); }
.cmp-cancel { background: #ece5d9; color: #5a5a62; }
.cmp-test { background: #cfeffe; color: #1c5e7a; }
.cmp-save { background: linear-gradient(180deg, #ffd86b, #ff9a5a); color: #2a2a2a; }
`;
  const style = document.createElement('style');
  style.id = 'composer-style';
  style.textContent = css;
  document.head.appendChild(style);
}
