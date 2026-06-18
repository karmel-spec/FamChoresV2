import Link from 'next/link';
import { parentLogout } from '@/lib/actions';

export function Avatar({ child, size = 46, rounded = 10 }) {
  const initials = (child?.name || '?')
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const style = {
    width: size,
    height: size,
    borderRadius: rounded,
    background: child?.color || '#185FA5',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 500,
    fontSize: size * 0.4,
    overflow: 'hidden',
    flexShrink: 0,
  };
  if (child?.photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={child.photo} alt={child.name} style={{ ...style, objectFit: 'cover' }} />
    );
  }
  return <div style={style}>{initials}</div>;
}

const DIFF = {
  easy: { bg: '#E6F1FB', fg: '#0C447C', label: 'easy' },
  medium: { bg: '#FAEEDA', fg: '#633806', label: 'medium' },
  hard: { bg: '#FCEBEB', fg: '#791F1F', label: 'hard' },
};

export function DifficultyPill({ difficulty, minutes }) {
  const d = DIFF[difficulty] || DIFF.easy;
  return (
    <span className="pill" style={{ background: d.bg, color: d.fg }}>
      {d.label}
      {minutes != null ? ` · ${minutes}m` : ''}
    </span>
  );
}

export function Shell({ title, subtitle, right, children }) {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 20px 64px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 22,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            href="/"
            className="btn"
            style={{ padding: '7px 10px' }}
            aria-label="Home"
          >
            <i className="ti ti-home" />
          </Link>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>{title}</h1>
            {subtitle ? (
              <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--muted)' }}>{subtitle}</p>
            ) : null}
          </div>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

export function ParentNav({ active }) {
  const tabs = [
    ['/parent', 'Overview', 'ti-layout-dashboard'],
    ['/parent/children', 'Children', 'ti-users'],
    ['/parent/chores', 'Chore list', 'ti-list-check'],
    ['/parent/settings', 'Settings', 'ti-settings'],
  ];
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap', alignItems: 'center' }}>
      {tabs.map(([href, label, icon]) => (
        <Link
          key={href}
          href={href}
          className="btn"
          style={
            active === href
              ? { background: '#185FA5', borderColor: '#185FA5', color: '#fff' }
              : {}
          }
        >
          <i className={`ti ${icon}`} /> {label}
        </Link>
      ))}
      <form action={parentLogout} style={{ marginLeft: 'auto' }}>
        <button className="btn" type="submit" style={{ fontSize: 13 }}>
          <i className="ti ti-logout" /> Lock
        </button>
      </form>
    </div>
  );
}
