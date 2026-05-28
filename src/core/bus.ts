export type EventMap = {
  'biome:enter': { biome: string };
  'quest:complete': { id: string };
  'dog:fed': Record<string, never>;
  'dog:played': Record<string, never>;
  'dog:petted': Record<string, never>;
  'audio:unlock': Record<string, never>;
  'save:request': Record<string, never>;
  'input:action-down': Record<string, never>;
  'input:action-up': Record<string, never>;
  'gesture:clap': Record<string, never>;
  'gesture:whistle': Record<string, never>;
  'gesture:tap': Record<string, never>;
  'training:reward': { strength: number };
  'training:trick-executed': { trickId: string; success: boolean };
  'training:mastery-up': { trickId: string; mastery: number };
};

type AnyHandler = (payload: unknown) => void;

const handlers = new Map<keyof EventMap, Set<AnyHandler>>();

export function on<K extends keyof EventMap>(
  event: K,
  handler: (payload: EventMap[K]) => void,
): () => void {
  let set = handlers.get(event);
  if (!set) {
    set = new Set();
    handlers.set(event, set);
  }
  const h = handler as AnyHandler;
  set.add(h);
  return () => set.delete(h);
}

export function emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
  const set = handlers.get(event);
  if (!set) return;
  for (const handler of set) handler(payload);
}
