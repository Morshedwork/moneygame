import { heroUnits, strengths, jobs, goalSteps, storySteps, observations, improvements, audiences, brandColors, brandSymbols } from './content';
export * from './content';
export type HeroArtifact = Record<string, string | number | number[]>;
export type HeroEntry = { lesson: boolean; artifact: HeroArtifact | null; reflection: number | null };
export type HeroProgress = { version: 1; units: Record<string, HeroEntry> };
export const initialHeroProgress = (): HeroProgress => ({ version: 1, units: {} });
export const heroCompleted = (p?: HeroProgress) => heroUnits.filter(u => p?.units[u.id]?.reflection != null).length;
export function heroUnlocked(p: HeroProgress | undefined, index: number) {
  return index === 0 || heroUnits.slice(0, index).every(u => p?.units[u.id]?.reflection != null);
}
function integer(v: unknown, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) throw new Error(`Choose a whole number from ${min} to ${max}.`);
  return v;
}
function words(v: unknown, label: string, min = 4, max = 120) {
  if (typeof v !== 'string' || v.trim().length < min || v.length > max) throw new Error(`${label}: use ${min}–${max} characters.`);
  if (/[<>\x00-\x1f]|https?:|www\.|@/i.test(v)) throw new Error(`${label}: use a fictional idea, not links or contact information.`);
  return v.trim();
}
function picks(v: unknown, count: number, max: number, unique = false) {
  if (!Array.isArray(v) || v.length !== count) throw new Error(`Make all ${count} choices.`);
  const a = v.map(n => integer(n, 0, max));
  if (unique && new Set(a).size !== count) throw new Error('Choose each item only once.');
  return a;
}
/** Only validated, bounded fields are persisted. Unknown client fields are discarded. */
export function validateHeroActivity(id: string, value: unknown): HeroArtifact {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Complete the activity first.');
  const a = value as Record<string, unknown>;
  switch (id) {
    case 'super-you': return { strengths: picks(a.strengths, 3, strengths.length - 1, true), job: integer(a.job, 0, jobs.length - 1) };
    case 'power-house': {
      const responses = picks(a.responses, 3, 4);
      if (responses.includes(4)) throw new Error('Blaming does not help solve the problem. Try a pause, support, a break or a smaller step.');
      return { responses };
    }
    case 'future-board': case 'story': {
      const steps = id === 'story' ? storySteps : goalSteps;
      const order = picks(a.order, steps.length, steps.length - 1, true);
      if (order.some((n, i) => n !== i)) throw new Error(id === 'story' ? 'Begin with the visitor, then the problem, the idea and the hoped-for difference.' : 'Choose a goal, plan a small step, try it, then review and adjust.');
      return id === 'story' ? { order } : { order, goal: words(a.goal, 'Festival goal') };
    }
    case 'entrepreneur': {
      const audience = integer(a.audience, 0, audiences.length - 1), need = integer(a.need, 0, 2), offer = integer(a.offer, 0, 2);
      if (audience !== need || need !== offer) throw new Error('Check the match: rest needs a rest corner, water needs a water sign, and newcomers need a welcome map.');
      return { audience, need, offer };
    }
    case 'hero-senses': {
      const clues = picks(a.clues, observations.length, 1);
      if (clues.some((v, i) => (v === 0) !== observations[i].observed)) throw new Error('Check each clue. Counted actions and visible details are observations; “everyone”, “nobody” and guessed feelings need checking.');
      return { clues };
    }
    case 'solutions': {
      const choices = picks(a.choices, 2, improvements.length - 1, true);
      if (choices.reduce((sum, i) => sum + improvements[i].cost, 0) > 4) throw new Error('That plan uses more than four effort tokens. Try a smaller combination.');
      if (!choices.some(i => improvements[i].useful)) throw new Error('Include a way to help visitors find the water station.');
      return { choices };
    }
    case 'prototype': {
      const change = integer(a.change, 0, 2), prediction = integer(a.prediction, 0, 2);
      if (a.tested !== 1) throw new Error('Run your fictional test before interpreting its result.');
      if (a.evidence !== 1) throw new Error('The test suggests a result for this small group, not proof about everyone. Try again.');
      return { change, prediction, tested: 1, evidence: 1 };
    }
    case 'brand': return { name: words(a.name, 'Fictional brand name', 2, 32), purpose: words(a.purpose, 'Purpose label', 4, 60), color: integer(a.color, 0, brandColors.length - 1), symbol: integer(a.symbol, 0, brandSymbols.length - 1) };
    case 'money': {
      const supplies = integer(a.supplies, 0, 12), sign = integer(a.sign, 0, 12), reserve = integer(a.reserve, 0, 12);
      if (supplies !== 6 || reserve < 3 || supplies + sign + reserve !== 12) throw new Error('Allocate all twelve coins: six for supplies, at least three in reserve, and the rest for your sign or reserve.');
      if (a.profit !== 6 - sign) throw new Error(`Three sales bring in 12 coins. Subtract 6 for supplies and ${sign} for your sign. Your reserve is not sales revenue.`);
      return { supplies, sign, reserve, profit: 6 - sign };
    }
    case 'pitch': {
      const need = words(a.need, 'Visitor need'), idea = words(a.idea, 'Your idea'), ask = words(a.ask, 'Your next-step request');
      if (a.response !== 0) throw new Error('Offer a small test and listen to feedback instead of promising perfection or ignoring the question.');
      return { need, idea, ask, response: 0 };
    }
    case 'make-real': return {
      goal: words(a.goal, 'Project goal'), first: words(a.first, 'First step'), next: words(a.next, 'Next step'), last: words(a.last, 'Last step'), materials: words(a.materials, 'Available materials'), helper: integer(a.helper, 0, 2), review: integer(a.review, 0, 2),
    };
    default: throw new Error('Choose a Hero Lab unit.');
  }
}
export function applyHeroCommand(original: HeroProgress | undefined, c: Record<string, unknown>) {
  const index = heroUnits.findIndex(u => u.id === c.unitId);
  if (index < 0) throw new Error('Choose a Hero Lab unit.');
  if (!heroUnlocked(original, index)) throw new Error('Complete the previous unit’s lesson, activity and reflection first.');
  if (typeof c.action !== 'string' || !['lesson', 'activity', 'reflection'].includes(c.action)) throw new Error('Choose a valid learning step.');
  const progress = structuredClone(original ?? initialHeroProgress());
  const unit = heroUnits[index];
  const entry = progress.units[unit.id] ?? { lesson: false, artifact: null, reflection: null };
  // Completion is an upsert, never a repeatable increment, even with fresh request IDs.
  if (entry.reflection !== null) return { progress, feedback: { correct: true, text: 'Your stamp is already in your passport. Revisit the lesson whenever you like.' } };
  let text = '';
  if (c.action === 'lesson') {
    const answer = integer(c.answer, 0, unit.options.length - 1);
    if (answer !== unit.answer) return { progress, feedback: { correct: false, text: unit.explain + ' You can try again; there is no penalty.' } };
    entry.lesson = true; text = 'Lesson understood. Now try it in your festival activity!';
  } else if (c.action === 'activity') {
    if (!entry.lesson) throw new Error('Finish the short lesson check first.');
    entry.artifact = validateHeroActivity(unit.id, c.artifact);
    text = 'Your activity is ready. Reflect on one next step to earn your stamp.';
  } else {
    if (!entry.lesson || !entry.artifact) throw new Error('Finish the lesson and activity before reflecting.');
    entry.reflection = integer(c.choice, 0, unit.reflections.length - 1);
    text = 'A new stamp for your passport. Every small step counts!';
  }
  progress.units[unit.id] = entry;
  return { progress, feedback: { correct: true, text } };
}
