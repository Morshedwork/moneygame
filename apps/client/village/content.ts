import districtData from "./districts.json";

export type Mentor = "lido" | "prena" | "oty" | "diva" | "sparko";
export type Site = { id: string; name: string; mentor: Mentor; position: [number, number, number]; activity: string };
export type District = { id: string; name: string; subtitle: string; japanese: string; time: string; night: boolean; model: string; navigation: string; spawn: [number, number, number]; color: string; description: string; sites: Site[] };
export const districts = districtData as District[];
export const mentors: Record<Mentor, {name: string; role: string; color: string; greeting: string; encouragement: string}> = {
  lido: {name: "Lido", role: "Your leadership buddy", color: "#f96366", greeting: "Konnichiwa! A great village starts with people helping each other. What shall we discover?", encouragement: "A leader does not need every answer. Ask for help, listen, and take one small step."},
  prena: {name: "Prena", role: "Your planning buddy", color: "#52a7da", greeting: "Hello, explorer! Let’s turn one little idea into a plan. I have my thinking gears ready.", encouragement: "Slow it down. Read the goal, try one choice, and use the feedback. You can always try again."},
  oty: {name: "Oty", role: "Your confidence buddy", color: "#ffde00", greeting: "Hey, it’s you! This village has room for your kind of wonderful. What feels fun today?", encouragement: "You do not have to be perfect. A mistake is a clue, not a label. Let’s give it another go!"},
  diva: {name: "Diva", role: "Your connection buddy", color: "#6dba32", greeting: "Welcome! Different ideas make our village brighter. I’m glad you’re here.", encouragement: "Take a breath. Think about who needs help and what you can share. Kindness is a real strength."},
  sparko: {name: "Sparko", role: "Your money-quest buddy", color: "#52a7da", greeting: "Ready for a little adventure? We can practise useful skills, one friendly challenge at a time.", encouragement: "Try again with a new plan. Your festival stamps are for learning; they never spend your board-game money."},
};

