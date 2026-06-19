import { generateAssignments, todayStr, ensureToday, nextNoonAfter } from './chores';

const runNoonBatch = () => {
  try {
    generateAssignments(todayStr(), { force: true });
    // eslint-disable-next-line no-console
    console.log(`[chores] noon batch generated for ${todayStr()}`);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[chores] noon batch failed', e);
  }
};

try {
  ensureToday();
} catch {}

// Reschedule one timer at a time so it always lands on the next noon in the
// family's chosen timezone (and stays correct across DST + timezone changes).
const scheduleNextNoon = () => {
  const now = new Date();
  const noon = nextNoonAfter(now);
  const delay = Math.max(1000, noon.getTime() - now.getTime());
  setTimeout(() => {
    runNoonBatch();
    scheduleNextNoon();
  }, delay);
  // eslint-disable-next-line no-console
  console.log(`[chores] next noon rotation in ${Math.round(delay / 60000)} min`);
};

scheduleNextNoon();
