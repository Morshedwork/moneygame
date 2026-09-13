export type HeroUnit = {
  id: string; title: string; mentor: 'oty' | 'prena' | 'lido' | 'diva'; station: string;
  lesson: string[]; question: string; options: string[]; answer: number; explain: string;
  activity: string; brief: string; reflection: string; reflections: string[]; home: string;
};
export const heroPhases = ['Know Yourself', 'Explore & Create', 'Build & Lead'];
export const strengths = ['Curiosity', 'Kindness', 'Creativity', 'Courage', 'Teamwork', 'Patience'];
export const jobs = ['Welcome visitors', 'Decorate the festival', 'Plan a stall', 'Help a neighbour'];
export const goalSteps = ['Choose a goal', 'Plan one small step', 'Try the step', 'Review and adjust'];
export const storySteps = ['A visitor needs water', 'The water station is hard to find', 'We make a clear sign', 'We hope visitors find water more easily'];
export const observations = [
  { text: 'Two benches are empty.', observed: true },
  { text: 'Everyone hates these benches.', observed: false },
  { text: 'Four visitors asked for directions.', observed: true },
  { text: 'Visitors hate maps.', observed: false },
  { text: 'The sign faces away from the path.', observed: true },
  { text: 'Nobody can read the sign.', observed: false },
];
export const improvements = [
  { label: 'Clear direction sign', cost: 2, useful: true },
  { label: 'Simple village map', cost: 2, useful: true },
  { label: 'Decorative arch', cost: 4, useful: false },
  { label: 'Path marker', cost: 1, useful: true },
];
export const audiences = ['Families taking a break', 'Visitors looking for water', 'New festival visitors'];
export const needs = ['A comfortable place to rest', 'An easy way to find water', 'Help finding their way'];
export const offers = ['A shaded rest corner', 'A labelled water sign', 'A simple welcome map'];
export const brandColors = ['#FFDE00', '#52A7DA', '#F96366', '#6DBA32', '#B698F5'];
export const brandColorNames = ['Oty yellow', 'Prena blue', 'Lido coral', 'Diva green', 'Guidebook lavender'];
export const brandSymbols = ['Water drop', 'Leaf', 'Light bulb', 'Star'];
export const heroUnits: HeroUnit[] = [
  {
    id: 'super-you', title: 'Discover the Super You', mentor: 'oty', station: 'Welcome gate',
    lesson: ['A hero can be curious, patient, creative or kind. There is no single best strength. Noticing a detail or welcoming someone can matter just as much as speaking first.', 'Strengths grow when you use them. Choose something you enjoy and something you want to practise at the festival. You do not need to be perfect before you begin.'],
    question: 'Which action helps you develop a strength?', options: ['Wait until you are perfect', 'Try a small task and notice what you learn', 'Always copy a friend'], answer: 1,
    explain: 'A small attempt gives you something to learn from. Different strengths can help with the same task.',
    activity: 'Your superpower passport', brief: 'Choose three strengths and a festival job where you could practise them. There is more than one good combination.',
    reflection: 'What would you like to practise next?', reflections: ['Notice a small detail', 'Try something new', 'Help someone feel included'],
    home: 'Notice one helpful action today. You do not need to record anyone’s name.',
  },
  {
    id: 'power-house', title: 'Know Yourself: Build Your Power House', mentor: 'oty', station: 'Quiet garden',
    lesson: ['Feelings give us information. Feeling worried does not mean you cannot try, and feeling excited does not mean you have to rush.', 'A useful habit is to pause, name a feeling and choose a safe next step. A breath, a short break, a smaller step or asking for help can all be useful.'],
    question: 'Your festival sign falls down and you feel frustrated. What could help?', options: ['Pause, then ask for help repairing it', 'Pretend you never feel frustrated', 'Give up every time something is hard'], answer: 0,
    explain: 'You can feel frustrated and still take a helpful next step. Asking for support is a strength.',
    activity: 'Build a feelings toolkit', brief: 'Help three fictional festival visitors choose a helpful response. Different safe responses are welcome.',
    reflection: 'Which tool would you like to remember?', reflections: ['Pause and breathe', 'Ask for support', 'Break a task into smaller steps'],
    home: 'Try a short pause before a familiar task. Keep your reflection private if you prefer.',
  },
  {
    id: 'future-board', title: 'Your Future Board', mentor: 'prena', station: 'Wish lanterns',
    lesson: ['A dream is something you hope for. A goal gives your dream a direction. “Make our festival more welcoming” is a direction you can explore.', 'Start with one manageable action. Try it, notice what happens and adjust your plan. A plan can change when you learn something new.'],
    question: 'Which is a clear first step?', options: ['Create the greatest festival ever', 'Be good at everything', 'Sketch a welcome sign and ask someone to read it'], answer: 2,
    explain: 'Sketching one sign is small enough to try and gives you something to review.',
    activity: 'Light your goal trail', brief: 'Place the four planning lanterns in a useful order, then give your fictional festival goal a name.',
    reflection: 'What makes a first step manageable?', reflections: ['It is small enough to try', 'I know what materials I need', 'I can ask for help'],
    home: 'Draw a future board on paper you already have. Pick one small, safe step.',
  },
  {
    id: 'entrepreneur', title: 'Who Is an Entrepreneur?', mentor: 'lido', station: 'Yatai idea stall',
    lesson: ['Entrepreneurs notice problems and try useful ideas. An idea might save time, make something clearer or help people feel welcome.', 'Before choosing a solution, listen to the people you want to help. Think about materials and responsibilities too. A simple idea can still be valuable.'],
    question: 'What should you investigate before planning a new stall?', options: ['The most expensive decorations', 'What visitors need or find difficult', 'How to copy every other stall'], answer: 1,
    explain: 'Understanding a need helps you make something useful, instead of guessing what people want.',
    activity: 'Open an idea stall', brief: 'Match a visitor group, their need and a useful offer. Your idea will become part of your passport.',
    reflection: 'How would you find out whether an idea helps?', reflections: ['Ask a respectful question', 'Watch a small, safe test', 'Listen to a different suggestion'],
    home: 'Sketch a solution to a familiar inconvenience. No selling or approaching strangers is needed.',
  },
  {
    id: 'hero-senses', title: 'Unlock Your Hero Senses', mentor: 'diva', station: 'Observation bridge',
    lesson: ['Look carefully before deciding why something happened. “Three visitors stopped by the sign” is an observation. “Everyone loves the sign” is a guess.', 'An observation can be a useful clue, but one clue does not tell you what everyone thinks. Respectful questions can help you check your assumptions.'],
    question: 'Which statement is an observation?', options: ['Three visitors asked for water', 'Nobody likes walking', 'Everyone wants a bigger festival'], answer: 0,
    explain: 'You can count the three requests. The other statements guess what everyone thinks.',
    activity: 'Festival detective', brief: 'Sort six clues into “Observed” or “Needs checking”. Read the words carefully: a guess is not a failure, just something to investigate.',
    reflection: 'Which question could help check a guess?', reflections: ['What was difficult to find?', 'What would make this clearer?', 'What did you notice?'],
    home: 'Choose a familiar room. Notice one fact and one assumption without recording personal details.',
  },
  {
    id: 'solutions', title: 'Understanding My Problems & My Solutions', mentor: 'diva', station: 'Water station',
    lesson: ['A useful problem statement explains who has a difficulty and what makes it difficult. “Visitors cannot find the water station” is clearer than “the festival is bad”.', 'More than one solution can help. Compare ideas against the same need and the resources available. Choosing one thing often means leaving another for later.'],
    question: 'What is a fair way to compare solutions?', options: ['Always choose the biggest idea', 'Choose before you know the problem', 'Consider the same need and available resources'], answer: 2,
    explain: 'A useful comparison asks whether each idea helps the problem and fits the resources.',
    activity: 'The four-token wayfinding challenge', brief: 'Choose exactly two improvements to help visitors find water. You have four effort tokens. At least one choice must help with directions.',
    reflection: 'What would you check after making your changes?', reflections: ['Can visitors find the water?', 'Which part is still confusing?', 'Does another visitor need different help?'],
    home: 'With permission, plan a small improvement to a familiar space. Use materials already available.',
  },
  {
    id: 'story', title: 'Tell Your Story', mentor: 'lido', station: 'Story lantern stage',
    lesson: ['A clear idea story introduces someone, explains their problem, shows your idea and describes the difference you hope it will make.', 'Be honest about what you know. Before testing, say “we hope this helps” instead of claiming that everyone loved your idea.'],
    question: 'What can you honestly say before testing a new sign?', options: ['This will definitely help everyone', 'We hope clearer signs help visitors find water', 'Everyone said our sign was perfect'], answer: 1,
    explain: 'A hope is honest when you have not tested it yet. Testing can give you evidence later.',
    activity: 'Arrange the story lanterns', brief: 'Build a short festival story: visitor, problem, idea, hoped-for difference. Pick each next lantern; reset the order whenever you want to try again.',
    reflection: 'Which part tells us why your idea matters?', reflections: ['The visitor’s need', 'The difficulty they face', 'The difference we hope to make'],
    home: 'Tell a fictional story privately or to a trusted person who wants to listen.',
  },
  {
    id: 'prototype', title: 'Take Your Product to the Next Level', mentor: 'prena', station: 'Craft workshop',
    lesson: ['A prototype is an early version that helps you learn. Test it safely, notice what helps and change one feature before comparing again.', 'Feedback is about the idea, not your worth. Four people in a small test cannot speak for everyone, but their experience can suggest a useful next step.'],
    question: 'A visitor finds your instructions confusing. What is useful?', options: ['Ask what was unclear, change one part and test again', 'Blame the visitor', 'Change everything without checking'], answer: 0,
    explain: 'A focused change makes it easier to learn what helped. Feedback is information, not a judgement of you.',
    activity: 'Try, test, improve', brief: 'Run a fictional sign experiment. Choose one change, make a prediction, reveal the result and decide what the evidence supports.',
    reflection: 'What would you test next?', reflections: ['Try with a different small group', 'Check the symbol is understood', 'Change one detail and compare again'],
    home: 'Show a paper drawing to a trusted person with permission. Ask what is clear and what is confusing.',
  },
  {
    id: 'brand', title: 'Design and Brand Your Model', mentor: 'prena', station: 'Design studio',
    lesson: ['A name, symbol, colour and message can help people recognise an idea. A useful brand is not just decoration: it tells people what something is for.', 'Do not rely on colour alone. Use readable words and a recognisable symbol so your sign still makes sense without its colours.'],
    question: 'Which sign is easiest to understand?', options: ['Three colours with no labels', 'Tiny decorative writing', 'A water symbol and the words “Water station”'], answer: 2,
    explain: 'Words and a symbol communicate the purpose without requiring someone to recognise a colour.',
    activity: 'Your festival brand studio', brief: 'Create a fictional name, choose a symbol and colour, and add a clear purpose label. Check your live sign in colour and grayscale.',
    reflection: 'What should a visitor understand first?', reflections: ['What this place offers', 'Where to go next', 'How this idea helps'],
    home: 'Design a fictional logo on paper. Do not include your address, school or contact information.',
  },
  {
    id: 'money', title: 'Money Quest', mentor: 'prena', station: 'Bento budget counter',
    lesson: ['A budget is a plan for limited money. Leave room for things you need and a reserve for surprises. You cannot spend the same coin twice.', 'Revenue is money received from sales. Profit is what remains after costs and other expenses. Selling for four coins with a two-coin product cost leaves two coins before other expenses.'],
    question: 'You receive 12 coins from sales and pay 6 coins in costs. What remains before other expenses?', options: ['12 coins', '6 coins', '18 coins'], answer: 1,
    explain: '12 − 6 = 6. Revenue and profit are different. Other expenses would reduce what remains.',
    activity: 'Plan a twelve-coin market day', brief: 'These are pretend activity coins, not your game wallet. Buy six coins of supplies, keep at least three in reserve, and choose how much to spend on a sign.',
    reflection: 'What can a reserve help you do?', reflections: ['Prepare for an unexpected cost', 'Keep a choice available for later', 'Avoid spending every coin at once'],
    home: 'Plan an imaginary picnic with ten paper tokens. Do not use real money.',
  },
  {
    id: 'pitch', title: 'Make It Powerful', mentor: 'lido', station: 'Festival pitch stage',
    lesson: ['A useful pitch explains a need, your idea and a next step. A clear request helps your listener know how they can respond.', 'Confidence can mean speaking, typing, pointing to a picture or asking for support. You do not need a loud voice or a recording to share an idea.'],
    question: 'What belongs in a helpful pitch?', options: ['A need, an idea and a clear ask', 'Only praise for yourself', 'Promises you cannot support'], answer: 0,
    explain: 'A listener needs to understand the problem, the proposed help and what you are asking for.',
    activity: 'Rehearse your three-part pitch', brief: 'Build a fictional pitch, then answer a listener’s question about testing. Written rehearsal counts: no microphone is needed.',
    reflection: 'What would make your pitch clearer?', reflections: ['Explain the need in simple words', 'Show a small example', 'Ask for one specific next step'],
    home: 'Rehearse privately or with a trusted, willing listener. No public sharing is required.',
  },
  {
    id: 'make-real', title: 'Make It Real', mentor: 'diva', station: 'Hero festival pavilion',
    lesson: ['Bring an idea to life with a clear goal, manageable steps and available materials. Agree on responsibilities when someone is helping you.', 'After a small trial, look back. What helped? What would you change? Other people may have different useful ideas. Finishing a first version is a beginning, not the end of learning.'],
    question: 'Which plan is ready for a small, safe trial?', options: ['A large idea with no resources listed', 'A plan that leaves everything to someone else', 'A goal, three steps, materials and a review question'], answer: 2,
    explain: 'A small plan makes the work and the learning visible. Check permission and safety before any real-world action.',
    activity: 'Make your festival project board', brief: 'Turn your fictional idea into a three-step plan. Use materials already available and choose what you will review. Your completed passport celebrates effort, not a score.',
    reflection: 'What will you carry into your next idea?', reflections: ['Try a small step and learn', 'Listen to other people’s ideas', 'Use my strengths and ask for support'],
    home: 'With a trusted adult’s permission, choose one no-cost, safe step. No tools, heat, travel, strangers or public posting are needed.',
  },
];
