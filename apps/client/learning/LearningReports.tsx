import { useEffect, useId, useRef, useState } from 'react';
import { BarChart3, Download, Printer, Sprout, ArrowRight } from 'lucide-react';
import { accountReport, cohortStats, LearningReport, missionReport, reportCsv, reportHtml } from '../../../packages/learning-report';
import type { Mission } from '../../../packages/money-quest/engine';
import { useGame, ViewPlayer } from '../store';
import { useVillageSession } from '../village/session';
import { activities } from '../village/content';
import './learning-reports.css';

function download(contents: string, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function LearningReportView({ report }: { report: LearningReport }) {
  const id = useId();
  const [message, setMessage] = useState('');
  const frame = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => () => frame.current?.remove(), []);
  function print() {
    frame.current?.remove();
    const f = document.createElement('iframe'); frame.current = f;
    f.title = 'Printable learning report'; f.style.cssText = 'position:fixed;width:1px;height:1px;left:-10000px;border:0';
    f.onload = () => { try { f.contentWindow?.focus(); f.contentWindow?.print(); setMessage('Choose Save as PDF in the print dialog, or download the HTML report.'); } catch { setMessage('Printing is unavailable here. Download the HTML report and print it from your browser.'); } };
    f.srcdoc = reportHtml(report); document.body.append(f);
    // Keep the document alive while the native print dialog is open.
    f.contentWindow?.addEventListener('afterprint', () => f.remove(), { once: true });
  }
  const exportReport = (format: 'html' | 'csv') => {
    download(format === 'html' ? reportHtml(report) : reportCsv(report), format === 'html' ? 'text/html;charset=utf-8' : 'text/csv;charset=utf-8', `lead-learning-report-${new Date(report.generatedAt).toISOString().slice(0, 10)}.${format}`);
    setMessage(`${format.toUpperCase()} report downloaded. It contains private learning information; keep it safe.`);
  };
  return <article className="lr-report" aria-labelledby={id}>
    <header className="lr-heading"><div><span className="lr-eyebrow"><Sprout size={16} /> LEARNING, NOT LEADERBOARDS</span><h1 id={id}>{report.title}</h1><p className="lr-learner">{report.learner} <span>· {report.scope}</span></p></div>
      <div className="lr-actions"><button onClick={print}><Printer size={17} /> Print / Save PDF</button><button onClick={() => exportReport('html')}><Download size={17} /> Download report</button><button onClick={() => exportReport('csv')}>Export CSV</button></div>
    </header>
    <p className="lr-summary">{report.summary}</p>
    <div className="lr-metrics">{report.metrics.map((m, i) => <section className={`lr-metric lr-tone-${i % 4}`} key={m.label}><h2>{m.label}</h2><strong>{m.value}</strong><p>{m.note}</p></section>)}</div>
    <section className="lr-next"><div><span className="lr-eyebrow">ONE SMALL STEP</span><h2>What to try next</h2></div><ul>{report.nextSteps.map(s => <li key={s}>{s}</li>)}</ul></section>
    {report.sections.map(section => <section className="lr-section" key={section.title}><h2>{section.title}</h2><p>{section.note}</p>{section.rows.length ? <div className="lr-table" role="region" aria-label={section.title} tabIndex={0}><table><thead><tr>{section.columns.map(c => <th scope="col" key={c}>{c}</th>)}</tr></thead><tbody>{section.rows.map((row, i) => <tr key={i}>{row.map((v, j) => j === 0 ? <th scope="row" key={j}>{v}</th> : <td key={j}>{v}</td>)}</tr>)}</tbody></table></div> : <p className="lr-empty">No evidence recorded yet. Your learning will appear here as you take part.</p>}</section>)}
    <details className="lr-method"><summary>What this report measures · sources & privacy</summary><ul>{report.coverage.map(s => <li key={s}>{s}</li>)}</ul></details>
    <footer className="lr-footer">Generated {new Date(report.generatedAt).toLocaleString()} · snapshot of the evidence currently available. Reopen or download again after more learning.</footer>
    <p role="status" className="lr-export-status">{message}</p>
  </article>;
}

