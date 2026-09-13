import { gate, lessons } from '../curriculum';
import type { publicPlayer } from '../game-rules';
import { heroPhases, heroUnits } from '../hero-lab';
import type { Mission } from '../money-quest/engine';
import { lessonBeats, quarterNames } from '../money-quest/content';

export type ReportSection = { title: string; note: string; columns: string[]; rows: string[][] };
export type LearningReport = {
  version: 1; title: string; learner: string; scope: string; generatedAt: number;
  summary: string; metrics: { label: string; value: string; note: string }[];
  nextSteps: string[]; sections: ReportSection[]; coverage: string[];
  checks: { correct: number; total: number; firstCorrect: number; firstTotal: number };
};
type ReportPlayer = Pick<ReturnType<typeof publicPlayer>, 'name' | 'lesson' | 'gate' | 'attempts' | 'heroLab' | 'game'>;
export const percent = (correct: number, total: number) => total ? `${Math.round(correct / total * 100)}%` : 'Not yet measured';
const count = (n: number, total: number) => `${n} / ${total}`;
const status = (done: boolean) => done ? 'Completed' : 'Not yet';
const utc = (at: number) => new Date(at).toISOString().slice(0, 10);
export function accountReport(p: ReportPlayer, practice = false, now = Date.now()): LearningReport {
  const attempts = (p.attempts || []).filter(a => typeof a.correct === 'boolean' && Number.isFinite(a.at) && a.at > 0 && a.at <= now &&
    Number.isInteger(a.index) && a.index >= 0 && a.index < (a.kind === 'lesson' ? lessons.length : a.kind === 'gate' ? gate.length : 0));
  const topics = [...lessons.map((l, index) => ({ title: l.concept, index, kind: 'lesson', done: index < p.lesson, tip: l.example })),
    ...gate.map((g, index) => ({ title: `Readiness check ${index + 1}`, index, kind: 'gate', done: index < p.gate, tip: g.explain }))];
  const checks = { correct: attempts.filter(a => a.correct).length, total: attempts.length, firstCorrect: 0, firstTotal: 0 };
  const practiceTopics: string[] = [];
  const topicRows = topics.map(t => {
    const history = attempts.filter(a => a.kind === t.kind && a.index === t.index).sort((a, b) => a.at - b.at);
    const last = history.at(-1);
    if (history.length) { checks.firstTotal++; if (history[0].correct) checks.firstCorrect++; }
    const result = last ? last.correct ? history.some(a => !a.correct) ? 'Correct after practice' : 'Correct check' : 'Try with feedback' : t.done ? 'Complete · answer history unavailable' : 'Not started';
    if (last && !last.correct) practiceTopics.unshift(`${t.title}: ${t.tip}`);
    else if (history.some(a => !a.correct)) practiceTopics.push(`${t.title}: Try a fresh example to check what you remember. ${t.tip}`);
    return [t.title, status(t.done), String(history.length), history.length ? status(history[0].correct).replace('Completed', 'Correct').replace('Not yet', 'Used feedback') : 'Not recorded', result];
  });
  const entries = heroUnits.map(u => p.heroLab?.units[u.id]);
  const heroDone = entries.filter(e => e?.reflection != null).length;
  const heroActivities = entries.filter(e => e?.artifact != null).length;
  const heroRows = heroUnits.map((u, i) => {
    const e = entries[i];
    return [String(i + 1), u.title, heroPhases[Math.floor(i / 4)], status(e?.lesson === true), status(e?.artifact != null), e?.reflection != null ? u.reflections[e.reflection] ?? 'Reflection saved' : 'Not yet'];
  });
  const days = new Map<string, { correct: number; total: number }>();
  for (const a of attempts) { const day = utc(a.at), d = days.get(day) || { correct: 0, total: 0 }; d.total++; if (a.correct) d.correct++; days.set(day, d); }
  const ledger = p.game?.ledger || [];
  const applied = [
    ['Revenue and costs', ['sale'], 'Explain the difference between what customers paid and what the business kept.'],
    ['Saving and planning', ['savings'], 'Explain why moving coins to savings does not create new income.'],
    ['Opportunity and risk', ['advertising'], 'Explain why more visitors do not guarantee more sales.'],
    ['Community choices', ['festival'], 'Explain how a contribution supports a shared goal.'],
    ['Borrowing and obligations', ['advance', 'repayment'], 'Explain why borrowed coins must be repaid.'],
  ] as const;
  const g = p.game;
  const nextHero = heroUnits.find((_, i) => entries[i]?.reflection == null);
  const nextSteps = [...practiceTopics.slice(0, 3)];
  if (!nextSteps.length) nextSteps.push(p.lesson < lessons.length ? `Next lesson: ${lessons[p.lesson].title}.` : p.gate < gate.length ? 'Try the next readiness check, using your own explanation.' : 'Try a new price-and-cost example without looking at the answer. Explain your reasoning.');
  if (nextHero) nextSteps.push(`Hero Lab: ${nextHero.title}. ${nextHero.home}`);
  if (g && !g.reflection) nextSteps.push('At the end of your board lap, explain one decision, its result, and what you would change.');
  return {
    version: 1, title: 'My learning journey', learner: p.name, scope: practice ? 'Current practice session · not saved to an account' : 'Saved learner record · all recorded progress', generatedAt: now,
    summary: `${p.lesson} of ${lessons.length} finance lessons and ${heroDone} of ${heroUnits.length} Hero Lab units completed. ${checks.total ? `${checks.correct} of ${checks.total} recorded finance answers were correct.` : 'No finance answers recorded yet.'} Completion shows participation; it is not a mastery grade.`,
    checks,
    metrics: [
      { label: 'Finance lessons', value: count(p.lesson, lessons.length), note: `${p.gate} of ${gate.length} readiness checks completed` },
      { label: 'Correct finance answers', value: percent(checks.correct, checks.total), note: `${checks.correct} correct / ${checks.total} attempts · includes retries` },
      { label: 'First-try understanding', value: percent(checks.firstCorrect, checks.firstTotal), note: `${checks.firstCorrect} correct / ${checks.firstTotal} distinct checks attempted` },
      { label: 'Hero Lab learning stamps', value: count(heroDone, heroUnits.length), note: `${heroActivities} activities submitted · reflections are not graded` },
    ], nextSteps,
    sections: [
      { title: 'Finance understanding', note: 'A correct check is evidence for this question, not proof of lasting mastery. Using feedback is part of learning.', columns: ['Topic', 'Progress', 'Attempts', 'First try', 'Latest evidence'], rows: topicRows },
      { title: 'Hero Lab portfolio', note: 'Each unit includes a lesson, an activity and a personal reflection. The current save stores completion, not wrong-answer counts or completion dates.', columns: ['Unit', 'Learning trail', 'Phase', 'Lesson check', 'Activity submitted', 'Chosen reflection'], rows: heroRows },
      { title: 'Learning over time', note: 'Finance answer activity by UTC calendar day. Missing days mean no recorded finance answers, not no learning. Daily percentages are not comparable tests.', columns: ['Day (UTC)', 'Answers', 'Correct', 'Answer accuracy'], rows: [...days].sort(([a], [b]) => a.localeCompare(b)).map(([day, d]) => [day, String(d.total), String(d.correct), percent(d.correct, d.total)]) },
      { title: 'Applying ideas in the board game', note: 'Recorded encounters, not a score. Random events, coins and profit do not measure learning.', columns: ['Skill practised', 'Recorded encounters', 'A question to discuss'], rows: applied.map(([skill, categories, prompt]) => [skill, String(ledger.filter(e => (categories as readonly string[]).includes(e.category)).length), prompt]) },
      { title: 'Reflection and next attempt', note: 'Learner voice, not an assessment of confidence, character or ability.', columns: ['Evidence', 'Learner response'], rows: [['Business goal', g?.goal || 'Not recorded'], ['Board reflection', g?.reflection || 'Not recorded'], ['Self-reported confidence', g?.reflection ? `${g.reflectionRating} / 3 · self-report, not a grade` : 'Not recorded']] },
    ],
    coverage: [
      'Sources: the existing learner profile, finance answer history, Hero Lab entries and current board-game ledger. No new tracking or behavioural advertising.',
      'This is an all-time snapshot of the available record, not an archive of deleted or restarted games. An older completed lesson without answer history stays unmeasured.',
      'Hero Lab answer accuracy, time spent and long-term retention are not recorded and are not estimated.',
      'Village stamps last only for the app session. The separate Money Quest is browser-local practice; neither is added to a saved child record. Open their local reports separately.',
      'Reports are private to the learner, linked parents and approved administrators. Downloaded copies leave app access controls; share them only with a trusted adult.',
    ],
  };
}

