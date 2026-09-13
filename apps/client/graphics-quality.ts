import { create } from 'zustand';

export type GraphicsQuality = 'balanced' | 'high' | 'ultra';
export const graphicsStorageKey = 'lead-graphics-quality-v1';
export function isGraphicsQuality(value: unknown): value is GraphicsQuality {
  return value === 'balanced' || value === 'high' || value === 'ultra';
}
/** A 4K pixel budget, not a promise that a small CSS panel is a 4K display. */
export function renderPixelRatio(quality: GraphicsQuality, width: number, height: number, deviceRatio = 1, maxDimension = 4096): number {
  if (![width, height, maxDimension].every(Number.isFinite) || !(width > 0 && height > 0 && maxDimension > 0)) return 1;
  const native = Number.isFinite(deviceRatio) && deviceRatio > 0 ? deviceRatio : 1;
  const desired = quality === 'ultra' ? Math.min(3840 / width, 2160 / height)
    : quality === 'high' ? Math.max(1.5, Math.min(2, native)) : Math.min(1.25, native);
  const budget = quality === 'ultra' ? 3840 * 2160 : quality === 'high' ? 2560 * 1440 : 1920 * 1080;
  return Math.max(.1, Math.min(desired, Math.sqrt(budget / (width * height)), maxDimension / width, maxDimension / height));
}
function initialQuality(): GraphicsQuality {
  try { const saved = localStorage.getItem(graphicsStorageKey); if (isGraphicsQuality(saved)) return saved; } catch { /* storage may be disabled */ }
  return typeof window !== 'undefined' && window.innerWidth < 768 ? 'balanced' : 'high';
}
export const useGraphics = create<{ quality: GraphicsQuality; setQuality: (quality: GraphicsQuality) => void }>((set) => ({
  quality: initialQuality(),
  setQuality: quality => {
    if (!isGraphicsQuality(quality)) return;
    try { localStorage.setItem(graphicsStorageKey, quality); } catch { /* settings still work in memory */ }
    set({ quality });
  },
}));
