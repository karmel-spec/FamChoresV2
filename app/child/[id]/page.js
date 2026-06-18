import { notFound } from 'next/navigation';
import {
  getChild,
  ensureToday,
  todayStr,
  dayStatsForChild,
  fineForChild,
  assignmentsForChild,
  isPastNoon,
} from '@/lib/chores';
import { toggleAssignment } from '@/lib/actions';
import { Avatar, DifficultyPill, Shell } from '@/components/ui';
import getDb from '@/lib/db';

export const dynamic = 'force-dynamic';

function StatTile({ label, value, unit, color }) {
  return (
    <div className="stat">
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, color: color || 'var(--text)' }}>
        {value}
        {unit ? <span style={{ fontSize: 13, marginLeft: 3 }}>{unit}</span> : null}
      </div>
    </div>
  );
}

function ChoreRow({ a, notes }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 14px',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <form action={toggleAssignment}>
        <input type="hidden" name="id" value={a.id} />
        <button
          type="submit"
          aria-label={a.completed ? 'Mark not done' : 'Mark done'}
          style={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: 22,
            lineHeight: 1,
            color: a.completed ? '#1D9E75' : '#94a3b8',
            padding: 0,
          }}
        >
          <i className={a.completed ? 'ti ti-circle-check' : 'ti ti-circle'} />
        </button>
      </form>
      <div style={{ flex: 1 }}>
        <span
          style={{
            textDecoration: a.completed ? 'line-through' : 'none',
            color: a.completed ? 'var(--muted)' : 'var(--text)',
          }}
        >
          {a.title}
        </span>
        {notes ? (
          <details style={{ marginTop: 2 }}>
            <summary
              style={{
                fontSize: 12,
                color: '#185FA5',
                cursor: 'pointer',
                listStyle: 'none',
              }}
            >
              <i className="ti ti-info-circle" /> How to do it
            </summary>
            <p style={{ margin: '6px 0 2px', fontSize: 13, color: 'var(--muted)' }}>{notes}</p>
          </details>
        ) : null}
      </div>
      <DifficultyPill difficulty={a.difficulty} minutes={a.minutes} />
    </div>
  );
}

export default function ChildDashboard({ params }) {
  const id = Number(params.id);
  const child = getChild(id);
  if (!child) notFound();

  ensureToday();
  const date = todayStr();
  const stats = dayStatsForChild(id, date);
  const fine = fineForChild(child, date);
  const rows = assignmentsForChild(id, date);

  const db = getDb();
  const notesById = {};
  rows.forEach((r) => {
    const c = db.prepare('SELECT training_notes FROM chores WHERE id = ?').get(r.chore_id);
    notesById[r.chore_id] = c?.training_notes || '';
  });

  const priority = rows.filter((r) => r.source === 'priority');
  const rotating = rows.filter((r) => r.source === 'rotating');

  const allDone = stats.total > 0 && stats.done === stats.total;
  const pct = stats.totalMin ? Math.round((stats.doneMin / stats.totalMin) * 100) : 0;

  // status chip + "due in"
  const now = new Date();
  let chip;
  if (allDone) {
    chip = { bg: '#E1F5EE', fg: '#0F6E56', icon: 'ti-circle-check', text: 'All done' };
  } else if (fine.pastNoon) {
    chip = {
      bg: '#FCEBEB',
      fg: '#791F1F',
      icon: 'ti-alert-triangle',
      text: `Past noon · $${fine.amount.toFixed(2)} fine`,
    };
  } else {
    chip = { bg: '#E6F1FB', fg: '#0C447C', icon: 'ti-clock', text: 'On track' };
  }

  let dueValue = '—';
  let dueColor = 'var(--text)';
  if (!isPastNoon(now)) {
    const noon = new Date(now);
    noon.setHours(12, 0, 0, 0);
    const mins = Math.max(0, Math.round((noon - now) / 60000));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    dueValue = h > 0 ? `${h}h ${m}m` : `${m}m`;
    if (mins < 60) dueColor = '#BA7517';
  } else {
    dueValue = 'past';
    dueColor = '#A32D2D';
  }

  return (
    <Shell
      title={child.name}
      subtitle={`Daily chore report · ${new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      })}`}
      right={
        <span
          className="pill"
          style={{ background: chip.bg, color: chip.fg, fontSize: 13, padding: '5px 11px' }}
        >
          <i className={`ti ${chip.icon}`} /> {chip.text}
        </span>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <Avatar child={child} size={56} rounded={12} />
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          Budget: {child.minute_budget} min/day of family chores
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
          marginBottom: 16,
        }}
      >
        <StatTile label="Completed" value={`${stats.done} / ${stats.total}`} />
        <StatTile label="Time left" value={stats.remainingMin} unit="min" />
        <StatTile label="Due in" value={dueValue} color={dueColor} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
        <div
          style={{
            flex: 1,
            height: 8,
            background: '#e2e8f0',
            borderRadius: 999,
            overflow: 'hidden',
          }}
        >
          <div style={{ width: `${pct}%`, height: '100%', background: '#378ADD' }} />
        </div>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          {pct}% of {stats.totalMin} min
        </span>
      </div>

      <Panel title="Priority tasks · do first" icon="ti-flag">
        {priority.length ? (
          priority.map((a) => <ChoreRow key={a.id} a={a} notes={notesById[a.chore_id]} />)
        ) : (
          <Empty>No priority chores set for today.</Empty>
        )}
      </Panel>

      <div style={{ height: 14 }} />

      <Panel title="Family contribution · rotated today" icon="ti-refresh">
        {rotating.length ? (
          rotating.map((a) => <ChoreRow key={a.id} a={a} notes={notesById[a.chore_id]} />)
        ) : (
          <Empty>No rotating chores assigned today.</Empty>
        )}
      </Panel>

      {!allDone ? (
        <div
          style={{
            marginTop: 18,
            background: '#FAEEDA',
            borderRadius: 10,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
            color: '#633806',
          }}
        >
          <i className="ti ti-alarm" style={{ fontSize: 20, color: '#854F0B' }} />
          Finish everything by <strong>noon</strong> to avoid a fine
          {fine.rate ? <> of ${fine.rate.toFixed(2)} per unfinished chore</> : null}.
        </div>
      ) : null}
    </Shell>
  );
}

function Panel({ title, icon, children }) {
  return (
    <div className="panel" style={{ overflow: 'hidden' }}>
      <div
        style={{
          padding: '10px 14px',
          background: '#f8fafc',
          borderBottom: '1px solid var(--border)',
          fontSize: 12,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: 'var(--muted)',
        }}
      >
        <i className={`ti ${icon}`} style={{ marginRight: 6 }} />
        {title}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }) {
  return (
    <div style={{ padding: '16px 14px', fontSize: 13, color: 'var(--muted)' }}>{children}</div>
  );
}