export function missionReport(g: Mission, now = Date.now()): LearningReport {
  const responses = g.events.filter(e => e.type === 'lesson-response' && typeof e.data.correct === 'boolean');
  const completed = new Set(g.events.filter(e => e.type === 'lesson-completed').map(e => e.quarter));
  const reasonEvents = g.events.filter(e => ['decision', 'price-response', 'boundary-choice', 'recovery-choice'].includes(e.type));
  const correct = responses.filter(e => e.data.correct === true).length;
  const nextSteps = responses.filter(e => !e.data.correct).map(e => {
    const depth = e.data.depth === 'deeper' || e.data.depth === 'review' ? e.data.depth : 'core';
    const beat = lessonBeats(e.quarter, depth)[Number(e.data.step)];
    return beat ? `Q${e.quarter} · ${beat.title}: ${beat.explanation}` : `Revisit the Q${e.quarter} lesson.`;
  });
  if (!nextSteps.length) nextSteps.push('Try a new example and explain the money story before checking the answer.');
  return { version: 1, title: 'Money Quest learning report', learner: g.name || 'Local explorer', scope: `${g.quarters}-quarter Money Quest · this browser only · not linked to a child account`, generatedAt: now,
    summary: `${completed.size} of ${g.quarters} quarter lessons completed, ${reasonEvents.length} reasoned decisions recorded and ${g.reflections.length} quarter reflections. A completed lesson can include answers that need more practice.`,
    checks: { correct, total: responses.length, firstCorrect: correct, firstTotal: responses.length },
    metrics: [
      { label: 'Quarter lessons', value: count(completed.size, g.quarters), note: 'Completed learning sequences, not coins earned' },
      { label: 'Correct lesson answers', value: percent(correct, responses.length), note: `${correct} correct / ${responses.length} recorded answers` },
      { label: 'Reasoned decisions', value: String(reasonEvents.length), note: 'Reasons provided · not automatically graded' },
      { label: 'Quarter reflections', value: count(g.reflections.length, g.quarters), note: g.phase === 'done' ? 'Final learning reflection also saved' : 'Final reflection still to come' },
    ], nextSteps: [...new Set(nextSteps)].slice(0, 5), sections: [
      { title: 'Quarter-by-quarter learning', note: 'Read completion alongside understanding. A learner can finish after receiving corrective feedback.', columns: ['Quarter', 'Focus', 'Lesson', 'Answers', 'Correct', 'Reflection'], rows: Array.from({ length: g.quarters }, (_, i) => {
        const n = i + 1, answers = responses.filter(e => e.quarter === n);
        return [`Q${n}`, quarterNames[i], status(completed.has(n)), String(answers.length), answers.length ? `${answers.filter(e => e.data.correct).length} / ${answers.length}` : 'Not measured', status(g.reflections.some(r => r.quarter === n))];
      }) },
      { title: 'Lesson understanding', note: 'Answers are checked against the selected lesson. No speed or wealth score is used.', columns: ['Quarter', 'Topic', 'Evidence'], rows: responses.map(e => {
        const depth = e.data.depth === 'deeper' || e.data.depth === 'review' ? e.data.depth : 'core';
        return [`Q${e.quarter}`, lessonBeats(e.quarter, depth)[Number(e.data.step)]?.title || 'Lesson check', e.data.correct ? 'Correct answer' : 'Review the feedback and try a fresh example'];
      }) },
      { title: 'Decisions and reasoning', note: 'Ordered by the mission event sequence. Reasons are learner-written and not scored by an AI.', columns: ['Event', 'Quarter / turn', 'Decision', 'Reason'], rows: reasonEvents.map(e => [String(e.seq), `Q${e.quarter} / ${e.turn}`, String(e.data.pending || e.type), String(e.data.reason || 'Not recorded')]) },
      { title: 'Reflect, adapt, try again', note: 'These reflections belong to this local practice only.', columns: ['Quarter', 'What changed', 'Next attempt'], rows: [...g.reflections.map(r => [`Q${r.quarter}`, r.changed, r.next]), ...(g.settlement ? [['Final reflection', g.settlement, '']] : [])] },
      { title: 'Learning support used', note: 'Opening support is a helpful strategy, not evidence of low ability.', columns: ['Support', 'Times opened'], rows: [['Mentor prompts', String(g.events.filter(e => e.type === 'scaffold-prompt').length)], ['Ledger / Word Bank', String(g.events.filter(e => e.type === 'evidence-opened').length)]] },
    ], coverage: ['Source: this browser’s current Money Quest save and event history. Starting a new practice replaces it; download the report first.', 'No account identity is verified for this practice. Do not assign it to a child without checking together. It is not uploaded to Firebase.', 'Event order is recorded; individual event times and time spent are not. Quarter trends are different topics, not a controlled measure of improvement.', 'Coins, chance events and profit are excluded from learning scores. Reflections and explanations are not automatically graded.'] };
}

