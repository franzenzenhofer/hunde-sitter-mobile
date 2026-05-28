import { describe, it, expect } from 'vitest';
import { on, emit } from '../../src/core/bus';

describe('bus', () => {
  it('delivers events to registered handlers', () => {
    let received: string | null = null;
    on('biome:enter', (p) => {
      received = p.biome;
    });
    emit('biome:enter', { biome: 'forest' });
    expect(received).toBe('forest');
  });

  it('off-handler unsubscribes', () => {
    let count = 0;
    const off = on('quest:complete', () => {
      count++;
    });
    emit('quest:complete', { id: 'a' });
    off();
    emit('quest:complete', { id: 'b' });
    expect(count).toBe(1);
  });
});
