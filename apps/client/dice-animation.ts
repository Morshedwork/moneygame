/** One visible clock for the board die, the close-up die and the pawn's departure. */
export const DIE_ROLL_MS = 1700;
export const DIE_HOLD_MS = 500;
export const DIE_MS = DIE_ROLL_MS + DIE_HOLD_MS;

// The face normals exported by tools/blender/build_props.py; opposite faces sum to seven.
export const DIE_NORMALS = [[0, 1, 0], [0, 0, 1], [1, 0, 0], [-1, 0, 0], [0, 0, -1], [0, -1, 0]];
export function dieRotation(value: number): [number, number, number] {
  const face = Number.isInteger(value) && value >= 1 && value <= 6 ? value : 1;
  return ([
    [0, 0, 0], [-Math.PI / 2, 0, 0], [0, 0, Math.PI / 2],
    [0, 0, -Math.PI / 2], [Math.PI / 2, 0, 0], [Math.PI, 0, 0],
  ] as [number, number, number][])[face - 1];
}

/** Deterministic choreography, never another random roll. Progress freezes with the game clock. */
export function sampleDiceRoll(value: number, progress: number) {
  const t = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 1;
  const target = dieRotation(value);
  // Three diminishing parabolic hops, followed by a small final rock.
  const hop = (start: number, end: number, height: number) => {
    if (t <= start || t >= end) return 0;
    const p = (t - start) / (end - start);
    return 4 * p * (1 - p) * height;
  };
  const lift = hop(0, .58, 2.5) + hop(.58, .8, .65) + hop(.8, .93, .16);
  const remaining = (1 - t) ** 2.2;
  const rock = t > .8 ? Math.sin((t - .8) / .2 * Math.PI * 2) * (1 - t) * .55 : 0;
  const rotation: [number, number, number] = [
    target[0] + remaining * Math.PI * 6 + rock,
    target[1] + remaining * Math.PI * 4,
    target[2] + remaining * Math.PI * 2 - rock,
  ];
  return {
    rotation, lift,
    offsetX: -1.1 * (1 - t) ** 2 + Math.sin(t * Math.PI * 2) * .22 * (1 - t),
    offsetZ: Math.sin(t * Math.PI) * .45 * (1 - t),
    scale: 1 + Math.sin(t * Math.PI) * .08,
    shadowScale: 1 + lift * .18,
    shadowOpacity: .22 / (1 + lift * .6),
  };
}
