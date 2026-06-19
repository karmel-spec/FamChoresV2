import { notFound } from 'next/navigation';
import {
  getChild,
  ensureToday,
  todayStr,
  dayStatsForChild,
  fineForChild,
  assignmentsForChild,
} from '@/lib/chores';
import { toggleAssignment } from '@/lib/actions';
import { Avatar, DifficultyPill, Shell } from '@/components/ui';
import Countdown from '@/components/Countdown';
import { quoteForDay } from '@/lib/quotes';
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
  const quote = quoteForDay(date, id);
  const topQuote = quoteForDay(date, id + 100);

  // status chip + countdown deadline (noon tomorrow)
  const deadlineMs = fine.deadline.getTime();
  const deadlineLabel = fine.deadline.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  let chip;
  if (allDone) {
    chip = { bg: '#E1F5EE', fg: '#0F6E56', icon: 'ti-circle-check', text: 'All done' };
  } else if (fine.pastDeadline) {
    chip = {
      bg: '#FCEBEB',
      fg: '#791F1F',
      icon: 'ti-alert-triangle',
      text: `Past due · $${fine.amount.toFixed(2)} fine`,
    };
  } else {
    chip = { bg: '#E6F1FB', fg: '#0C447C', icon: 'ti-clock', text: 'On track' };
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
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar child={child} size={56} rounded={12} />
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            Budget: {child.minute_budget} min/day of family chores
          </div>
        </div>
        <p
          style={{
            margin: '12px 0 0',
            fontSize: 14,
            fontStyle: 'italic',
            color: '#185FA5',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          <i className="ti ti-quote" style={{ fontSize: 18, flexShrink: 0 }} aria-hidden="true" />
          {topQuote}
        </p>
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
        <StatTile
          label="Due in"
          value={allDone ? 'Done' : <Countdown deadlineMs={deadlineMs} />}
          color={allDone ? '#0F6E56' : 'var(--text)'}
        />
      </div>

      <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--muted)' }}>
        <i className="ti ti-calendar-clock" style={{ verticalAlign: '-2px', marginRight: 4 }} />
        Due by <strong>{deadlineLabel} at noon</strong>
      </p>

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

      <div
        style={{
          marginTop: 18,
          background: '#E1F5EE',
          borderRadius: 10,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 14,
          color: '#0F6E56',
        }}
      >
        <i className="ti ti-bulb" style={{ fontSize: 22, color: '#0F6E56', flexShrink: 0 }} />
        <span style={{ fontStyle: 'italic' }}>{quote}</span>
      </div>
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
