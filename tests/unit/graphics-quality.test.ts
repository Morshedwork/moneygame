import { describe, expect, it } from 'vitest';
import { isGraphicsQuality, renderPixelRatio } from '../../apps/client/graphics-quality';

describe('graphics rendering budget', () => {
  it('renders a 1080p full-screen scene at exactly 3840 x 2160 in Ultra', () => {
    const ratio = renderPixelRatio('ultra', 1920, 1080, 1);
    expect([1920*ratio,1080*ratio]).toEqual([3840,2160]);
  });
  it('does not oversample a native 4K scene', () => expect(renderPixelRatio('ultra',3840,2160,2)).toBe(1));
  it('preserves scene aspect ratio instead of stretching a narrow panel', () => {
    const ratio=renderPixelRatio('ultra',400,800,2);
    expect([400*ratio,800*ratio]).toEqual([1080,2160]);
  });
  it('honors a smaller GPU renderbuffer limit', () => expect(renderPixelRatio('ultra',1920,1080,1,2048)).toBeCloseTo(2048/1920));
  it('caps balanced device pixel ratio', () => expect(renderPixelRatio('balanced',390,844,3)).toBe(1.25));
  it('supersamples High on a standard-density display', () => expect(renderPixelRatio('high',800,600,1)).toBe(1.5));
  it.each(['balanced','high','ultra'] as const)('%s stays inside its pixel budget on an 8K screen', quality => {
    const ratio=renderPixelRatio(quality,7680,4320,2);
    const pixels=7680*4320*ratio*ratio;
    expect(pixels).toBeLessThanOrEqual((quality==='ultra'?3840*2160:quality==='high'?2560*1440:1920*1080)+1);
  });
  it.each([0,-1,NaN,Infinity])('safe before layout or with invalid width %s', width => expect(renderPixelRatio('ultra',width,600)).toBe(1));
  it('validates saved settings instead of trusting storage', () => {
    expect(isGraphicsQuality('ultra')).toBe(true);
    for (const value of [null,{},'4K','unexpected']) expect(isGraphicsQuality(value)).toBe(false);
  });
});
