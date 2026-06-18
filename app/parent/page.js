import Link from 'next/link';
import {
  listChildren,
  ensureToday,
  todayStr,
  dayStatsForChild,
  fineForChild,
  globalFineRate,
} from '@/lib/chores';
import { runRotationToday } from '@/lib/actions';
import { Avatar, Shell, ParentNav } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default function ParentOverview() {
  ensureToday();
  const date = todayStr();
  const children = listChildren();

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
        <div className="stat">
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Default fine rate</div>
          <div style={{ fontSize: 22, fontWeight: 500 }}>${globalFineRate().toFixed(2)}</div>
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
                    ) : fine.pastNoon ? (
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

      <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 16 }}>
        <i className="ti ti-clock" /> A fresh batch of chores is assigned automatically every day at
        noon. Use “Run rotation now” to regenerate today’s batch immediately.
      </p>
    </Shell>
  );
}
