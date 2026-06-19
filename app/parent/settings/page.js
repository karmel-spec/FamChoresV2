import { globalFineRate, listChildren, getSetting, getTimezone } from '@/lib/chores';
import {
  setGlobalFineRate,
  setParentPasscode,
  setHomeHeaderPhoto,
  removeHomeHeaderPhoto,
  setTimezone,
} from '@/lib/actions';
import { Shell, ParentNav, Avatar } from '@/components/ui';
import { requireParent, getParentPasscode } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const TIMEZONES = [
  ['America/New_York', 'Eastern (New York)'],
  ['America/Chicago', 'Central (Chicago)'],
  ['America/Denver', 'Mountain (Denver / Utah)'],
  ['America/Phoenix', 'Arizona (no daylight saving)'],
  ['America/Los_Angeles', 'Pacific (Los Angeles)'],
  ['America/Anchorage', 'Alaska (Anchorage)'],
  ['Pacific/Honolulu', 'Hawaii (Honolulu)'],
  ['America/Toronto', 'Canada Eastern (Toronto)'],
  ['America/Vancouver', 'Canada Pacific (Vancouver)'],
  ['Europe/London', 'UK (London)'],
  ['Europe/Paris', 'Central Europe (Paris)'],
  ['Australia/Sydney', 'Australia Eastern (Sydney)'],
  ['UTC', 'UTC'],
];

export default function SettingsPage() {
  requireParent();
  const rate = globalFineRate();
  const children = listChildren();
  const passcode = getParentPasscode();
  const headerPhoto = getSetting('home_header_photo', '');
  const timezone = getTimezone();
  const localNow = new Date().toLocaleString(undefined, {
    timeZone: timezone,
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
  const tzOptions = TIMEZONES.some(([z]) => z === timezone)
    ? TIMEZONES
    : [[timezone, timezone], ...TIMEZONES];

  return (
    <Shell title="Settings" subtitle="Home photo, fines and automation">
      <ParentNav active="/parent/settings" />

      <div className="panel" style={{ padding: 18, marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 6px' }}>
          <i className="ti ti-clock" /> Timezone
        </h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 14px' }}>
          Sets when “noon” is for the daily rotation, the countdown, and the fine deadline.
          Current local time: <strong>{localNow}</strong>.
        </p>
        <form action={setTimezone} style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ display: 'block' }}>
            <span className="label" style={{ display: 'block', marginBottom: 5 }}>Family timezone</span>
            <select className="select" name="timezone" defaultValue={timezone} style={{ width: 280 }}>
              {tzOptions.map(([zone, label]) => (
                <option key={zone} value={zone}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary" type="submit">
            <i className="ti ti-device-floppy" /> Save timezone
          </button>
        </form>
      </div>

      <div className="panel" style={{ padding: 18, marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 6px' }}>
          <i className="ti ti-photo" /> Home page photo
        </h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 14px' }}>
          A family photo (or any image) shown as the banner at the top of the home page.
        </p>
        {headerPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={headerPhoto}
            alt="Current home banner"
            style={{
              width: '100%',
              maxWidth: 420,
              height: 150,
              objectFit: 'cover',
              borderRadius: 10,
              display: 'block',
              marginBottom: 12,
            }}
          />
        ) : null}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <form action={setHomeHeaderPhoto}>
            <label style={{ display: 'block' }}>
              <span className="label" style={{ display: 'block', marginBottom: 5 }}>
                {headerPhoto ? 'Replace photo' : 'Upload photo'}
              </span>
              <input
                className="input"
                type="file"
                name="photo"
                accept="image/*"
                required
                style={{ padding: 6, width: 260 }}
              />
            </label>
            <button className="btn btn-primary" type="submit" style={{ marginTop: 10 }}>
              <i className="ti ti-upload" /> Save photo
            </button>
          </form>
          {headerPhoto ? (
            <form action={removeHomeHeaderPhoto}>
              <button className="btn btn-danger" type="submit" style={{ fontSize: 13 }}>
                <i className="ti ti-trash" /> Remove
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <div className="panel" style={{ padding: 18, marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 6px' }}>
          <i className="ti ti-coin" /> Fine rate
        </h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 14px' }}>
          A single flat fine per day, charged once if any chore is still unfinished by the deadline
          (noon the next day) — not per chore. Set a per-child override on the Children tab.
        </p>
        <form action={setGlobalFineRate} style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ display: 'block' }}>
            <span className="label" style={{ display: 'block', marginBottom: 5 }}>
              Default fine per day ($)
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

      <div className="panel" style={{ padding: 18, marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 6px' }}>
          <i className="ti ti-lock" /> Parent passcode
        </h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 14px' }}>
          Required to open the parent admin. Children’s dashboards stay open without it.
          {passcode === '1234' ? (
            <>
              {' '}
              <span style={{ color: '#A32D2D' }}>
                You’re still using the default <strong>1234</strong> — change it now.
              </span>
            </>
          ) : null}
        </p>
        <form action={setParentPasscode} style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ display: 'block' }}>
            <span className="label" style={{ display: 'block', marginBottom: 5 }}>
              New passcode (min 3 characters)
            </span>
            <input
              className="input"
              type="text"
              name="passcode"
              minLength={3}
              placeholder="New passcode"
              style={{ width: 200 }}
            />
          </label>
          <button className="btn btn-primary" type="submit">
            <i className="ti ti-device-floppy" /> Update passcode
          </button>
        </form>
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
