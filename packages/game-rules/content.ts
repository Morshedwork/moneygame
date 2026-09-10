// The brief specifies card names but not all monetary amounts. This versioned
// balancing table is provisional; changes require a new rules version.
export const RULES_VERSION = "q1-1.0-provisional";
export const budgets = [4, 4, 5, 5, 6, 6, 6, 7, 7, 8, 8, 10];
export const markets = [
  {
    name: "Rice Price Shock",
    text: "Rice is more expensive. Your next sales opportunity costs 1 extra coin per bento.",
    cost: 1,
    budget: 0,
    visitors: 0,
  },
  {
    name: "Cheaper Competitor",
    text: "A new stall draws budget-minded shoppers. Next time, customer budgets are 1 lower.",
    cost: 0,
    budget: -1,
    visitors: 0,
  },
  {
    name: "Rainy Festival",
    text: "Rain makes shoppers cautious. Next time, customer budgets are 1 lower.",
    cost: 0,
    budget: -1,
    visitors: 0,
  },
  {
    name: "Packaging Shortage",
    text: "Boxes cost more. Your next sales opportunity costs 1 extra coin per bento.",
    cost: 1,
    budget: 0,
    visitors: 0,
  },
  {
    name: "Customer Trend",
    text: "Your recipe is popular! Next time, customer budgets are 1 higher.",
    cost: 0,
    budget: 1,
    visitors: 0,
  },
  {
    name: "Large Order",
    text: "An office worker tells their friends. Two extra visitors will join your next sales opportunity.",
    cost: 0,
    budget: 0,
    visitors: 2,
  },
  {
    name: "Equipment Breakdown",
    text: "A quick repair makes your next sales opportunity cost 1 extra coin per bento.",
    cost: 1,
    budget: 0,
    visitors: 0,
  },
  {
    name: "Community Event",
    text: "The village is gathering. Two extra visitors will join your next sales opportunity.",
    cost: 0,
    budget: 0,
    visitors: 2,
  },
];
export const fortunes = [
  {
    name: "Great Blessing",
    text: "A village prize brings 3 coins. This is a gift, not sales revenue.",
    amount: 3,
  },
  {
    name: "Tip Jar",
    text: "A grateful customer leaves a 2-coin gift.",
    amount: 2,
  },
  {
    name: "Festival Rush",
    text: "Two extra visitors arrive at your next sales opportunity.",
    visitors: 2,
  },
  {
    name: "Clean Stall Award",
    text: "Your tidy stall wins a 2-coin village award.",
    amount: 2,
  },
  {
    name: "Recipe Compliment",
    text: "Word spreads about your recipe. One extra visitor next time.",
    visitors: 1,
  },
  {
    name: "Cash Box Recount",
    text: "You find a missing coin from your allowance. Record it as a gift.",
    amount: 1,
  },
  {
    name: "Dropped Tray",
    text: "A damaged tray needs a 1-coin repair.",
    amount: -1,
  },
  {
    name: "Spoiled Rice",
    text: "A spoiled bag of rice costs 2 coins to replace.",
    amount: -2,
  },
  {
    name: "Torn Banner",
    text: "Repairing your banner costs 1 coin.",
    amount: -1,
  },
  {
    name: "Smudged Price Sign",
    text: "Take a breath and rewrite your price sign. No coins change hands.",
    amount: 0,
  },
  {
    name: "Order Mix-up",
    text: "A small mix-up costs 1 coin to put right.",
    amount: -1,
  },
  {
    name: "Drizzle",
    text: "Shelter your stall. Your next visitors have budgets 1 coin lower.",
    budget: -1,
  },
  {
    name: "Bulk Rice Offer",
    text: "Buy a bulk pack for 2 coins to lower next opportunity’s cost by 1 per bento?",
    choice: true,
    fee: 2,
    cost: -1,
  },
  {
    name: "Fancy Packaging",
    text: "Spend 2 coins for attractive packaging and 2 extra visitors next time?",
    choice: true,
    fee: 2,
    visitors: 2,
  },
  {
    name: "Secondhand Griddle",
    text: "Spend 3 coins on a griddle to lower next opportunity’s cost by 1?",
    choice: true,
    fee: 3,
    cost: -1,
  },
  {
    name: "Charity Bento",
    text: "Contribute 1 coin to the festival fund? Kindness counts even without a reward.",
    choice: true,
    fee: 1,
    festival: 1,
  },
  {
    name: "Save-it Slip",
    text: "A reminder from Prena: use the bank to set some coins aside.",
    amount: 0,
  },
  {
    name: "Taste-test Day",
    text: "Invest 1 coin in a tasting and meet 2 extra visitors next time?",
    choice: true,
    fee: 1,
    visitors: 2,
  },
  {
    name: "Kitchen Trade",
    text: "Trade ideas with a neighbour. Your next opportunity costs 1 less per bento.",
    cost: -1,
  },
  {
    name: "Tie It to the Tree",
    text: "Leave a worry at the fortune tree. A fresh start costs nothing.",
    amount: 0,
  },
] as const;
