import Link from 'next/link';
import {
  listChildren,
  ensureToday,
  todayStr,
  dayStatsForChild,
  fineForChild,
  unassignedForDate,
} from '@/lib/chores';
import { runRotationToday, assignUnassignedChore } from '@/lib/actions';
import { Avatar, Shell, ParentNav } from '@/components/ui';
import { requireParent } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default function ParentOverview() {
  requireParent();
  ensureToday();
  const date = todayStr();
  const children = listChildren();
  const unassigned = unassignedForDate(date);

  let totalFines = 0;
  let totalDone = 0;
  let totalTasks = 0;
  const rows = children.map((c) => {
    const stats = dayStatsForChild(c.id, date);
    const fine = fineForChild(c, date);
    totalFines += fine.amount;
    totalDone += stats.done;
    totalTasks += stats.total;
    return { c, stats, fine };
  });

  return (
    <Shell
      title="Parent admin"
      subtitle={new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })}
      right={
        <form action={runRotationToday}>
          <button className="btn btn-primary" type="submit">
            <i className="ti ti-refresh" /> Run rotation now
          </button>
        </form>
      }
    >
      <ParentNav active="/parent" />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 10,
          marginBottom: 22,
        }}
      >
        <div className="stat">
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Children</div>
          <div style={{ fontSize: 22, fontWeight: 500 }}>{children.length}</div>
        </div>
        <div className="stat">
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Tasks done today</div>
          <div style={{ fontSize: 22, fontWeight: 500 }}>
            {totalDone} / {totalTasks}
          </div>
        </div>
        <div className="stat">
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Fines owed today</div>
          <div style={{ fontSize: 22, fontWeight: 500, color: totalFines > 0 ? '#A32D2D' : 'var(--text)' }}>
            ${totalFines.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="panel" style={{ overflow: 'hidden' }}>
        <table className="data">
          <thead>
            <tr>
              <th>Child</th>
              <th>Completed</th>
              <th>Minutes</th>
              <th>Status</th>
              <th>Fine</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, stats, fine }) => {
              const allDone = stats.total > 0 && stats.done === stats.total;
              return (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar child={c} size={34} rounded={9} />
                      <span style={{ fontWeight: 500 }}>{c.name}</span>
                    </div>
                  </td>
                  <td>
                    {stats.done} / {stats.total}
                  </td>
                  <td>
                    {stats.doneMin} / {stats.totalMin} min
                  </td>
                  <td>
                    {allDone ? (
                      <span className="pill" style={{ background: '#E1F5EE', color: '#0F6E56' }}>
                        done
                      </span>
                    ) : fine.pastDeadline ? (
                      <span className="pill" style={{ background: '#FCEBEB', color: '#791F1F' }}>
                        {fine.incomplete} missed
                      </span>
                    ) : (
                      <span className="pill" style={{ background: '#E6F1FB', color: '#0C447C' }}>
                        in progress
                      </span>
                    )}
                  </td>
                  <td style={{ color: fine.amount > 0 ? '#A32D2D' : 'var(--muted)' }}>
                    ${fine.amount.toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link className="btn" href={`/child/${c.id}`} style={{ padding: '5px 10px' }}>
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ color: 'var(--muted)' }}>
                  No children yet. Add them under the Children tab.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {unassigned.length ? (
        <div className="panel" style={{ overflow: 'hidden', marginTop: 18 }}>
          <div
            style={{
              padding: '10px 14px',
              background: '#FAEEDA',
              borderBottom: '1px solid var(--border)',
              fontSize: 12,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: '#854F0B',
            }}
          >
            <i className="ti ti-alert-triangle" style={{ marginRight: 6 }} />
            Unassigned today · {unassigned.length} — didn’t fit anyone’s minute budget
          </div>
          {unassigned.map((u) => (
            <div
              key={u.chore_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '11px 14px',
                borderBottom: '1px solid var(--border)',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1, minWidth: 180 }}>
                <span style={{ fontWeight: 500 }}>{u.title}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>
                  {u.minutes} min · {u.difficulty}
                </span>
              </div>
              <form action={assignUnassignedChore} style={{ display: 'flex', gap: 8 }}>
                <input type="hidden" name="chore_id" value={u.chore_id} />
                <select className="select" name="child_id" style={{ width: 140 }} required defaultValue="">
                  <option value="" disabled>
                    Assign to…
                  </option>
                  {children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button className="btn" type="submit" style={{ padding: '6px 12px', fontSize: 13 }}>
                  Assign
                </button>
              </form>
            </div>
          ))}
        </div>
      ) : null}

      <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 16 }}>
        <i className="ti ti-clock" /> A fresh batch of chores is assigned automatically every day at
        noon. Each child is filled only up to their daily minute budget; anything left over appears
        above for you to hand out. Use “Run rotation now” to regenerate today’s batch.
      </p>
    </Shell>
  );
}
