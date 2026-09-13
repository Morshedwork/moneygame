import { describe, expect, it } from 'vitest';
import { applyHeroCommand, heroCompleted, heroUnits, heroUnlocked, validateHeroActivity, HeroProgress } from '../../packages/hero-lab';
import { applyCommand, createPlayer, Player, publicPlayer } from '../../packages/game-rules';
import { roomCommand, roomPublic, Room } from '../../packages/game-rules/rooms';
import { heroExamples } from '../fixtures/hero-lab';
let request = 0;
const cmd = (unitId = 'super-you', action: unknown = 'lesson', data: Record<string, unknown> = {}) => ({ id: `hero-request-${++request}`, type: 'hero-lab', unitId, action, ...data });
function complete(p: Player, index: number) {
  const u = heroUnits[index];
  p = applyCommand(p, cmd(u.id, 'lesson', { answer: u.answer })).player;
  p = applyCommand(p, cmd(u.id, 'activity', { artifact: heroExamples[u.id] })).player;
  return applyCommand(p, cmd(u.id, 'reflection', { choice: index % 3 })).player;
}
describe('Hero Lab curriculum and progression', () => {
  it('contains twelve unique, complete units with the four reference mentors', () => {
    expect(heroUnits).toHaveLength(12); expect(new Set(heroUnits.map(u => u.id)).size).toBe(12);
    expect(new Set(heroUnits.map(u => u.mentor)).size).toBe(4);
    for (const unit of heroUnits) { expect(unit.lesson).toHaveLength(2); expect(unit.options[unit.answer]).toBeTruthy(); expect(unit.reflections).toHaveLength(3); }
  });
  it('completes all twelve units and keeps finance, rewards and game state separate', () => {
    let p = createPlayer('student', 'Explorer'); const before = { lesson: p.lesson, gate: p.gate, game: p.game, rewarded: p.rewarded };
    for (let i = 0; i < 12; i++) { expect(heroUnlocked(p.heroLab, i)).toBe(true); p = complete(p, i); expect(heroCompleted(p.heroLab)).toBe(i + 1); }
    expect({ lesson: p.lesson, gate: p.gate, game: p.game, rewarded: p.rewarded }).toEqual(before);
    expect(JSON.stringify(p.heroLab).length).toBeLessThan(6000);
    expect(publicPlayer(p).heroLab).toEqual(p.heroLab);
  });
  it('backfills an older profile without a migration or losing progress', () => {
    const p = createPlayer('legacy', 'Explorer'); delete p.heroLab; p.lesson = 3;
    const result = complete(p, 0); expect(heroCompleted(result.heroLab)).toBe(1); expect(result.lesson).toBe(3); expect(p.heroLab).toBeUndefined();
  });
  it('allows a wrong lesson answer to retry without advancing', () => {
    const p = createPlayer('student', 'Explorer');
    const wrong = applyCommand(p, cmd('super-you', 'lesson', { answer: 0 }));
    expect(wrong.feedback?.correct).toBe(false); expect(heroCompleted(wrong.player.heroLab)).toBe(0);
    expect(wrong.player.heroLab?.units['super-you']).toBeUndefined();
    expect(complete(wrong.player, 0).heroLab?.units['super-you'].reflection).toBe(0);
  });
  it('enforces unit order and lesson → activity → reflection', () => {
    const p = createPlayer('student', 'Explorer');
    expect(() => applyCommand(p, cmd('money', 'lesson', { answer: 1 }))).toThrow('previous unit');
    expect(() => applyCommand(p, cmd('super-you', 'activity', { artifact: heroExamples['super-you'] }))).toThrow('lesson');
    const learned = applyCommand(p, cmd('super-you', 'lesson', { answer: 1 })).player;
    expect(() => applyCommand(learned, cmd('super-you', 'reflection', { choice: 0 }))).toThrow('activity');
    expect(() => applyCommand(p, cmd('invalid'))).toThrow('Choose a Hero Lab unit');
  });
  it.each([['lesson'], { toString: () => 'reflection' }, null, 1, true])('rejects malformed action %j instead of awarding a reflection', action => {
    const p = createPlayer('student', 'Explorer');
    p.heroLab = { version: 1, units: { 'super-you': { lesson: true, artifact: heroExamples['super-you'], reflection: null } } };
    expect(() => applyCommand(p, cmd('super-you', action, { choice: 1 }))).toThrow('valid learning step');
  });
  it('is idempotent for duplicate IDs and fresh-ID replays without replacing keepsakes', () => {
    const p = complete(createPlayer('student', 'Explorer'), 0), c = cmd('super-you', 'reflection', { choice: 2 });
    const replay = applyCommand(p, c).player;
    expect(replay.heroLab).toEqual(p.heroLab); expect(heroCompleted(replay.heroLab)).toBe(1);
    expect(applyCommand(replay, c).player).toBe(replay);
    expect(applyCommand(replay, cmd('super-you', 'activity', { artifact: { strengths: [1, 2, 3], job: 2 } })).player.heroLab).toEqual(p.heroLab);
  });
  it.each(['parent', 'admin'] as const)('rejects %s play and paused students', role => {
    expect(() => applyCommand(createPlayer('adult', 'Adult', role), cmd('super-you', 'lesson', { answer: 1 }))).toThrow('Only student');
    const p = createPlayer('student', 'Explorer'); p.paused = true;
    expect(() => applyCommand(p, cmd('super-you', 'lesson', { answer: 1 }))).toThrow('paused');
  });
  it('does not advance another player’s room turn or expose journal artifacts in room views', () => {
    const room: Room = { code: 'HERO01', host: 'a', members: ['a', 'b'], ready: ['a', 'b'], started: true, turn: 0, round: 0, reactions: [] };
    const roster = [createPlayer('a', 'Aki'), createPlayer('b', 'Yuki')];
    const result = roomCommand(room, roster, 'b', cmd('super-you', 'lesson', { answer: 1 }), 1);
    expect(result.room).toEqual(room); expect(result.players[0]).toEqual(roster[0]);
    expect(result.players[1].heroLab?.units['super-you'].lesson).toBe(true);
    expect(JSON.stringify(roomPublic(result.room, result.players))).not.toContain('heroLab');
  });
});
describe('Hero Lab activity validation', () => {
  it.each(heroUnits.map(u => [u.id]))('accepts a valid %s artifact with only trusted fields', id => {
    const result = validateHeroActivity(id, { ...heroExamples[id], admin: true, wallet: 9999, injected: '<script>' });
    expect(result).toEqual(heroExamples[id]); expect(result).not.toHaveProperty('admin');
  });
  it.each([
    ['super-you', { strengths: [1, 1, 2], job: 0 }], ['power-house', { responses: [0, 4, 2] }],
    ['future-board', { order: [1, 0, 2, 3], goal: 'Our sign' }], ['entrepreneur', { audience: 0, need: 1, offer: 2 }],
    ['hero-senses', { clues: [1, 1, 0, 1, 0, 1] }], ['solutions', { choices: [0, 2] }],
    ['story', { order: [0, 1, 3, 2] }], ['prototype', { change: 0, prediction: 1, tested: 0, evidence: 1 }],
    ['prototype', { change: 0, prediction: 1, tested: 1, evidence: 0 }], ['brand', { name: 'Fine', purpose: 'Clear purpose', color: 99, symbol: 0 }],
    ['money', { supplies: 6, sign: 4, reserve: 2, profit: 2 }], ['money', { supplies: 6, sign: 2, reserve: 4, profit: 6 }],
    ['pitch', { ...heroExamples.pitch, response: 2 }], ['make-real', { ...heroExamples['make-real'], materials: '' }],
  ])('rejects an incomplete or unsupported %s answer', (id, a) => expect(() => validateHeroActivity(String(id), a)).toThrow());
  it('accepts alternative valid choices, predictions and budgets', () => {
    expect(validateHeroActivity('solutions', { choices: [0, 1] })).toEqual({ choices: [0, 1] });
    for (let sign = 0; sign <= 3; sign++) expect(validateHeroActivity('money', { supplies: 6, sign, reserve: 6 - sign, profit: 6 - sign })).toBeTruthy();
    for (let prediction = 0; prediction < 3; prediction++) expect(validateHeroActivity('prototype', { change: 1, prediction, tested: 1, evidence: 1 })).toBeTruthy();
  });
  it.each(['x', 'x'.repeat(121), '<b>sign</b>', 'name@example.com', 'https://example.com', 'Line\nTwo'])('rejects invalid text shape %j', value => {
    expect(() => validateHeroActivity('make-real', { ...heroExamples['make-real'], goal: value })).toThrow();
  });
  it('does not mutate the existing state after a failed activity submission', () => {
    const original: HeroProgress = { version: 1, units: { money: { lesson: true, artifact: null, reflection: null } } };
    for (const unit of heroUnits.slice(0, 9)) original.units[unit.id] = { lesson: true, artifact: heroExamples[unit.id], reflection: 0 };
    const before = structuredClone(original);
    expect(() => applyHeroCommand(original, { unitId: 'money', action: 'activity', artifact: {} })).toThrow();
    expect(original).toEqual(before);
  });
});
