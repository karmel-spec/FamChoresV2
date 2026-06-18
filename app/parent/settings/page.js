import { globalFineRate, listChildren } from '@/lib/chores';
import { setGlobalFineRate } from '@/lib/actions';
import { Shell, ParentNav, Avatar } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  const rate = globalFineRate();
  const children = listChildren();

  return (
    <Shell title="Settings" subtitle="Fines and automation">
      <ParentNav active="/parent/settings" />

      <div className="panel" style={{ padding: 18, marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 6px' }}>
          <i className="ti ti-coin" /> Fine rate
        </h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 14px' }}>
          Charged per unfinished chore once the noon deadline passes. Set a per-child override on the
          Children tab.
        </p>
        <form action={setGlobalFineRate} style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ display: 'block' }}>
            <span className="label" style={{ display: 'block', marginBottom: 5 }}>
              Default fine per missed chore ($)
            </span>
            <input
              className="input"
              type="number"
              step="0.25"
              min="0"
              name="global_fine_rate"
              defaultValue={rate.toFixed(2)}
              style={{ width: 160 }}
            />
          </label>
          <button className="btn btn-primary" type="submit">
            <i className="ti ti-device-floppy" /> Save
          </button>
        </form>

        <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <span className="label">Per-child overrides</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {children.map((c) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                <Avatar child={c} size={28} rounded={8} />
                <span style={{ flex: 1 }}>{c.name}</span>
                <span style={{ color: 'var(--muted)' }}>
                  {c.fine_rate != null && c.fine_rate !== ''
                    ? `$${Number(c.fine_rate).toFixed(2)} (override)`
                    : `$${rate.toFixed(2)} (default)`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel" style={{ padding: 18 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 6px' }}>
          <i className="ti ti-clock" /> Daily automation
        </h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
          A new batch of chores is assigned automatically every day at <strong>noon</strong> (and on
          first visit each day). The rotation balances each child’s assigned minutes against their
          daily budget and shifts who gets what day to day. You can force a regenerate anytime with
          “Run rotation now” on the Overview tab.
        </p>
      </div>
    </Shell>
  );
}
