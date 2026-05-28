import type { Primitive } from './types';

const REGISTRY = new Map<string, Primitive>();

export function registerPrimitive(p: Primitive): void {
  if (REGISTRY.has(p.id)) throw new Error(`duplicate primitive id: ${p.id}`);
  REGISTRY.set(p.id, p);
}

export function getPrimitive(id: string): Primitive | undefined {
  return REGISTRY.get(id);
}

export function allPrimitives(): Primitive[] {
  return Array.from(REGISTRY.values());
}

export function loadBuiltInPrimitives(): void {
  if (REGISTRY.size > 0) return;
  const modules = import.meta.glob('./nodes/**/*.ts', { eager: true }) as Record<
    string,
    { default: Primitive }
  >;
  for (const mod of Object.values(modules)) {
    if (mod.default) registerPrimitive(mod.default);
  }
}
