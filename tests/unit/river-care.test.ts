import {describe, expect, it} from "vitest";
import {newRiverGame, riverBins, riverFeedbackText, riverFirstTryCount, riverItems, riverReducer} from "../../apps/client/village/river-care";

describe("River Care interactive cleanup", () => {
  it("has six unique visible objects with two items per bin", () => {
    expect(new Set(riverItems.map(item => item.id)).size).toBe(6);
    for (const bin of riverBins) expect(riverItems.filter(item => item.bin === bin)).toHaveLength(2);
    for (const item of riverItems) {
      expect(item.shape).toBeTruthy();
      expect(item.clue.length).toBeGreaterThan(20);
    }
  });
  it("does not sort an unselected, unknown, or already-collected object", () => {
    const fresh = newRiverGame();
    expect(riverReducer(fresh, {type: "sort", itemId: "peel", bin: "Compost"})).toBe(fresh);
    expect(riverReducer(fresh, {type: "pick", itemId: "fake"})).toBe(fresh);
    const picked = riverReducer(fresh, {type: "pick", itemId: "peel"});
    const sorted = riverReducer(picked, {type: "sort", itemId: "peel", bin: "Compost"});
    expect(riverReducer(sorted, {type: "sort", itemId: "peel", bin: "Compost"})).toBe(sorted);
    expect(riverReducer(sorted, {type: "pick", itemId: "peel"})).toBe(sorted);
    expect(sorted.attempts.peel).toBe(1);
  });
  it("keeps wrong choices retryable, with specific feedback and honest scoring", () => {
    const picked = riverReducer(newRiverGame(), {type: "pick", itemId: "peel"});
    const wrong = riverReducer(picked, {type: "sort", itemId: "peel", bin: "Paper"});
    expect(wrong.sorted).toEqual([]);
    expect(wrong.selected).toBe("peel");
    expect(riverFeedbackText(wrong)).toContain("food for plants");
    const right = riverReducer(wrong, {type: "sort", itemId: "peel", bin: "Compost"});
    expect(right.sorted).toEqual(["peel"]);
    expect(right.selected).toBeNull();
    expect(right.attempts.peel).toBe(2);
    expect(riverFirstTryCount(right)).toBe(0);
    expect(picked.attempts).toEqual({});
  });
  it("accepts all items in any order and only completes after six correct sorts", () => {
    let state = newRiverGame();
    for (const [index, item] of [...riverItems].reverse().entries()) {
      state = riverReducer(state, {type: "pick", itemId: item.id});
      state = riverReducer(state, {type: "sort", itemId: item.id, bin: item.bin});
      expect(state.sorted).toHaveLength(index + 1);
    }
    expect(riverFirstTryCount(state)).toBe(6);
    expect(riverFeedbackText(state)).toContain("koi are back");
    const replay = riverReducer(state, {type: "restart"});
    expect(replay).toEqual(newRiverGame());
    expect(state.sorted).toHaveLength(6);
  });
  it("putting down an object never counts as a wrong answer", () => {
    const picked = riverReducer(newRiverGame(), {type: "pick", itemId: "can"});
    const cancelled = riverReducer(picked, {type: "put-down"});
    expect(cancelled.selected).toBeNull();
    expect(cancelled.attempts).toEqual({});
    expect(cancelled.sorted).toEqual([]);
  });
});
