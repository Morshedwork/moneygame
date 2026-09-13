import type { HeroArtifact } from '../../packages/hero-lab';
export const heroExamples: Record<string, HeroArtifact> = {
  'super-you': { strengths: [0, 1, 4], job: 0 },
  'power-house': { responses: [0, 1, 3] },
  'future-board': { order: [0, 1, 2, 3], goal: 'Make the festival welcoming' },
  entrepreneur: { audience: 1, need: 1, offer: 1 },
  'hero-senses': { clues: [0, 1, 0, 1, 0, 1] },
  solutions: { choices: [0, 3] },
  story: { order: [0, 1, 2, 3] },
  prototype: { change: 0, prediction: 0, tested: 1, evidence: 1 },
  brand: { name: 'Water Lantern', purpose: 'Water station this way', color: 1, symbol: 0 },
  money: { supplies: 6, sign: 2, reserve: 4, profit: 4 },
  pitch: { need: 'Visitors need to find water', idea: 'A clear sign with a water symbol', ask: 'Please try our sign and share feedback', response: 0 },
  'make-real': { goal: 'Help visitors find water', first: 'Sketch a clear sign', next: 'Ask a trusted adult for feedback', last: 'Improve the label and test again', materials: 'Paper and coloured pencils', helper: 0, review: 0 },
};
