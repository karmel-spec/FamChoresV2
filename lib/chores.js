import getDb from './db';

// ---- date helpers (local time) ----
export function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function weekdayOf(dateStr) {
  // dateStr YYYY-MM-DD -> 0 (Sun) .. 6 (Sat)
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function isPastNoon(d = new Date()) {
  return d.getHours() >= 12;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function weekdayName(i) {
  return WEEKDAYS[i] ?? '';
}

// ---- settings ----
export function getSetting(key, fallback = null) {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}
export function setSetting(key, value) {
  const db = getDb();
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, String(value));
}
export function globalFineRate() {
  return parseFloat(getSetting('global_fine_rate', '1.00')) || 0;
}
export function fineRateForChild(child) {
  if (child && child.fine_rate != null && child.fine_rate !== '') return parseFloat(child.fine_rate);
  return globalFineRate();
}

// ---- eligibility ----
function eligibleChildIdsFor(db, choreId, allChildIds) {
  const rows = db.prepare('SELECT child_id FROM chore_eligibility WHERE chore_id = ?').all(choreId);
  if (rows.length === 0) return allChildIds.slice(); // no restriction => everyone
  const set = new Set(rows.map((r) => r.child_id));
  return allChildIds.filter((id) => set.has(id));
}

function dueOn(chore, weekday) {
  if (!chore.active) return false;
  if (chore.frequency === 'weekly') {
    return Number(chore.weekday) === weekday;
  }
  // daily: respect the days_mask (default 127 = all days)
  const mask = chore.days_mask == null ? 127 : chore.days_mask;
  return (mask & (1 << weekday)) !== 0;
}

// ---- the rotation engine ----
// Assigns the day's chores: priority chores to their children, rotating chores
// balanced across eligible children toward each child's minute budget.
export function generateAssignments(dateStr, { force = false } = {}) {
  const db = getDb();
  const weekday = weekdayOf(dateStr);

  const already = db.prepare('SELECT date FROM rotation_log WHERE date = ?').get(dateStr);
  if (already && !force) return { created: false, reason: 'exists' };

  const children = db.prepare('SELECT * FROM children ORDER BY sort, id').all();
  if (children.length === 0) return { created: false, reason: 'no_children' };
  const childIds = children.map((c) => c.id);

  const tx = db.transaction(() => {
    if (force) {
      // wipe only auto-generated, not-yet-completed-data for the day, then regenerate
      db.prepare('DELETE FROM assignments WHERE date = ?').run(dateStr);
    }

    // 1) PRIORITY chores — same every day, to their assigned children
    const priority = db
      .prepare("SELECT * FROM chores WHERE chore_type = 'priority' AND active = 1 ORDER BY sort, id")
      .all();
    for (const chore of priority) {
      if (!dueOn(chore, weekday)) continue;
      const targets = eligibleChildIdsFor(db, chore.id, childIds);
      for (const cid of targets) {
        insertAssignment(db, dateStr, cid, chore, 'priority');
      }
    }

    // 2) ROTATING chores — balance by minutes toward each child's budget
    const rotating = db
      .prepare("SELECT * FROM chores WHERE chore_type = 'rotating' AND active = 1 ORDER BY minutes DESC, id")
      .all()
      .filter((c) => dueOn(c, weekday));

    // running rotating-minute load per child
    const load = {};
    childIds.forEach((id) => (load[id] = 0));

    // day-based rotation offset so the preferred starting child shifts each day
    const dayIndex = epochDay(dateStr);

    // forced-assignment chores first
    const forced = rotating.filter((c) => c.assigned_child_id);
    const pooled = rotating.filter((c) => !c.assigned_child_id);

    for (const chore of forced) {
      const cid = chore.assigned_child_id;
      if (!childIds.includes(cid)) continue;
      insertAssignment(db, dateStr, cid, chore, 'rotating');
      load[cid] += chore.minutes;
    }

    for (const chore of pooled) {
      const eligible = eligibleChildIdsFor(db, chore.id, childIds);
      if (eligible.length === 0) continue;
      // rotate the order of eligible children by the day so it varies daily
      const ordered = rotate(eligible, dayIndex);
      // pick the child with the most remaining budget capacity; ties broken by rotated order
      let best = null;
      let bestCapacity = -Infinity;
      ordered.forEach((cid, idx) => {
        const child = children.find((c) => c.id === cid);
        const capacity = (child.minute_budget || 0) - load[cid];
        // small tie-break bonus by position so rotation matters on ties
        const score = capacity - idx * 0.001;
        if (score > bestCapacity) {
          bestCapacity = score;
          best = cid;
        }
      });
      if (best == null) best = ordered[0];
      insertAssignment(db, dateStr, best, chore, 'rotating');
      load[best] += chore.minutes;
    }

    db.prepare('INSERT OR REPLACE INTO rotation_log (date, created_at) VALUES (?, ?)').run(
      dateStr,
      new Date().toISOString()
    );
  });

  tx();
  return { created: true };
}

function insertAssignment(db, dateStr, childId, chore, source) {
  db.prepare(
    `INSERT OR IGNORE INTO assignments (date, child_id, chore_id, source, minutes, difficulty, title)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(dateStr, childId, chore.id, source, chore.minutes, chore.difficulty, chore.title);
}

function epochDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

function rotate(arr, n) {
  if (arr.length === 0) return arr;
  const k = ((n % arr.length) + arr.length) % arr.length;
  return arr.slice(k).concat(arr.slice(0, k));
}

// Ensure today's batch exists (compute-on-read fallback for the noon cron).
export function ensureToday() {
  const date = todayStr();
  const db = getDb();
  const exists = db.prepare('SELECT date FROM rotation_log WHERE date = ?').get(date);
  if (!exists) generateAssignments(date);
  return date;
}

// ---- queries ----
export function listChildren() {
  return getDb().prepare('SELECT * FROM children ORDER BY sort, id').all();
}
export function getChild(id) {
  return getDb().prepare('SELECT * FROM children WHERE id = ?').get(id);
}

export function assignmentsForChild(childId, dateStr) {
  return getDb()
    .prepare('SELECT * FROM assignments WHERE child_id = ? AND date = ? ORDER BY source DESC, id')
    .all(childId, dateStr);
}

export function dayStatsForChild(childId, dateStr) {
  const rows = assignmentsForChild(childId, dateStr);
  const total = rows.length;
  const done = rows.filter((r) => r.completed).length;
  const totalMin = rows.reduce((s, r) => s + r.minutes, 0);
  const doneMin = rows.filter((r) => r.completed).reduce((s, r) => s + r.minutes, 0);
  const remainingMin = totalMin - doneMin;
  return { total, done, totalMin, doneMin, remainingMin, rows };
}

// Fine = (incomplete assignments after noon) * applicable rate.
export function fineForChild(child, dateStr, now = new Date()) {
  const rows = assignmentsForChild(child.id, dateStr);
  const incomplete = rows.filter((r) => !r.completed).length;
  const pastNoon = dateStr < todayStr(now) || (dateStr === todayStr(now) && isPastNoon(now));
  if (!pastNoon) return { amount: 0, incomplete, pastNoon: false };
  const rate = fineRateForChild(child);
  return { amount: incomplete * rate, incomplete, pastNoon: true, rate };
}
