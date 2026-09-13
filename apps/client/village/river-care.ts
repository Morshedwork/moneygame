import {sortingItems} from "./content";

export const riverBins = ["Compost", "Paper", "Containers"] as const;
export type RiverBin = typeof riverBins[number];
export type LitterShape = "peel" | "flyer" | "bottle" | "apple" | "cardboard" | "can";
const shapes: LitterShape[] = ["peel", "flyer", "bottle", "apple", "cardboard", "can"];
const clues = [
  "Fruit scraps can become food for plants.",
  "This flyer is clean, dry paper.",
  "This empty bottle is a container, not paper.",
  "An apple core is a fruit scrap, just like a peel.",
  "Clean cardboard is made from paper fibres.",
  "This empty can belongs with the other containers.",
];
export const riverItems = sortingItems.map((item, index) => ({
  ...item,
  id: shapes[index],
  shape: shapes[index],
  bin: item.bin as RiverBin,
  clue: clues[index],
  x: [18, 50, 82, 18, 50, 82][index],
  y: index < 3 ? 40 : 76,
}));

export type RiverFeedback = {kind: "welcome" | "picked" | "retry" | "sorted" | "put-down"; itemId?: string; bin?: RiverBin};
export type RiverState = {
  selected: string | null;
  sorted: string[];
  attempts: Record<string, number>;
  feedback: RiverFeedback;
};
export type RiverAction =
  | {type: "pick"; itemId: string}
  | {type: "sort"; itemId: string; bin: RiverBin}
  | {type: "put-down"}
  | {type: "restart"};

export function newRiverGame(): RiverState {
  return {selected: null, sorted: [], attempts: {}, feedback: {kind: "welcome"}};
}

// Every input method uses the same transition. An item can only be credited once.
export function riverReducer(state: RiverState, action: RiverAction): RiverState {
  if (action.type === "restart") return newRiverGame();
  if (action.type === "put-down") return {...state, selected: null, feedback: {kind: "put-down"}};
  const item = riverItems.find(candidate => candidate.id === action.itemId);
  if (!item || state.sorted.includes(item.id) || state.sorted.length === riverItems.length) return state;
  if (action.type === "pick") {
    if (state.selected === item.id) return state;
    return {...state, selected: item.id, feedback: {kind: "picked", itemId: item.id}};
  }
  if (!riverBins.includes(action.bin) || state.selected !== item.id) return state;
  const correct = item.bin === action.bin;
  return {
    selected: correct ? null : item.id,
    sorted: correct ? [...state.sorted, item.id] : state.sorted,
    attempts: {...state.attempts, [item.id]: (state.attempts[item.id] || 0) + 1},
    feedback: {kind: correct ? "sorted" : "retry", itemId: item.id, bin: action.bin},
  };
}

export function riverFirstTryCount(state: RiverState) {
  return state.sorted.filter(id => state.attempts[id] === 1).length;
}

export function riverFeedbackText(state: RiverState) {
  const item = riverItems.find(candidate => candidate.id === state.feedback.itemId);
  if (state.feedback.kind === "sorted" && item) {
    return `${item.name} sorted into ${item.bin.toLowerCase()}! ${state.sorted.length === riverItems.length ? "The riverbank is clear. The koi are back!" : "Pick up another item."}`;
  }
  if (state.feedback.kind === "retry" && item) return `Try another bin. ${item.clue} Your item is still selected.`;
  if (state.feedback.kind === "picked" && item) return `${item.name} picked up. Drag to a bin, or tap a bin below.`;
  if (state.feedback.kind === "put-down") return "Item put down. Pick up any item when you’re ready.";
  return "Pick up any item on the riverbank. Let’s leave a little kindness behind.";
}
