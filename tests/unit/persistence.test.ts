import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadSave,
  persistSave,
  clearSave,
  saveBytes,
} from '../../src/persistence/store';
import {
  isSaveV2,
  migrateV1toV2,
  STORAGE_KEY,
  type SaveV1,
  type SaveV2,
} from '../../src/persistence/schema';

const sampleV1: SaveV1 = {
  v: 1,
  seed: 1337,
  player: { x: 12.5, z: -4.2 },
  stats: { hunger: 60, fun: 70, love: 80 },
  quest: { id: 'pet-1', kind: 'pet', label: 'Pet Bello 3 times', goal: 3, progress: 1 },
  completedQuests: 4,
  ts: 1700000000000,
};

function memoryLocalStorage(): void {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => {
      store.set(k, String(v));
    },
    removeItem: (k) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

describe('persistence v2 (localStorage)', () => {
  beforeEach(() => {
    memoryLocalStorage();
    clearSave();
  });

  it('roundtrips a SaveV2 through localStorage', () => {
    const v2 = migrateV1toV2(sampleV1);
    persistSave(v2);
    expect(loadSave()).toEqual(v2);
  });

  it('returns null when nothing saved', () => {
    expect(loadSave()).toBeNull();
  });

  it('rejects bad shapes via isSaveV2', () => {
    expect(isSaveV2(null)).toBe(false);
    expect(isSaveV2({ v: 1 })).toBe(false);
    const v2 = migrateV1toV2(sampleV1);
    expect(isSaveV2(v2)).toBe(true);
    expect(isSaveV2({ ...v2, vocabulary: null })).toBe(false);
  });

  it('migrateV1toV2 creates empty trick/vocab/memory containers', () => {
    const v2 = migrateV1toV2(sampleV1);
    expect(v2.v).toBe(2);
    expect(v2.tricks).toEqual({});
    expect(v2.vocabulary).toEqual({});
    expect(v2.ballInventory).toEqual({});
    expect(v2.memoryCells).toEqual({});
    expect(v2.seed).toBe(1337);
  });

  it('saveBytes reports JSON byte length', () => {
    const v2 = migrateV1toV2(sampleV1);
    persistSave(v2);
    expect(saveBytes()).toBeGreaterThan(0);
    const raw = localStorage.getItem(STORAGE_KEY) ?? '';
    expect(saveBytes()).toBe(new Blob([raw]).size);
  });

  it('loadSave swallows corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not-json');
    expect(loadSave()).toBeNull();
  });

  it('handles a real SaveV2 with tricks + vocabulary', () => {
    const full: SaveV2 = {
      ...migrateV1toV2(sampleV1),
      tricks: {
        sit: {
          id: 'sit',
          name: 'Sit',
          program: { nodeId: 'sit' },
          mastery: 0.42,
          attempts: 5,
          successes: 3,
          reinforcements: 3,
          authoredBy: 'system',
          createdAt: 1700000000001,
        },
      },
      vocabulary: {
        clap: { sit: { strength: 0.42, reinforcements: 3, lastReinforcedAt: 1700000000002 } },
      },
      ballInventory: { classic: 2 },
      memoryCells: { 0: 5 },
    };
    persistSave(full);
    expect(loadSave()).toEqual(full);
  });
});
