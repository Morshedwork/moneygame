import { boardNames, gate, lessons, mascots } from "../curriculum";
import { budgets, fortunes, markets, RULES_VERSION } from "./content";
import { applyHeroCommand, HeroProgress, initialHeroProgress } from "../hero-lab";
export type Role = "student" | "parent" | "admin";
export type LedgerEntry = {
  id: string;
  at: number;
  tile: number;
  turn: number;
  category: string;
  note: string;
  walletDelta: number;
  savingsDelta: number;
  liabilityDelta: number;
  revenue: number;
  cost: number;
  expense: number;
  refund: number;
};
export type Sale = {
  id: string;
  price: number;
  cost: number;
  returned: boolean;
};
export type Effect = {
  id: string;
  name: string;
  trigger: "next-sale";
  remaining: number;
  cost: number;
  budget: number;
  visitors: number;
};
export type Outcome = {
  title: string;
  text: string;
  budgets?: number[];
  sales?: number;
  revenue?: number;
  cost?: number;
  profit?: number;
  die?: number;
};
export type Game = {
  phase: "board" | "reflection" | "village";
  position: number;
  turn: number;
  price: number;
  name: string;
  color: string;
  goal: string;
  wallet: number;
  savings: number;
  liability: number;
  ledger: LedgerEntry[];
  sales: Sale[];
  effects: Effect[];
  festival: number;
  pending: string | null;
  card: number;
  outcome: Outcome | null;
  lastDie: number;
  path: number[];
  rng: number;
  budgetDeck: number[];
  marketDeck: number[];
  fortuneDeck: number[];
  reflection: string;
  reflectionRating: number;
  revisionAllowed: boolean;
  rulesVersion: string;
};
export type Player = {
  id: string;
  name: string;
  role: Role;
  avatar: string;
  language: string;
  createdAt: number;
  parents: string[];
  lesson: number;
  gate: number;
  attempts: { kind: string; index: number; correct: boolean; at: number }[];
  rewarded: boolean;
  game: Game | null;
  receipts: string[];
  paused: boolean;
  dailyMinutes: number;
  heroLab?: HeroProgress;
};
export type Command = { id: string; type: string; [key: string]: unknown };
export type Result = {
  player: Player;
  feedback?: { correct: boolean; text: string };
};
export function createPlayer(
  id: string,
  name: string,
  role: Role = "student",
): Player {
  return {
    id,
    name,
    role,
    avatar: "prena",
    language: "en",
    createdAt: Date.now(),
    parents: [],
    lesson: 0,
    gate: 0,
    attempts: [],
    rewarded: false,
    game: null,
    receipts: [],
    paused: false,
    dailyMinutes: 30,
    heroLab: initialHeroProgress(),
  };
}
function requireThat(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
const integer = (n: unknown, min: number, max: number) => {
  requireThat(
    typeof n === "number" && Number.isInteger(n) && n >= min && n <= max,
    `Choose a whole number from ${min} to ${max}.`,
  );
  return n;
};
export function safeName(n: unknown, max = 32) {
  requireThat(typeof n === "string", "Please enter a name.");
  const s = n.trim().replace(/[<>\x00-\x1f]/g, "");
  requireThat(
    s.length >= 2 && s.length <= max,
    `Please use 2–${max} characters.`,
  );
  requireThat(
    !/(https?:|www\.|@)/i.test(s),
    "Use a display name, not personal contact information.",
  );
  return s;
}
function next(g: Game) {
  g.rng = (Math.imul(g.rng, 1664525) + 1013904223) >>> 0;
  return g.rng / 4294967296;
}
function shuffle<T>(g: Game, a: readonly T[]) {
  const d = [...a];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(next(g) * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}
function draw(
  g: Game,
  key: "budgetDeck" | "marketDeck" | "fortuneDeck",
  source: readonly number[],
) {
  if (!g[key].length) g[key] = shuffle(g, source);
  return g[key].pop()!;
}
function ledger(
  g: Game,
  id: string,
  category: string,
  note: string,
  walletDelta = 0,
  savingsDelta = 0,
  liabilityDelta = 0,
  revenue = 0,
  cost = 0,
  expense = 0,
  refund = 0,
) {
  requireThat(
    !g.ledger.some((e) => e.id === id),
    "This transaction already happened.",
  );
  g.wallet += walletDelta;
  g.savings += savingsDelta;
  g.liability += liabilityDelta;
  requireThat(
    g.wallet >= 0 && g.savings >= 0 && g.liability >= 0,
    "Not enough coins.",
  );
  g.ledger.push({
    id,
    at: Date.now(),
    tile: g.position,
    turn: g.turn,
    category,
    note,
    walletDelta,
    savingsDelta,
    liabilityDelta,
    revenue,
    cost,
    expense,
    refund,
  });
}
function charge(g: Game, id: string, amount: number, note: string, refund = 0) {
  const advance = Math.max(0, amount - g.wallet);
  if (advance)
    ledger(
      g,
      id + "-advance",
      "advance",
      "Recovery advance: repay when ready",
      advance,
      0,
      advance,
    );
  ledger(
    g,
    id,
    "expense",
    note,
    -amount,
    0,
    0,
    0,
    0,
    refund ? 0 : amount,
    refund,
  );
}
function addEffect(
  g: Game,
  id: string,
  name: string,
  e: { cost?: number; budget?: number; visitors?: number },
) {
  g.effects.push({
    id,
    name,
    trigger: "next-sale",
    remaining: 1,
    cost: e.cost || 0,
    budget: e.budget || 0,
    visitors: e.visitors || 0,
  });
}
export function settleSales(
  price: number,
  cost: number,
  customerBudgets: number[],
) {
  const sales = customerBudgets.filter((b) => b >= price).length;
  return {
    sales,
    revenue: sales * price,
    cost: sales * cost,
    profit: sales * (price - cost),
  };
}
function sale(g: Game, id: string, discount: number, big = false) {
  const count = (big ? 3 : 1) + g.effects.reduce((n, e) => n + e.visitors, 0);
  const cost = Math.max(1, 3 + g.effects.reduce((n, e) => n + e.cost, 0));
  const b = g.effects.reduce((n, e) => n + e.budget, 0);
  const customerBudgets = Array.from({ length: Math.min(12, count) }, () =>
    Math.max(0, draw(g, "budgetDeck", budgets) + b),
  );
  const actualPrice = g.price - discount;
  const summary = settleSales(actualPrice, cost, customerBudgets);
  if (g.wallet + summary.profit < 0) {
    const advance = -(g.wallet + summary.profit);
    ledger(
      g,
      id + "-production-advance",
      "advance",
      "Recovery advance for production costs",
      advance,
      0,
      advance,
    );
  }
  ledger(
    g,
    id,
    "sale",
    `${summary.sales} bento${summary.sales === 1 ? "" : "s"} sold at ${actualPrice}`,
    summary.profit,
    0,
    0,
    summary.revenue,
    summary.cost,
  );
  for (let i = 0; i < summary.sales; i++)
    g.sales.push({
      id: id + "-" + i,
      price: actualPrice,
      cost,
      returned: false,
    });
  g.effects = [];
  g.outcome = {
    title: summary.sales
      ? "Fresh bento, happy customers!"
      : "Not every visit becomes a sale",
    text: summary.sales
      ? `${summary.sales} of ${count} visitors could afford your bento. Revenue is money in; profit is what remains after making it.`
      : "These visitors had smaller budgets. No sale means no production cost. You can adapt your price.",
    budgets: customerBudgets,
    ...summary,
  };
  g.pending = null;
  g.revisionAllowed = true;
}
function land(g: Game, id: string) {
  const tile = boardNames[g.position];
  g.revisionAllowed = false;
  g.outcome = null;
  if (tile === "Sales Day") {
    sale(g, id, 0);
    return;
  }
  if (tile === "Big Sale") {
    g.pending = "big-sale";
    g.outcome = {
      title: "Three customers are on their way",
      text: "Keep your menu price or discount by 1 coin for this opportunity. Decide before seeing their budgets.",
    };
    return;
  }
  if (tile === "Market Change") {
    g.card = draw(
      g,
      "marketDeck",
      markets.map((_, i) => i),
    );
    const c = markets[g.card];
    addEffect(g, id, c.name, c);
    g.outcome = { title: c.name, text: c.text };
    g.pending = null;
    g.revisionAllowed = true;
    return;
  }
  if (tile === "Omikuji") {
    g.card = draw(
      g,
      "fortuneDeck",
      fortunes.map((_, i) => i),
    );
    const c = fortunes[g.card] as any;
    g.outcome = { title: c.name, text: c.text };
    if (c.choice) g.pending = "fortune";
    else {
      g.pending = null;
      if (c.amount > 0) ledger(g, id, "gift", c.name, c.amount);
      if (c.amount < 0) charge(g, id, -c.amount, c.name);
      if (c.cost || c.visitors || c.budget) addEffect(g, id, c.name, c);
    }
    return;
  }
  const prompts: Record<string, [string, string, string]> = {
    Bank: [
      "bank",
      "A little room for tomorrow",
      "Move up to 5 affordable coins into protected savings. This is a transfer, not an expense.",
    ],
    Advertising: [
      "advertising",
      "Let the village know",
      "Choose a plan before meeting visitors. 0 coins brings 1 visitor, 2 brings 2, and 4 brings 3. Visitors are not guaranteed sales.",
    ],
    Returns: [
      "returns",
      "A customer needs your help",
      "Refund a past sale, or try a replacement costing 3 coins. A roll of 4–6 succeeds; 1–3 also needs a refund.",
    ],
    "Festival Plaza": [
      "festival",
      "A festival we build together",
      "Contribute 0–2 affordable coins. Contributions are a business expense, and help light the village.",
    ],
    "Town Hall": [
      "ack",
      "A note from Town Hall",
      "Communities use taxes for shared services. There is no tax in Quarter 1. No coins are taken.",
    ],
    "Sparko’s Bench": [
      "bench",
      "Pause. Notice. Adapt.",
      "What did your last choice teach you? You may adjust your menu price by one coin.",
    ],
  };
  const p = prompts[tile];
  g.pending = p?.[0] || null;
  g.outcome = {
    title: p?.[1] || tile,
    text: p?.[2] || "Take a moment to explore.",
  };
  if (tile === "Returns" && !g.sales.some((s) => !s.returned)) {
    g.pending = null;
    g.outcome.text =
      "No eligible past sale needs a return. Nothing is charged.";
  }
}
export function applyCommand(
  original: Player,
  c: Command,
  seed = 12345,
): Result {
  requireThat(
    typeof c.id === "string" && c.id.length >= 8 && c.id.length <= 100,
    "A valid request id is required.",
  );
  if (original.receipts.includes(c.id)) return { player: original };
  const p = structuredClone(original);
  let feedback: Result["feedback"];
  requireThat(
    p.role === "student" || ["profile"].includes(c.type),
    "Only student profiles can play.",
  );
  requireThat(
    !p.paused || c.type === "profile",
    "Your parent has paused play. Please check in with them.",
  );
  if (c.type === "profile") {
    if (c.name !== undefined) p.name = safeName(c.name);
    if (c.avatar !== undefined) {
      requireThat(
        mascots.some((m) => m.id === c.avatar),
        "Choose a LEAD character.",
      );
      p.avatar = String(c.avatar);
    }
    if (c.language !== undefined) {
      requireThat(
        ["en", "ja"].includes(String(c.language)),
        "Unsupported language.",
      );
      p.language = String(c.language);
    }
  } else if (c.type === "hero-lab") {
    const result = applyHeroCommand(p.heroLab, c);
    p.heroLab = result.progress;
    feedback = result.feedback;
  } else if (c.type === "lesson" || c.type === "gate") {
    const isGate = c.type === "gate";
    requireThat(
      !isGate || p.lesson === lessons.length,
      "Complete the lessons first.",
    );
    const list = isGate ? gate : lessons;
    const index = isGate ? p.gate : p.lesson;
    requireThat(
      index < list.length,
      "This learning section is already complete.",
    );
    requireThat(c.index === index, "Continue from your current learning step.");
    const a = integer(c.answer, 0, 2);
    const correct = a === list[index].answer;
    feedback = { correct, text: list[index].explain };
    p.attempts.push({ kind: c.type, index, correct, at: Date.now() });
    if (correct) {
      if (isGate) p.gate++;
      else p.lesson++;
    }
    if (p.gate === gate.length && !p.rewarded) p.rewarded = true;
  } else if (c.type === "setup") {
    requireThat(
      p.rewarded && p.lesson === lessons.length && p.gate === gate.length,
      "Finish your finance understanding check first.",
    );
    requireThat(!p.game, "Your business is already created.");
    const price = integer(c.price, 4, 8);
    const color = String(c.color);
    requireThat(/^#[0-9a-f]{6}$/i.test(color), "Choose a valid banner color.");
    const g: Game = {
      phase: "board",
      position: 0,
      turn: 0,
      price,
      name: safeName(c.name),
      color,
      goal: safeName(c.goal, 100),
      wallet: 0,
      savings: 0,
      liability: 0,
      ledger: [],
      sales: [],
      effects: [],
      festival: 0,
      pending: null,
      card: 0,
      outcome: {
        title: "Your first five coins",
        text: "You earned these coins by learning. They are a reward, not sales revenue. Roll the die when you are ready.",
      },
      lastDie: 0,
      path: [],
      rng: seed >>> 0,
      budgetDeck: [],
      marketDeck: [],
      fortuneDeck: [],
      reflection: "",
      reflectionRating: 0,
      revisionAllowed: false,
      rulesVersion: RULES_VERSION,
    };
    ledger(g, "lesson-reward", "reward", "Finance learning completed", 5);
    p.game = g;
  } else {
    const g = p.game;
    requireThat(g, "Create your business first.");
    if (c.type === "reflect") {
      requireThat(
        g.phase === "reflection",
        "Finish your first lap before reflecting.",
      );
      requireThat(
        typeof c.text === "string" &&
          c.text.trim().length >= 12 &&
          c.text.length <= 500,
        "Write 12–500 characters about a choice you learned from.",
      );
      g.reflection = c.text.trim();
      g.reflectionRating = integer(c.rating, 1, 3);
      g.phase = "village";
      g.outcome = {
        title: "Welcome to Yatai Village",
        text: "Your first chapter is complete. Explore, meet your mentors, and keep growing.",
      };
    } else if (c.type === "repay") {
      const amount = integer(c.amount, 1, Math.min(g.wallet, g.liability));
      ledger(
        g,
        c.id,
        "repayment",
        "Repay recovery advance",
        -amount,
        0,
        -amount,
      );
    } else {
      requireThat(
        g.phase === "board",
        "Quarter 1 is complete. Visit your journal or explore the village.",
      );
      if (c.type === "roll") {
        // A stale tab or duplicate click must not spend a second turn. Optional
        // for compatibility with saved clients; current clients always send it.
        requireThat(c.expectedTurn === undefined || c.expectedTurn === g.turn,
          "This turn has already moved. Wait for the current roll to finish.");
        requireThat(!g.pending, "Make your current decision first.");
        const die = 1 + Math.floor(next(g) * 6);
        g.lastDie = die;
        g.turn++;
        const end = Math.min(20, g.position + die);
        g.path = Array.from(
          { length: end - g.position },
          (_, i) => (g.position + i + 1) % 20,
        );
        g.position = end % 20;
        if (end === 20) {
          g.phase = "reflection";
          g.pending = null;
          g.outcome = {
            title: "A full lap. A new perspective.",
            text: "Quarter 1 is complete. Reflect on one choice before your village adventure.",
          };
        } else land(g, c.id);
      } else if (c.type === "price") {
        requireThat(
          g.revisionAllowed && !g.pending,
          "You can revise price after Sales Day, Market Change, or Sparko’s Bench.",
        );
        const price = integer(c.price, 4, 8);
        requireThat(
          Math.abs(price - g.price) <= 1,
          "Adjust by at most one coin.",
        );
        g.price = price;
        g.revisionAllowed = false;
      } else if (c.type === "decision") {
        requireThat(g.pending, "There is no pending decision.");
        const pending = g.pending;
        if (pending === "big-sale") {
          const discount = integer(c.discount, 0, 1);
          sale(g, c.id, discount, true);
        } else if (pending === "bank") {
          const n = integer(c.amount, 0, Math.min(5, g.wallet));
          ledger(g, c.id, "savings", "Transfer to protected savings", -n, n);
          g.outcome = {
            title: n ? "Tomorrow says thank you" : "Keeping your options open",
            text: `${n} coins moved into savings. This transfer does not change your profit.`,
          };
        } else if (pending === "advertising") {
          const n = integer(c.amount, 0, 4);
          requireThat(
            [0, 2, 4].includes(n) && n <= g.wallet,
            "Choose an affordable advertising plan.",
          );
          ledger(
            g,
            c.id,
            "advertising",
            "Advertise next sales opportunity",
            -n,
            0,
            0,
            0,
            0,
            n,
          );
          addEffect(g, c.id, "Your advertising", { visitors: n / 2 + 1 });
          g.outcome = {
            title: "Your invitation is out there",
            text: `${n / 2 + 1} extra visitors will join the next sales opportunity. Each still has their own budget.`,
          };
        } else if (pending === "festival") {
          const n = integer(c.amount, 0, Math.min(2, g.wallet));
          ledger(
            g,
            c.id,
            "festival",
            "Contribute to the village festival",
            -n,
            0,
            0,
            0,
            0,
            n,
          );
          g.festival += n;
          g.outcome = {
            title: "A village grows together",
            text: `You contributed ${n} coins. This is a community expense, not sales revenue.`,
          };
        } else if (pending === "returns") {
          const s = [...g.sales].reverse().find((s) => !s.returned);
          requireThat(s, "No eligible sale.");
          requireThat(
            ["refund", "replace"].includes(String(c.choice)),
            "Choose refund or replacement.",
          );
          s.returned = true;
          if (c.choice === "refund") {
            charge(g, c.id, s.price, "Customer refund", s.price);
            g.outcome = {
              title: "A fair refund",
              text: `You returned ${s.price} coins to the customer. Their original production cost still happened.`,
            };
          } else {
            charge(g, c.id, 3, "Replacement production");
            const die = 1 + Math.floor(next(g) * 6);
            if (die < 4)
              charge(
                g,
                c.id + "-refund",
                s.price,
                "Replacement unsuccessful: refund",
                s.price,
              );
            g.outcome = {
              title:
                die >= 4 ? "A fresh start" : "The replacement did not work out",
              text:
                die >= 4
                  ? "The replacement cost 3 coins. Your customer is happy."
                  : `The replacement cost 3 coins and the customer also received a ${s.price}-coin refund.`,
              die,
            };
          }
        } else if (pending === "fortune") {
          requireThat(
            typeof c.accept === "boolean",
            "Choose accept or decline.",
          );
          const card = fortunes[g.card] as any;
          if (c.accept) {
            requireThat(
              card.fee <= g.wallet,
              "Not enough coins for this optional choice.",
            );
            ledger(
              g,
              c.id,
              "fortune",
              card.name,
              -card.fee,
              0,
              0,
              0,
              0,
              card.fee,
            );
            if (card.cost || card.visitors) addEffect(g, c.id, card.name, card);
            g.festival += card.festival || 0;
          }
          g.outcome = {
            title: card.name,
            text: c.accept
              ? "You chose to take this opportunity. See its effect in your journal."
              : "You decided to keep your coins. Saying no can be a thoughtful choice.",
          };
        } else if (pending === "bench") {
          g.revisionAllowed = true;
          g.outcome = {
            title: "A moment of reflection",
            text: "There is no perfect price for everyone. What can you try next?",
          };
        }
        g.pending = null;
      } else throw new Error("Unknown game action.");
    }
  }
  p.receipts.push(c.id);
  return { player: p, feedback };
}
export function totals(g: Game) {
  return g.ledger.reduce(
    (t, e) => ({
      revenue: t.revenue + e.revenue,
      cost: t.cost + e.cost,
      expense: t.expense + e.expense,
      refund: t.refund + e.refund,
      profit: t.profit + e.revenue - e.cost - e.expense - e.refund,
    }),
    { revenue: 0, cost: 0, expense: 0, refund: 0, profit: 0 },
  );
}
export function publicPlayer(p: Player) {
  const { receipts, ...visible } = p;
  const g = p.game;
  if (!g) return { ...visible, game: null };
  const { rng, budgetDeck, marketDeck, fortuneDeck, ...game } = g;
  return { ...visible, game };
}
export function boardPosition(index: number): [number, number, number] {
  if (index <= 5) return [-10, 0, 10 - index * 4];
  if (index <= 10) return [-10 + (index - 5) * 4, 0, -10];
  if (index <= 15) return [10, 0, -10 + (index - 10) * 4];
  return [10 - (index - 15) * 4, 0, 10];
}