export type Question = {prompt: string; options: string[]; answer: number; why: string};
export type Activity = {id: string; title: string; kind: "quiz" | "bento" | "budget" | "sequence" | "sort"; description: string; minutes: string; skill: string; hint: string; questions?: Question[]; sequence?: string[]; choices?: string[]};
export const activities: Record<string, Activity> = {
  bento: {id: "bento", title: "Bento kitchen", kind: "bento", description: "Read three customer orders and pack exactly what each customer asked for.", minutes: "2 min", skill: "Listening", hint: "Choose exactly the three items on the order card. Tap an item again to remove it."},
  budget: {id: "budget", title: "Plan a festival day", kind: "budget", description: "Plan with 12 pretend tokens: cover lunch, save for tomorrow, and share with the village.", minutes: "2 min", skill: "Planning", hint: "Use all 12 tokens. Lunch needs at least 5, savings at least 3, and sharing at least 2."},
  community: {id: "community", title: "A festival for everyone", kind: "quiz", description: "Help Lido make three welcoming choices for the community.", minutes: "2 min", skill: "Leadership", hint: "Good leaders listen and make space for other people.", questions: [
    {prompt: "A visitor cannot get their wheelchair past a queue. What should we do?", options: ["Ask them to wait somewhere else", "Keep an accessible path clear", "Make the queue even longer"], answer: 1, why: "A clear route helps everyone enjoy the festival."},
    {prompt: "Two stall owners both want the same space. What is a fair first step?", options: ["Listen to both and make a shared plan", "Give it to whoever shouts", "Ignore both of them"], answer: 0, why: "Listening helps us find a fair solution."},
    {prompt: "A new helper has a different idea. How can you lead?", options: ["Only accept your own idea", "Let the loudest person decide", "Invite them to explain and try it together"], answer: 2, why: "Different perspectives make a team stronger."},
  ]},
  kindness: {id: "kindness", title: "Little acts of kindness", kind: "quiz", description: "Make three choices that help everyone feel they belong.", minutes: "2 min", skill: "Empathy", hint: "Ask, listen, and include. A friend’s needs can be different from yours.", questions: [
    {prompt: "A friend is quiet while everyone chooses an activity.", options: ["Ask what they would enjoy", "Choose for them without asking", "Leave them behind"], answer: 0, why: "An invitation gives everyone a voice."},
    {prompt: "Someone makes a mistake at the stall.", options: ["Laugh at them", "Offer help and practise together", "Tell everyone about it"], answer: 1, why: "Support makes it easier to learn from a mistake."},
    {prompt: "A friend says they need a quiet break.", options: ["Insist that they stay", "Tell them breaks are boring", "Respect their choice and suggest the garden"], answer: 2, why: "Respecting boundaries is a kind way to care."},
  ]},
  rhythm: {id: "rhythm", title: "Festival rhythm", kind: "sequence", description: "Build an untimed festival pattern: clap, tap, clap, rest. Read it as often as you like.", minutes: "1 min", skill: "Focus", hint: "Follow the pattern from left to right. There is no time limit.", sequence: ["Clap", "Tap", "Clap", "Rest"], choices: ["Clap", "Tap", "Rest"]},
  picnic: {id: "picnic", title: "The thoughtful picnic", kind: "quiz", description: "Plan a picnic that welcomes your friends and protects the garden.", minutes: "2 min", skill: "Care", hint: "Check what people need before making a plan.", questions: [
    {prompt: "Before packing food for friends, what should you ask?", options: ["Who has the biggest bag?", "Does anyone have food allergies or dietary needs?", "Who can eat the fastest?"], answer: 1, why: "Check food needs with a trusted adult so everyone can join safely."},
    {prompt: "There is a marked path beside the cherry trees. Where do we walk?", options: ["Over the young plants", "Climb a tree for a shortcut", "Stay on the path"], answer: 2, why: "Paths protect plant roots and keep the garden welcoming."},
    {prompt: "Our picnic is over. What comes next?", options: ["Take our things and clean up", "Leave wrappers for someone else", "Hide leftovers under a bench"], answer: 0, why: "Caring for a shared place means leaving it ready for the next visitor."},
  ]},
  tea: {id: "tea", title: "Welcome to the tea house", kind: "quiz", description: "Practise listening, checking an order, and welcoming a guest.", minutes: "2 min", skill: "Service", hint: "Ask first, check the order, and get an adult for anything hot.", questions: [
    {prompt: "A guest arrives at your pretend tea house.", options: ["Guess their order", "Welcome them and ask what they would like", "Ignore them"], answer: 1, why: "Friendly service begins with listening."},
    {prompt: "The guest requests a cold drink with no sugar. Which matches?", options: ["Hot sweet tea", "Cold sweet tea", "Cold unsweetened tea"], answer: 2, why: "Checking the details helps you serve the right order."},
    {prompt: "In real life, a kettle is hot. What should you do?", options: ["Ask a trusted adult to handle it", "Carry it quickly yourself", "Touch it to test the heat"], answer: 0, why: "A trusted adult should handle hot water. This activity is pretend."},
  ]},
  river: {id: "river", title: "River care sorting", kind: "sort", description: "Sort six items into our pretend festival bins. There is no timer.", minutes: "2 min", skill: "Stewardship", hint: "These are simplified game bins. Real recycling rules vary; ask an adult about local rules."},
  lantern: {id: "lantern", title: "Light the lantern pattern", kind: "sequence", description: "Follow a LEAD color pattern for the lantern string. Every color has a written label.", minutes: "1 min", skill: "Observation", hint: "The pattern is Coral, Sky, Yellow, Green, Sky. Read it as often as you like.", sequence: ["Coral", "Sky", "Yellow", "Green", "Sky"], choices: ["Coral", "Sky", "Yellow", "Green"]},
  paper: {id: "paper", title: "Paper fan workshop", kind: "sequence", description: "Put a simple paper-fan plan in order. Ask an adult if you try a craft away from the game.", minutes: "1 min", skill: "Sequencing", hint: "Fold the paper back and forth, pinch one end, secure it with tape, then open the top.", sequence: ["Fold back and forth", "Pinch one end", "Secure with tape", "Open the top"], choices: ["Open the top", "Secure with tape", "Fold back and forth", "Pinch one end"]},
  makers: {id: "makers", title: "My little idea pitch", kind: "quiz", description: "Help Sparko explain a useful idea at the makers’ stage.", minutes: "2 min", skill: "Entrepreneurship", hint: "A clear pitch says who you help, what problem you solve, and how you will test the idea.", questions: [
    {prompt: "Friends keep losing their reusable cups. Which idea helps?", options: ["A cup-name tag station", "A louder music player", "A bigger queue"], answer: 0, why: "A useful idea starts with a real problem."},
    {prompt: "Who should try your first cup-name tag?", options: ["Nobody", "A friend who often loses their cup", "Only someone who never uses a cup"], answer: 1, why: "Test with someone who has the problem you want to solve."},
    {prompt: "Your friend says the tag falls off. What now?", options: ["Ignore the feedback", "Stop listening to friends", "Improve the fastening and test again"], answer: 2, why: "Try, learn, improve, repeat. Feedback makes your idea stronger."},
  ]},
};

