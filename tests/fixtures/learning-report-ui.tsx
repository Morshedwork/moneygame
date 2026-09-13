// Browser-only test harness. Not imported by the production entrypoint.
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { AdminLearningAnalytics, AdminLearningRow, PlayerLearningReport } from '../../apps/client/learning/LearningReports';
import type { ViewPlayer } from '../../apps/client/store';
export function mountReports(rows: AdminLearningRow[], player?: ViewPlayer) {
  const mount = document.createElement('div'); document.body.append(mount);
  document.getElementById('root')!.style.display = 'none';
  createRoot(mount).render(player ? createElement(PlayerLearningReport, { player }) : createElement(AdminLearningAnalytics, { rows, loaded: true }));
}
