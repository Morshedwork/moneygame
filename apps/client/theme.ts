// LEAD guidebook palette. Bright fills use dark ink for readable contrast.
export const leadTheme = {
  yellow: "#ffde00", sky: "#52a7da", coral: "#f96366",
  green: "#6dba32", lavender: "#b698f5", ink: "#27263f",
  action: "#6847b5", deepSky: "#075a91", muted: "#645c75",
} as const;
export const mascotColors: Record<string, string> = {
  lido: leadTheme.coral, prena: leadTheme.sky, oty: leadTheme.yellow,
  diva: leadTheme.green, sparko: "#238fcb",
};
export const mascotAccents: Record<string, string> = {
  lido: "#bf252c", prena: "#075a91", oty: "#eea009",
  diva: "#478d1c", sparko: "#075a91",
};
