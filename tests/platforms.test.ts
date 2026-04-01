import { describe, expect, it } from 'vitest'

import { normalizePlatform, supportsAudioExtraction } from '../src/lib/platforms.ts'

describe('platform helpers', () => {
it('normalizes instagram aliases to canonical platform', () => {
    expect(normalizePlatform('instagram')).toBe('instagram')
    expect(normalizePlatform('ins')).toBe('instagram')
})

it('normalizes x aliases to canonical platform', () => {
    expect(normalizePlatform('x')).toBe('x')
    expect(normalizePlatform('twitter')).toBe('x')
})

it('normalizes niconico aliases to canonical platform', () => {
    expect(normalizePlatform('niconico')).toBe('niconico')
    expect(normalizePlatform('nico')).toBe('niconico')
})

it('marks x and instagram as audio-extractable platforms', () => {
    expect(supportsAudioExtraction('instagram')).toBe(true)
    expect(supportsAudioExtraction('x')).toBe(true)
    expect(supportsAudioExtraction('niconico')).toBe(false)
    expect(supportsAudioExtraction('bilibili')).toBe(false)
})
})
