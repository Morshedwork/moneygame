export type ShopView = 'whole' | 'counter' | 'shelves';

export const shopViews: Record<ShopView, {
  label: string; position: [number, number, number]; target: [number, number, number];
  width: number; height: number; description: string;
}> = {
  whole: { label: 'Whole shop', position: [10, 8.1, 16], target: [0, 2, 0], width: 13.8, height: 10.2,
    description: 'An open-front cedar shop, paper lanterns, split curtains, a menu board, and your very own host.' },
  counter: { label: 'Bento counter', position: [3.8, 6.4, 10], target: [0, 1.4, 1.3], width: 8.5, height: 5.3,
    description: 'Look closely: rice grains, salmon, tamago, edamame, carrot flowers, chopsticks, and soy sauce.' },
  shelves: { label: 'Inside the shop', position: [5.1, 5.05, 5.6], target: [0, 2.15, -1.8], width: 6.6, height: 4.8,
    description: 'The sign and curtains lift away to reveal tea tins, rice jars, bowls, takeaway boxes, the tea set, and the onigiri station.' },
};

/** Orthographic framing preserves the complete shop on narrow and wide screens. */
export function shopZoom(view: ShopView, width: number, height: number) {
  const frame = shopViews[view];
  return Math.max(1, Math.min(Math.max(1, width) / frame.width, Math.max(1, height) / frame.height));
}

export const shopContents = [
  { title: 'Freshly made bento', detail: 'Three detailed trays · rice, salmon & vegetables', view: 'counter' as ShopView },
  { title: 'A stocked little kitchen', detail: 'Tea set, bowls, jars & takeaway boxes', view: 'shelves' as ShopView },
  { title: 'Made to feel like yours', detail: 'Your sign, noren color & chosen character', view: 'whole' as ShopView },
];
