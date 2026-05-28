import { describe, it, expect } from 'vitest'
import { Vector2 } from '../src/components/Vector2.js'

describe('test harness', () => {
  it('runs and can import source modules', () => {
    const a = new Vector2(0, 0)
    const b = new Vector2(3, 4)
    expect(a.distance(b)).toBe(5)
  })
})
