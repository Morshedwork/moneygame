import { describe, it, expect } from "vitest";
import {
  applyCommand,
  createPlayer,
  settleSales,
  totals,
  publicPlayer,
  boardPosition,
  Player,
  Game,
  Command,
} from "../../packages/game-rules";
import { lessons, gate, boardNames } from "../../packages/curriculum";
let seq = 0;
const cmd = (type: string, data: Record<string, unknown> = {}): Command => ({
  id: "request-" + ++seq,
  type,
  ...data,
});
function ready(seed = 931) {
  let p = createPlayer("learner", "Explorer");
  for (let i = 0; i < lessons.length; i++)
    p = applyCommand(
      p,
      cmd("lesson", { index: i, answer: lessons[i].answer }),
    ).player;
  for (let i = 0; i < gate.length; i++)
    p = applyCommand(
      p,
      cmd("gate", { index: i, answer: gate[i].answer }),
    ).player;
  return applyCommand(
    p,
    cmd("setup", {
      name: "Bento Co.",
      price: 6,
      color: "#174de5",
      goal: "Learn about money",
    }),
    seed,
  ).player;
}
const pending = (type: string) => {
  const p = ready();
  p.game!.pending = type;
  return p;
};
describe("mandatory learning and account boundaries", () => {
  it("does not let a fresh player create a business", () => {
    expect(() =>
      applyCommand(createPlayer("id", "Aki"), cmd("setup", { price: 6 })),
    ).toThrow("understanding");
  });
  it("rejects out-of-order learning and gates", () => {
    const p = createPlayer("id", "Aki");
    expect(() =>
      applyCommand(p, cmd("lesson", { index: 2, answer: 1 })),
    ).toThrow("current learning");
    expect(() => applyCommand(p, cmd("gate", { index: 0, answer: 0 }))).toThrow(
      "lessons first",
    );
  });
  it("records incorrect attempts without advancing or penalizing", () => {
    const p = applyCommand(
      createPlayer("id", "Aki"),
      cmd("lesson", { index: 0, answer: 0 }),
    );
    expect(p.feedback?.correct).toBe(false);
    expect(p.player.lesson).toBe(0);
    expect(p.player.attempts).toHaveLength(1);
    expect(p.player.game).toBeNull();
  });
  it("awards exactly five coins once, never sales revenue", () => {
    const p = ready();
    expect(p.game!.wallet).toBe(5);
    expect(totals(p.game!).revenue).toBe(0);
    expect(p.game!.ledger.filter((e) => e.category === "reward")).toHaveLength(
      1,
    );
    expect(() => applyCommand(p, cmd("setup", { name: "Again" }))).toThrow(
      "already created",
    );
  });
  it("retries are idempotent", () => {
    const p = ready();
    const c = cmd("roll");
    const result = applyCommand(p, c).player;
    expect(applyCommand(result, c).player).toEqual(result);
  });
  it("rejects client-selected admin profile roles and paused play", () => {
    const admin = createPlayer("a", "Owner", "admin");
    expect(() => applyCommand(admin, cmd("roll"))).toThrow("student");
    const p = ready();
    p.paused = true;
    expect(() => applyCommand(p, cmd("roll"))).toThrow("paused");
  });
  it("sanitizes markup and refuses contact information", () => {
    const p = createPlayer("a", "Aki");
    expect(
      applyCommand(p, cmd("profile", { name: "<Explorer>" })).player.name,
    ).toBe("Explorer");
    expect(() =>
      applyCommand(p, cmd("profile", { name: "child@example.com" })),
    ).toThrow("contact");
  });
  it("hides decks, RNG, and receipts at server snapshot boundary", () => {
    const view = publicPlayer(ready());
    expect(view).not.toHaveProperty("receipts");
    for (const key of ["rng", "budgetDeck", "marketDeck", "fortuneDeck"])
      expect(view.game).not.toHaveProperty(key);
  });
});
describe("economics", () => {
  it("settles successful sales only", () => {
    expect(settleSales(6, 3, [5, 6, 8])).toEqual({
      sales: 2,
      revenue: 12,
      cost: 6,
      profit: 6,
    });
    expect(settleSales(5, 3, [5, 6, 8])).toEqual({
      sales: 3,
      revenue: 15,
      cost: 9,
      profit: 6,
    });
    expect(settleSales(8, 3, [4, 5])).toEqual({
      sales: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
    });
  });
  it("bank transfers preserve total coins and profit", () => {
    const p = applyCommand(
      pending("bank"),
      cmd("decision", { amount: 3 }),
    ).player;
    expect(p.game!.wallet).toBe(2);
    expect(p.game!.savings).toBe(3);
    expect(totals(p.game!).profit).toBe(0);
  });
  it("rejects unaffordable, fractional, negative and oversized bank transfers", () => {
    for (const amount of [6, 1.5, -1, NaN, Infinity, "3"])
      expect(() =>
        applyCommand(pending("bank"), cmd("decision", { amount })),
      ).toThrow();
  });
  it("advertising carries visitors, does not create sales or revenue", () => {
    const p = applyCommand(
      pending("advertising"),
      cmd("decision", { amount: 4 }),
    ).player;
    expect(p.game!.wallet).toBe(1);
    expect(p.game!.effects[0].visitors).toBe(3);
    expect(p.game!.sales).toHaveLength(0);
    expect(totals(p.game!).profit).toBe(-4);
    expect(totals(p.game!).revenue).toBe(0);
  });
  it("requires Big Sale decision before revealing budgets", () => {
    const p = pending("big-sale");
    expect(() => applyCommand(p, cmd("roll"))).toThrow("current decision");
    const result = applyCommand(p, cmd("decision", { discount: 1 })).player;
    expect(result.game!.outcome!.budgets).toHaveLength(3);
    expect(result.game!.price).toBe(6);
    expect(result.game!.pending).toBeNull();
  });
  it("returns a sale only once and records refunds separately", () => {
    const p = pending("returns");
    p.game!.sales = [{ id: "s1", price: 6, cost: 3, returned: false }];
    p.game!.wallet = 10;
    const result = applyCommand(
      p,
      cmd("decision", { choice: "refund" }),
    ).player;
    expect(result.game!.wallet).toBe(4);
    expect(result.game!.sales[0].returned).toBe(true);
    expect(totals(result.game!).refund).toBe(6);
    result.game!.pending = "returns";
    expect(() =>
      applyCommand(result, cmd("decision", { choice: "refund" })),
    ).toThrow("eligible");
  });
  it("a recovery advance is debt, not revenue, and never takes savings", () => {
    const p = pending("returns");
    p.game!.sales = [{ id: "sale", price: 8, cost: 3, returned: false }];
    p.game!.savings = 10;
    const result = applyCommand(
      p,
      cmd("decision", { choice: "refund" }),
    ).player;
    expect(result.game!.wallet).toBe(0);
    expect(result.game!.liability).toBe(3);
    expect(result.game!.savings).toBe(10);
    expect(totals(result.game!).revenue).toBe(0);
  });
  it("price revisions are constrained and single-use", () => {
    const p = ready();
    expect(() => applyCommand(p, cmd("price", { price: 7 }))).toThrow();
    p.game!.revisionAllowed = true;
    expect(() => applyCommand(p, cmd("price", { price: 8 }))).toThrow(
      "at most one",
    );
    const result = applyCommand(p, cmd("price", { price: 7 })).player;
    expect(result.game!.price).toBe(7);
    expect(() => applyCommand(result, cmd("price", { price: 6 }))).toThrow();
  });
  it("does not accept arbitrary client wallet or die values", () => {
    const p = ready();
    const changed = applyCommand(
      p,
      cmd("profile", { wallet: 999999, admin: true, role: "admin" }),
    ).player;
    expect(changed.game!.wallet).toBe(5);
    expect(changed.role).toBe("student");
    const result = applyCommand(
      p,
      cmd("roll", { die: 100, wallet: 99999 }),
    ).player;
    expect(result.game!.lastDie).toBeGreaterThanOrEqual(1);
    expect(result.game!.lastDie).toBeLessThanOrEqual(6);
  });
});
describe("full quarter and village gate", () => {
  it("applies a retried roll once and rejects a distinct stale-turn request", () => {
    const p = ready();
    const request = cmd("roll", { expectedTurn: 0 });
    const result = applyCommand(p, request).player;
    expect(result.game!.turn).toBe(1);
    expect(applyCommand(result, request).player).toEqual(result);
    expect(() => applyCommand(result, cmd("roll", { expectedTurn: 0 }))).toThrow("already moved");
    expect(p.game!.turn).toBe(0);
  });
  it("has exactly the specified clockwise board", () => {
    expect(boardNames).toHaveLength(20);
    expect(boardPosition(0)).toEqual([-10, 0, 10]);
    expect(boardPosition(5)).toEqual([-10, 0, -10]);
    expect(boardPosition(10)).toEqual([10, 0, -10]);
    expect(boardPosition(15)).toEqual([10, 0, 10]);
    expect(boardNames[19]).toBe("Bank");
  });
  it("simulates 100 complete seed variations without negative balances", () => {
    for (let seed = 1; seed <= 100; seed++) {
      let p = ready(seed);
      let turns = 0;
      while (p.game!.phase === "board" && turns++ < 50) {
        const g = p.game!;
        if (g.pending) {
          const data =
            g.pending === "big-sale"
              ? { discount: 0 }
              : g.pending === "returns"
                ? { choice: "refund" }
                : g.pending === "fortune"
                  ? { accept: false }
                  : { amount: 0 };
          p = applyCommand(p, cmd("decision", data)).player;
        } else p = applyCommand(p, cmd("roll")).player;
        expect(p.game!.wallet).toBeGreaterThanOrEqual(0);
        expect(p.game!.savings).toBeGreaterThanOrEqual(0);
      }
      expect(p.game!.phase).toBe("reflection");
      expect(p.game!.position).toBe(0);
      expect(() => applyCommand(p, cmd("roll"))).toThrow("complete");
      p = applyCommand(
        p,
        cmd("reflect", {
          text: "I learned that price changes who can buy my bento.",
          rating: 2,
        }),
      ).player;
      expect(p.game!.phase).toBe("village");
    }
  });
  it("never unlocks exploration from an early or empty reflection", () => {
    const p = ready();
    expect(() =>
      applyCommand(
        p,
        cmd("reflect", { text: "I learned a lot today.", rating: 2 }),
      ),
    ).toThrow("first lap");
    p.game!.phase = "reflection";
    expect(() =>
      applyCommand(p, cmd("reflect", { text: "", rating: 2 })),
    ).toThrow("12–500");
  });
  it("ledger wallet and savings reconcile", () => {
    let p = ready();
    p.game!.pending = "bank";
    p = applyCommand(p, cmd("decision", { amount: 2 })).player;
    p.game!.pending = "advertising";
    p = applyCommand(p, cmd("decision", { amount: 2 })).player;
    expect(p.game!.ledger.reduce((s, e) => s + e.walletDelta, 0)).toBe(
      p.game!.wallet,
    );
    expect(p.game!.ledger.reduce((s, e) => s + e.savingsDelta, 0)).toBe(
      p.game!.savings,
    );
  });
});
