const DEFAULT_SEED = 1337;

export function resolveSeed(): number {
  const hash = location.hash.replace(/^#/, '');
  if (hash) {
    const n = parseInt(hash, 36);
    if (!Number.isNaN(n)) return n >>> 0;
  }
  const url = new URLSearchParams(location.search).get('seed');
  if (url) {
    const n = parseInt(url, 10);
    if (!Number.isNaN(n)) return n >>> 0;
  }
  return DEFAULT_SEED;
}

export function publishSeed(seed: number): void {
  const slug = seed.toString(36);
  if (location.hash !== `#${slug}`) {
    history.replaceState(null, '', `#${slug}`);
  }
}
