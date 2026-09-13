export const lessons = [
  {
    title: "Every bento tells a money story",
    concept: "PRICE",
    text: "A price is the amount you ask a customer to pay for one item. In your bento business, you choose a menu price between 4 and 8 LEAD Coins. The price is not automatically your profit, because you may still need to pay costs.",
    terms: [
      ["Price", "The amount a customer is asked to pay for one item."],
    ],
    why: "A clear price helps customers decide whether the bento fits their budget and helps you plan how much a sale could bring in.",
    example:
      "If the menu says 6 coins, the price of one bento is 6 coins. A customer who buys one pays 6 coins.",
    rule: "MENU NUMBER = PRICE FOR ONE BENTO",
    prompt: "Your menu says “Bento — 6 coins.” Which statement is correct?",
    choices: [
      "The price is 3 coins",
      "The price is 6 coins",
      "The profit is automatically 6 coins",
    ],
    answer: 1,
    explain:
      "The number on the menu is the price, so one bento costs the customer 6 coins. Profit can only be worked out after costs are subtracted.",
    visual: "price",
  },
  {
    title: "Ingredients have a cost",
    concept: "COST",
    text: "A cost is money the business spends to make or run something. Rice, vegetables, and a box cost 3 coins for each bento you actually sell. Because these bentos are made to order, no sale means no production cost in this lesson.",
    terms: [
      ["Cost", "Money the business spends to make or run something."],
      [
        "Production cost",
        "The cost of making the items that were sold.",
      ],
    ],
    why: "Knowing your costs stops you from mistaking all the money from a sale for money you get to keep.",
    example:
      "One sold bento costs 3 coins to make. Two sold bentos cost 2 × 3 = 6 coins to make.",
    rule: "NUMBER SOLD × 3 COINS = PRODUCTION COST",
    prompt:
      "Your bentos are made only after an order. No customer buys today. What is today’s production cost?",
    choices: ["3 coins", "6 coins", "0 coins"],
    answer: 2,
    explain:
      "The production cost is 0 coins. The business makes bentos to order, so it did not buy ingredients or a box for an unsold bento.",
    visual: "cost",
  },
  {
    title: "Money in. Money out.",
    concept: "REVENUE & PROFIT",
    text: "Revenue is all the money customers pay for successful sales, before costs are removed. Profit is what remains after the business subtracts its costs from that revenue. Revenue and profit are different: a business can collect money without keeping all of it.",
    terms: [
      ["Revenue", "All money from successful sales, before costs."],
      ["Profit", "Money left after costs are subtracted from revenue."],
    ],
    why: "Separating revenue from profit shows whether the business actually earned more than it spent.",
    example:
      "A customer pays 6 coins, so revenue is 6. Making the bento costs 3. The business keeps 6 − 3 = 3 coins as profit.",
    rule: "REVENUE − COSTS = PROFIT",
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
    text: "Break-even means revenue and costs are equal, so there is no profit and no loss. A loss happens when costs are greater than revenue. A loss is useful information: it tells you to review the price, costs, or plan.",
    terms: [
      ["Break-even", "Revenue equals costs: no profit and no loss."],
      ["Loss", "The amount by which costs are greater than revenue."],
    ],
    why: "Recognising a loss or break-even result helps you adjust the next decision instead of guessing.",
    example:
      "Revenue of 3 and cost of 3 is break-even. Revenue of 3 and cost of 5 is a 2-coin loss because 3 − 5 = −2.",
    rule: "EQUAL = BREAK-EVEN · COSTS ABOVE REVENUE = LOSS",
    prompt:
      "A market event brings in 3 coins but costs the business 5 coins. What is the result?",
    choices: ["A 2-coin loss", "A 2-coin profit", "Break-even"],
    answer: 0,
    explain:
      "Revenue minus costs is 3 − 5 = −2, so costs are 2 coins greater than revenue. That is a 2-coin loss and a chance to improve the plan.",
    visual: "loss",
  },
  {
    title: "Give tomorrow a little room",
    concept: "SAVINGS",
    text: "Savings are coins you already own that you set aside for later. Moving coins from your wallet to savings is a transfer: the coins change location, but your total money does not change. Saving is not new income, a new cost, or new profit.",
    terms: [
      ["Savings", "Money you already own and set aside for later."],
      [
        "Transfer",
        "Moving money from one place to another without changing the total."],
    ],
    why: "Savings can help with a future goal or an unexpected cost without pretending that you earned extra money.",
    example:
      "You have 5 coins in your wallet and move 2 to savings. Your wallet has 3, savings has 2, and the total is still 5.",
    rule: "WALLET + SAVINGS = TOTAL MONEY",
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
    text: "A refund returns money to a customer when a sale needs to be reversed. Risk means the result of a choice is uncertain: an advert may bring visitors, but each visitor still decides whether to buy. A thoughtful business plans for uncertainty and treats customers fairly.",
    terms: [
      ["Refund", "Money returned to a customer when a sale is reversed."],
      ["Risk", "The possibility that a result may differ from the plan."],
    ],
    why: "Planning for refunds and uncertain sales helps the business make fair choices without assuming the best result is guaranteed.",
    example:
      "An advert brings 2 visitors. Both might buy, one might buy, or neither might buy. The visitors are attention—not guaranteed revenue.",
    rule: "OPPORTUNITY IS NOT A GUARANTEE",
    prompt:
      "An advert brings 2 visitors to your stall. What can you safely conclude?",
    choices: [
      "The business has definitely made 2 sales",
      "The advert has removed every risk",
      "The visitors may buy, but sales are not guaranteed",
    ],
    answer: 2,
    explain:
      "The advert created an opportunity, not a promise. Visitors have different needs and budgets, so sales are still uncertain.",
    visual: "risk",
  },
] as const;
export const gate = [
  {
    question:
      "Your menu price is 6 coins. One customer buys and the bento costs 3 coins to make. Which money story is correct?",
    choices: [
      "Price 6 · revenue 6 · profit 3",
      "Price 3 · revenue 6 · profit 6",
      "Price 6 · revenue 3 · profit 9",
    ],
    answer: 0,
    explain:
      "The menu price is 6, the customer’s 6-coin payment is revenue, and 6 − 3 leaves 3 coins of profit.",
  },
  {
    question:
      "A festival day brings 8 coins of sales revenue. Bentos cost 6 coins to make, then you give a fair 3-coin refund. What is the final result?",
    choices: [
      "A 3-coin profit",
      "A 1-coin loss",
      "Break-even",
    ],
    answer: 1,
    explain:
      "Start with 8 coins of revenue, then subtract the 6-coin production cost and the 3-coin refund: 8 − 6 − 3 = −1. Costs are 1 coin greater than revenue, so this is a 1-coin loss.",
  },
  {
    question:
      "You move 2 of your 5 wallet coins to savings, then an advert brings 2 visitors. Which statement is accurate?",
    choices: [
      "Wallet 5 · savings 2 · total 7, with 2 guaranteed sales",
      "Wallet 3 · savings 2 · total 5, and the visitors may or may not buy",
      "Wallet 3 · savings 2 · profit rises by 2, with no advertising risk",
    ],
    answer: 1,
    explain:
      "The transfer leaves 3 coins in the wallet and 2 in savings, so the total stays 5. The advert creates an opportunity, but visitors do not guarantee sales.",
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