export function PlayerLearningReport({ player, practice = false }: { player: ViewPlayer; practice?: boolean }) {
  return <LearningReportView report={accountReport(player, practice)} />;
}
export function LearningPulse() {
  const { player, practice, setPage } = useGame();
  if (!player) return null;
  const report = accountReport(player, practice);
  return <aside className="lr-pulse"><BarChart3 size={21} /><p><b>Your learning story is growing.</b><span>{report.checks.total ? `${report.checks.correct} correct answers from ${report.checks.total} attempts. Feedback and retries are part of the journey.` : 'Each answer, activity and reflection adds to your learning report.'}</span></p><button onClick={() => setPage('reports')}>View learning report <ArrowRight size={16} /></button></aside>;
}
function VillageReport() {
  const completed = useVillageSession(s => s.completed);
  const { player } = useGame();
  const [open, setOpen] = useState(false);
  const list = Object.values(activities), stamped = list.filter(a => completed.includes(a.id));
  const report: LearningReport = { version: 1, title: 'Village learning passport', learner: player?.name || 'Explorer', generatedAt: Date.now(), scope: 'This app session only · not saved to a child account',
    summary: `${stamped.length} of ${list.length} village activities completed. Stamps recognise participation, not mastery.`, checks: { correct: 0, total: 0, firstCorrect: 0, firstTotal: 0 },
    metrics: [{ label: 'Village activities', value: `${stamped.length} / ${list.length}`, note: 'Unique activity stamps this session' }, { label: 'Answer accuracy', value: 'Not recorded', note: 'Do not interpret completion as a test result' }],
    nextSteps: list.filter(a => !completed.includes(a.id)).slice(0, 3).map(a => `${a.title}: ${a.description}`),
    sections: [{ title: 'Skills explored', note: 'The same activity is counted once, even if you revisit it in another district.', columns: ['Activity', 'Skill', 'Participation'], rows: list.map(a => [a.title, a.skill, completed.includes(a.id) ? 'Completed this session' : 'Not yet this session']) }],
    coverage: ['Source: current village session stamps. No per-answer accuracy or duration is recorded.', 'Signing out, refreshing or restarting can clear these stamps. Download this report before leaving. No local stamps are uploaded to Firebase.'] };
  return <section className="lr-local"><div><h2>Village activities</h2><p>{stamped.length} of {list.length} activity stamps in this app session. Separate from the saved learner record.</p></div><button aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Close village report' : 'Open village report'}</button>{open && <LearningReportView report={report} />}</section>;
}
export function LearningReportsPage() {
  const { player, practice } = useGame();
  if (!player) return null;
  return <><PlayerLearningReport player={player} practice={practice} /><VillageReport /><section className="lr-local"><div><h2>Separate Money Quest practice</h2><p>Open Money Quest and choose Learning report for its quarter-by-quarter answers, decision reasons and reflections. That browser-local save has no verified child identity.</p></div><a href="/mission">Open Money Quest <ArrowRight size={16} /></a></section></>;
}
export function MissionLearningReport({ mission }: { mission: Mission }) {
  const [open, setOpen] = useState(false);
  return <section className="lr-mission-report"><button className="lr-mission-toggle" onClick={() => setOpen(!open)} aria-expanded={open}><BarChart3 size={18} />{open ? 'Close learning report' : 'Learning report'}</button>{open && <LearningReportView report={missionReport(mission)} />}</section>;
}
export type AdminLearningRow = { id: string; role: string; name: string; learningReport?: LearningReport };
export function AdminLearningAnalytics({ rows, loaded }: { rows: AdminLearningRow[]; loaded: boolean }) {
  const [search, setSearch] = useState(''), [selected, setSelected] = useState('');
  const students = rows.filter(r => r.role === 'student' && r.name.toLowerCase().includes(search.trim().toLowerCase()));
  const reports = students.flatMap(r => r.learningReport ? [r.learningReport] : []);
  const stats = cohortStats(reports), current = students.find(r => r.id === selected)?.learningReport;
  const cohort: LearningReport = { version: 1, title: 'Learning cohort summary', learner: 'Student cohort', generatedAt: Date.now(), scope: `Current admin result · ${students.length} students matching the name filter · up to 200 accounts loaded`,
    summary: `${stats.measured} of ${students.length} matching students have recorded finance answers. ${students.length - reports.length} reports are unavailable.`, checks: { correct: stats.correct, total: stats.total, firstCorrect: 0, firstTotal: 0 },
    metrics: [{ label: 'Matching students', value: String(students.length), note: 'Parent and admin accounts excluded' }, { label: 'Recorded answer accuracy', value: stats.accuracy, note: `${stats.correct} correct / ${stats.total} attempts, weighted by attempts` }],
    nextSteps: ['Use each learner’s topic report to choose a supportive practice activity. Do not compare or rank children using coins, speed or this aggregate.'],
    sections: [{ title: 'Learner reports', note: 'This export uses the same name filter as the screen. Unavailable data is not counted as zero.', columns: ['Learner', 'Finance attempts', 'Correct answers', 'First-try checks', 'Next learning step'], rows: students.map(r => [r.name, r.learningReport ? String(r.learningReport.checks.total) : 'Unavailable', r.learningReport ? String(r.learningReport.checks.correct) : 'Unavailable', r.learningReport ? `${r.learningReport.checks.firstCorrect} / ${r.learningReport.checks.firstTotal}` : 'Unavailable', r.learningReport?.nextSteps[0] || 'Report unavailable']) }],
    coverage: ['Source: protected Firebase learner views, capped at 200 accounts. This is a loaded subset, not guaranteed to be the entire school. The name filter applies only to loaded records.', 'Accuracy is sum(correct answers) / sum(attempts), not an average of student percentages. Students without attempts have unknown accuracy.', 'Reports remain protected by approved administrator access. Downloaded files contain private student information.'] };
  return <section className="lr-admin"><h2>Learning analytics</h2><p>Understand the learning behind the play. Only students are included.</p><label className="lr-filter">Filter learning reports by display name<input value={search} onChange={e => { setSearch(e.target.value); setSelected(''); }} placeholder="All loaded students" /></label>
    {!loaded ? <p role="status">Load accounts to see their learning evidence.</p> : <>
      {students.some(r => !r.learningReport) && <p role="status" className="lr-empty">Some learning reports are unavailable from the current service. Refresh after the reporting service is updated. Missing reports are not counted as zero.</p>}
      <LearningReportView report={cohort} />
      <label className="lr-filter">Open a learner’s full report<select value={selected} onChange={e => setSelected(e.target.value)}><option value="">Choose a student</option>{students.map(r => <option key={r.id} value={r.id} disabled={!r.learningReport}>{r.name}{!r.learningReport ? ' · unavailable' : ''}</option>)}</select></label>
      {current && <LearningReportView report={current} />}
    </>}
  </section>;
}
