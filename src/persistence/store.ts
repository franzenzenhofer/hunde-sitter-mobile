import { get, del } from 'idb-keyval';
import {
  STORAGE_KEY,
  isSaveV1,
  isSaveV2,
  migrateV1toV2,
  type SaveV2,
} from './schema';

const LEGACY_IDB_KEY = 'hs:save:v1';

export function loadSave(): SaveV2 | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isSaveV2(parsed) ? parsed : null;
  } catch (err) {
    console.error('[store] load failed', err);
    return null;
  }
}

export function persistSave(save: SaveV2): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch (err) {
    console.error('[store] persist failed', err);
  }
}

export function clearSave(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function saveBytes(): number {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? new Blob([raw]).size : 0;
}

export async function maybeMigrateLegacyIdb(): Promise<SaveV2 | null> {
  if (loadSave()) return null;
  try {
    const legacy = await get(LEGACY_IDB_KEY);
    if (!isSaveV1(legacy)) return null;
    const migrated = migrateV1toV2(legacy);
    persistSave(migrated);
    await del(LEGACY_IDB_KEY);
    return migrated;
  } catch (err) {
    console.warn('[store] legacy IDB migration skipped', err);
    return null;
  }
}