export function cohortStats(reports: LearningReport[]) {
  const total = reports.reduce((n, r) => n + r.checks.total, 0);
  const correct = reports.reduce((n, r) => n + r.checks.correct, 0);
  return { learners: reports.length, measured: reports.filter(r => r.checks.total > 0).length, total, correct, accuracy: percent(correct, total) };
}

export function reportSections(report: LearningReport): ReportSection[] {
  return [
    { title: 'Report details', note: '', columns: ['Field', 'Value'], rows: [['Learner', report.learner], ['Scope', report.scope], ['Generated (UTC)', new Date(report.generatedAt).toISOString()], ['Summary', report.summary]] },
    { title: 'Learning summary', note: '', columns: ['Measure', 'Value', 'Definition'], rows: report.metrics.map(m => [m.label, m.value, m.note]) },
    { title: 'What to try next', note: '', columns: ['Suggestion'], rows: report.nextSteps.map(s => [s]) }, ...report.sections,
    { title: 'Sources and limitations', note: '', columns: ['Note'], rows: report.coverage.map(c => [c]) },
  ];
}
export function reportCsv(report: LearningReport): string {
  const cell = (s: string) => `"${(/^[\s]*[=+\-@\t\r]/.test(s) ? "'" + s : s).replaceAll('"', '""')}"`;
  return '\uFEFF' + [['Section', 'Row', 'Field', 'Value'], ...reportSections(report).flatMap(s => [
    ...(s.note ? [[s.title, '', 'Definition', s.note]] : []), ...s.rows.flatMap((row, i) => row.map((value, j) => [s.title, String(i + 1), s.columns[j], value])),
  ])].map(row => row.map(cell).join(',')).join('\r\n');
}
const escape = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
export function reportHtml(report: LearningReport): string {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(report.title)}</title><style>body{font:16px/1.6 system-ui,sans-serif;color:#27273f;margin:40px auto;padding:0 24px;max-width:1080px}h1{color:#6847b5}h2{margin-top:32px}table{border-collapse:collapse;width:100%;font-size:14px;overflow-wrap:anywhere}th,td{border:1px solid #d8d2e5;padding:10px;text-align:left;vertical-align:top}th{background:#eee7fa}p{color:#536073}tr{break-inside:avoid}thead{display:table-header-group}@media print{body{margin:0;padding:0;font-size:11pt}h2{break-after:avoid}th{color:#27273f}table{font-size:9pt}.print-help{display:none}@page{size:landscape;margin:14mm}}</style><body><h1>L.E.A.D. · ${escape(report.title)}</h1><p class="print-help">Use your browser’s Print command to print or save as PDF. This private report contains learning information; keep downloaded copies safe.</p>${reportSections(report).map(s => `<section><h2>${escape(s.title)}</h2><p>${escape(s.note)}</p>${s.rows.length ? `<table><thead><tr>${s.columns.map(c => `<th>${escape(c)}</th>`).join('')}</tr></thead><tbody>${s.rows.map(row => `<tr>${row.map(c => `<td>${escape(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '<p>No evidence recorded yet.</p>'}</section>`).join('')}</body></html>`;
}
