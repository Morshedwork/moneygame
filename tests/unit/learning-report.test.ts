import { describe, expect, it } from 'vitest';
import { accountReport, cohortStats, missionReport, reportCsv, reportHtml } from '../../packages/learning-report';
import { applyCommand, createPlayer, publicPlayer } from '../../packages/game-rules';
import { lessons } from '../../packages/curriculum';
import { heroUnits } from '../../packages/hero-lab';
import { applyAction, createMission } from '../../packages/money-quest/engine';
import { lessonBeats } from '../../packages/money-quest/content';

describe('learning evidence reports', () => {
  it('shows empty evidence as unknown, not zero ability or perfect mastery', () => {
    const report = accountReport(createPlayer('test', 'Explorer'), true);
    expect(report.checks).toEqual({ correct: 0, total: 0, firstCorrect: 0, firstTotal: 0 });
    expect(report.metrics[1].value).toBe('Not yet measured');
    expect(report.metrics[0].value).toBe('0 / 6');
    expect(report.sections[1].rows).toHaveLength(12);
    expect(report.sections[2].rows).toEqual([]);
    expect(report.scope).toContain('not saved');
  });
  it('separates retries, first tries and completion from actual reducer events', () => {
    let p = createPlayer('test', 'Explorer');
    const wrong = { id: 'answer-wrong-1', type: 'lesson', index: 0, answer: 0 };
    p = applyCommand(p, wrong).player;
    p = applyCommand(p, wrong).player; // Replay does not double-count.
    p = applyCommand(p, { id: 'answer-correct-1', type: 'lesson', index: 0, answer: lessons[0].answer }).player;
    const report = accountReport(publicPlayer(p));
    expect(report.checks).toEqual({ correct: 1, total: 2, firstCorrect: 0, firstTotal: 1 });
    expect(report.metrics[1].value).toBe('50%');
    expect(report.sections[0].rows[0]).toEqual(['PRICE', 'Completed', '2', 'Used feedback', 'Correct after practice']);
    expect(report.nextSteps[0]).toContain('fresh example');
  });
  it('does not fabricate legacy history, Hero Lab accuracy, or timestamps', () => {
    const p = createPlayer('legacy', 'Explorer'); p.lesson = 6; p.gate = 3;
    p.heroLab = { version: 1, units: { 'super-you': { lesson: true, artifact: { strengths: [0, 1, 2], job: 1 }, reflection: 0 } } };
    const r = accountReport(p);
    expect(r.metrics[0].value).toBe('6 / 6');
    expect(r.metrics[1].value).toBe('Not yet measured');
    expect(r.metrics[3].value).toBe('1 / 12');
    expect(r.sections[1].rows[0][5]).toBe(heroUnits[0].reflections[0]);
    expect(r.sections[0].rows[0][4]).toContain('history unavailable');
    expect(r.sections[2].rows).toHaveLength(0);
  });
  it('groups dated finance evidence by UTC day, ignoring invalid or future records', () => {
    const p = createPlayer('test', 'Explorer');
    p.attempts = [
      { kind: 'lesson', index: 0, correct: false, at: Date.parse('2026-09-09T23:59Z') },
      { kind: 'lesson', index: 0, correct: true, at: Date.parse('2026-09-10T00:01Z') },
      { kind: 'lesson', index: 9, correct: true, at: 1 },
      { kind: 'unknown', index: 0, correct: true, at: 1 },
      { kind: 'gate', index: 0, correct: true, at: NaN },
      { kind: 'gate', index: 0, correct: true, at: Date.parse('2027-01-01') },
    ];
    const r = accountReport(p, false, Date.parse('2026-09-13'));
    expect(r.checks.total).toBe(2);
    expect(r.sections[2].rows).toEqual([['2026-09-09', '1', '0', '0%'], ['2026-09-10', '1', '1', '100%']]);
  });
  it('computes cohort accuracy using total attempts, excluding unmeasured denominators', () => {
    const a = createPlayer('a', 'A'), b = createPlayer('b', 'B');
    a.attempts = [{ kind: 'lesson', index: 0, correct: true, at: 1 }];
    b.attempts = Array.from({ length: 9 }, () => ({ kind: 'lesson', index: 0, correct: false, at: 1 }));
    expect(cohortStats([accountReport(a), accountReport(b), accountReport(createPlayer('c', 'C'))])).toEqual({ learners: 3, measured: 2, correct: 1, total: 10, accuracy: '10%' });
  });
  it('reports a completed Money Quest lesson honestly when an answer needed feedback', () => {
    let g = createMission(9, 2); let seq = 0;
    const act = (type: string, data = {}) => { g = applyAction(g, { id: `report-command-${++seq}`, type, ...data }); };
    while (g.phase === 'lesson') {
      const beat = lessonBeats(1, g.lesson.depth)[g.lesson.step];
      act('answer', { answer: (beat.answer + 1) % beat.choices.length });
      act('lesson-next', { price: 6, goal: 'Balance customers and profit', reason: 'I want to understand my costs.', ready: true });
    }
    // Completion occurs before the optional UI deposit confirmation.
    const r = missionReport(g);
    expect(r.metrics[0].value).toBe('1 / 2');
    expect(r.checks.correct).toBe(0); expect(r.checks.total).toBeGreaterThan(0);
    expect(r.metrics[1].value).toBe('0%'); expect(r.scope).toContain('not linked');
    expect(r.sections[0].rows[1][4]).toBe('Not measured');
    expect(r.nextSteps.length).toBeGreaterThan(0);
  });
  it('includes local decisions, support use and learner reflections without grading them', () => {
    const g = createMission(3, 4);
    g.events.push({ seq: 2, quarter: 1, turn: 3, space: 8, type: 'decision', data: { pending: 'bank', reason: 'I chose to save for tomorrow.' } });
    g.reflections.push({ quarter: 1, changed: 'I noticed uncertain demand.', next: 'I will keep a reserve.', wallet: 0, savings: 5, liability: 0 });
    g.settlement = 'I will compare revenue with all costs.';
    const r = missionReport(g);
    expect(r.metrics[2].value).toBe('1');
    expect(r.sections[2].rows[0][3]).toBe('I chose to save for tomorrow.');
    expect(r.sections[3].rows).toHaveLength(2);
    const before = r.metrics;
    g.wallet = 100000; g.savings = 99999;
    expect(missionReport(g).metrics).toEqual(before);
  });
  it('escapes report HTML and spreadsheet formula injection, exporting the same evidence', () => {
    const p = createPlayer('test', '=HYPERLINK("bad")<script>alert(1)</script>');
    p.parents = ['parent-private-id'];
    const r = accountReport(p); const html = reportHtml(r), csv = reportCsv(r);
    expect(html).not.toContain('<script>'); expect(html).toContain('&lt;script&gt;');
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain('Sources and limitations');
    expect(csv).toContain(r.metrics[0].value); expect(html).toContain(r.metrics[0].value);
    expect(html).not.toContain('parent-private-id');
    expect(csv).not.toContain('parent-private-id');
  });
});
