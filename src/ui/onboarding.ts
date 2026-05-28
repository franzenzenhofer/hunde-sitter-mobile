const STORAGE_KEY = 'hs:seen-onboarding';

export function maybeShowOnboarding(host: HTMLElement): void {
  if (localStorage.getItem(STORAGE_KEY) === '1') return;

  const overlay = document.createElement('div');
  overlay.id = 'onboarding';
  overlay.style.cssText = [
    'position:absolute',
    'inset:0',
    'background:rgba(255,255,255,0.92)',
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'justify-content:center',
    'gap:18px',
    'padding:32px',
    'text-align:center',
    'font:500 16px -apple-system,sans-serif',
    'color:#2a2a2a',
    'z-index:50',
    'backdrop-filter:blur(8px)',
  ].join(';');

  overlay.appendChild(buildTitle("Hi! I'm Bello"));
  overlay.appendChild(buildInstructions());
  overlay.appendChild(buildDismissButton(overlay));

  host.appendChild(overlay);
}

function buildTitle(text: string): HTMLDivElement {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText = 'font:800 26px -apple-system,sans-serif;letter-spacing:0.02em';
  return el;
}

function buildInstructions(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = 'max-width:320px;line-height:1.5';
  const lines: Array<[string, string]> = [
    ['Drag your left thumb', ' to walk.'],
    ['Drag the right side', ' to look around.'],
    ['Tap the big button', ' for the smart action — pet, feed, or throw.'],
    ['Tap 🐾', ' to open commands: clap, whistle, ask for tricks, and reward Bello.'],
  ];
  for (const [bold, rest] of lines) {
    const b = document.createElement('b');
    b.textContent = bold;
    el.appendChild(b);
    el.appendChild(document.createTextNode(rest));
    el.appendChild(document.createElement('br'));
  }
  el.appendChild(
    document.createTextNode('Cue → trick → reward, and Bello learns the cue. Keep him happy!'),
  );
  return el;
}

function buildDismissButton(overlay: HTMLDivElement): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = "Let's play";
  btn.style.cssText = [
    'margin-top:8px',
    'padding:12px 24px',
    'background:linear-gradient(180deg,#ffd86b,#ff9a5a)',
    'border:3px solid #fff',
    'border-radius:16px',
    'font:800 16px -apple-system,sans-serif',
    'color:#2a2a2a',
    'box-shadow:0 4px 12px rgba(0,0,0,0.18)',
    'cursor:pointer',
  ].join(';');
  btn.addEventListener('click', () => {
    localStorage.setItem(STORAGE_KEY, '1');
    overlay.remove();
  });
  return btn;
}