export const bentoOrders = [
  {name: "Mika", order: ["Rice", "Tofu", "Carrot"]},
  {name: "Ren", order: ["Rice", "Edamame", "Cucumber"]},
  {name: "Hana", order: ["Tofu", "Carrot", "Cucumber"]},
];
export const ingredients = ["Rice", "Tofu", "Carrot", "Edamame", "Cucumber"];
export const sortingItems = [
  {name: "Banana peel", bin: "Compost"}, {name: "Clean paper flyer", bin: "Paper"},
  {name: "Empty plastic bottle", bin: "Containers"}, {name: "Apple core", bin: "Compost"},
  {name: "Clean cardboard sleeve", bin: "Paper"}, {name: "Empty drink can", bin: "Containers"},
];

export function matchesOrder(selected: string[], order: string[]) {
  return selected.length === order.length && new Set(selected).size === order.length && order.every(item => selected.includes(item));
}
export function checkBudget(values: number[]) {
  return values.length === 3 && values.every(v => Number.isInteger(v) && v >= 0 && v <= 12) && values.reduce((a, b) => a + b, 0) === 12 && values[0] >= 5 && values[1] >= 3 && values[2] >= 2;
}
export type ChatTopic = "place" | "hint" | "help" | "celebrate";
export const chatTopics: {id: ChatTopic; label: string}[] = [
  {id: "place", label: "Tell me about this place"}, {id: "hint", label: "Give me an activity tip"},
  {id: "help", label: "I need encouragement"}, {id: "celebrate", label: "Let’s celebrate my progress"},
];
export function mentorReply(mentor: Mentor, topic: ChatTopic, district: District, site: Site | undefined, completed: string[]) {
  if (topic === "place") return `${district.name}: ${district.description} ${site ? `Meet me at ${site.name} for ${activities[site.activity].title.toLowerCase()}.` : "Choose a place on your activity passport to discover what is nearby."}`;
  if (topic === "hint") return site ? activities[site.activity].hint : "Open your activity passport, choose a district, then walk to a mentor. Press E or tap the prompt to chat and play.";
  if (topic === "help") return mentors[mentor].encouragement;
  const count = new Set(completed.filter(id => activities[id])).size;
  return count ? `You have earned ${count} of ${Object.keys(activities).length} village stamps. Each one is a skill you practised. ${count === Object.keys(activities).length ? "Your passport is complete! You can replay any activity for fun." : "Which new place shall we explore next?"}` : "You already took the first step by exploring! Choose any activity to earn your first village stamp. There is no rush.";
}
