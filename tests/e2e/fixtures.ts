import { test as base } from '@playwright/test';

// Browser checks use the local font fallback, so an unavailable font CDN
// cannot hold up navigation. Application and Firebase requests stay intact.
export const test = base.extend<{ localFonts: void }>({
  localFonts: [async ({ context }, use) => {
    await context.route(/^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)\//, route => route.abort());
    await use();
  }, { auto: true }],
});

export { expect } from '@playwright/test';
export type { Page } from '@playwright/test';
