export const lessons = [
  {
    title: "Every bento tells a money story",
    concept: "PRICE",
    text: "Price is what your customer pays for one bento. You choose a price between 4 and 8 LEAD Coins.",
    prompt: "You put 6 on your menu. What is your price?",
    choices: ["3 coins", "6 coins", "9 coins"],
    answer: 1,
    explain: "The number on your menu is the price: 6 coins.",
    visual: "price",
  },
  {
    title: "Ingredients have a cost",
    concept: "COST",
    text: "Rice, vegetables, and a box cost 3 coins for each bento you actually sell. No sale means no production cost.",
    prompt: "No customer buys today. What is your production cost?",
    choices: ["3 coins", "6 coins", "0 coins"],
    answer: 2,
    explain:
      "We make bentos to order. No successful sale means no production cost.",
    visual: "cost",
  },
  {
    title: "Money in. Money out.",
    concept: "REVENUE & PROFIT",
    text: "A customer pays 6 coins: that is revenue. Making the bento costs 3. The 3 left over is profit. Watch the coins move, then try it yourself.",
    prompt:
      "A customer pays 7. Making their bento costs 3. What is the profit?",
    choices: ["7 coins", "4 coins", "3 coins"],
    answer: 1,
    explain: "Profit = revenue − cost. 7 − 3 = 4 coins.",
    visual: "profit",
  },
  {
    title: "Some days we break even",
    concept: "LOSS & BREAK-EVEN",
    text: "Revenue of 3 and cost of 3 means break-even: no profit, no loss. If a special event costs 5 but brings in only 3, the loss is 2.",
    prompt: "You receive 3 coins and spend 5. What happened?",
    choices: ["A 2-coin loss", "A 2-coin profit", "Break-even"],
    answer: 0,
    explain: "3 − 5 = −2. A negative result is a loss, and a chance to adapt.",
    visual: "loss",
  },
  {
    title: "Give tomorrow a little room",
    concept: "SAVINGS",
    text: "At the bank, move coins from your wallet to savings. The total is unchanged. Saving is not a new expense or new profit.",
    prompt:
      "You move 2 coins from your wallet to savings. Did you earn 2 coins?",
    choices: [
      "Yes, saving creates income",
      "No, I moved coins I already had",
      "My profit fell by 2",
    ],
    answer: 1,
    explain:
      "A transfer changes where your coins are kept, not how much you earned.",
    visual: "savings",
  },
  {
    title: "Good choices are thoughtful choices",
    concept: "REFUNDS & RISK",
    text: "Sometimes a customer needs a refund. Sometimes an advert brings attention but no buyers. Plan for uncertainty, be fair, and learn from the result.",
    prompt: "Advertising brings 2 visitors. Are 2 sales guaranteed?",
    choices: [
      "Yes, always",
      "Only if my banner is blue",
      "No, visitors still decide whether to buy",
    ],
    answer: 2,
    explain:
      "Attention is an opportunity, not a promise. Customers have different budgets.",
    visual: "risk",
  },
] as const;
export const gate = [
  {
    question: "Match “revenue” to its meaning.",
    choices: [
      "Money customers pay you",
      "Money kept after costs",
      "Money moved to savings",
    ],
    answer: 0,
    explain: "Revenue is the money from sales before costs.",
  },
  {
    question:
      "You sell 2 bentos at 6 coins each. Each costs 3. Choose revenue / cost / profit.",
    choices: ["12 / 3 / 9", "12 / 6 / 6", "6 / 6 / 0"],
    answer: 1,
    explain: "Two sales bring 12 coins and cost 6, leaving 6 profit.",
  },
  {
    question: "You have 5 coins and save 2. Choose wallet / savings.",
    choices: ["5 / 2", "3 / 2", "2 / 5"],
    answer: 1,
    explain: "Your wallet has 3 and savings has 2: still 5 in total.",
  },
] as const;
export const boardNames = [
  "Start",
  "Sales Day",
  "Omikuji",
  "Bank",
  "Big Sale",
  "Festival Plaza",
  "Sales Day",
  "Market Change",
  "Omikuji",
  "Advertising",
  "Town Hall",
  "Sales Day",
  "Omikuji",
  "Returns",
  "Big Sale",
  "Sparko’s Bench",
  "Sales Day",
  "Market Change",
  "Omikuji",
  "Bank",
];
export const mascots = [
  {
    id: "lido",
    name: "Lido",
    role: "The Leader",
    color: "#f66b68",
    motto: "Take the first step. Help your team move forward.",
  },
  {
    id: "prena",
    name: "Prena",
    role: "The Planner",
    color: "#51aada",
    motto: "Turn a bright idea into a thoughtful plan.",
  },
  {
    id: "oty",
    name: "Oty",
    role: "The True Self",
    color: "#f9c927",
    motto: "Be you. Shine through. Your ideas matter.",
  },
  {
    id: "diva",
    name: "Diva",
    role: "The Connector",
    color: "#80be4c",
    motto: "Lift others. Grow together. Everyone belongs.",
  },
] as const;
export const glossary = [
  ["Price", "What one customer pays."],
  ["Revenue", "All money from successful sales, before costs."],
  ["Cost", "What you spend to make a sold bento."],
  ["Profit", "Revenue minus production costs, refunds, and business expenses."],
  ["Savings", "Your own coins set aside, not new income."],
  ["Liability", "An advance you still need to repay."],
];
