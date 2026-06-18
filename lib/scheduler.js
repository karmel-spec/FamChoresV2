import { generateAssignments, todayStr, ensureToday } from './chores';

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

const scheduleNextNoon = () => {
  const now = new Date();
  const noon = new Date(now);
  noon.setHours(12, 0, 0, 0);
  if (now >= noon) noon.setDate(noon.getDate() + 1);
  const delay = noon - now;
  setTimeout(() => {
    runNoonBatch();
    setInterval(runNoonBatch, 24 * 60 * 60 * 1000);
  }, delay);
  // eslint-disable-next-line no-console
  console.log(`[chores] next noon rotation in ${Math.round(delay / 60000)} min`);
};

scheduleNextNoon();
