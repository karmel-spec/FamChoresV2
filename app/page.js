import Link from 'next/link';
import { listChildren, ensureToday, dayStatsForChild, todayStr, getSetting } from '@/lib/chores';
import { Avatar } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default function Home() {
  ensureToday();
  const date = todayStr();
  const children = listChildren();
  const headerPhoto = getSetting('home_header_photo', '');

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '28px 20px 64px' }}>
      {headerPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={headerPhoto}
          alt="Family"
          style={{
            width: '100%',
            height: 200,
            objectFit: 'cover',
            borderRadius: 16,
            marginBottom: 24,
            display: 'block',
          }}
        />
      ) : null}

      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        {headerPhoto ? null : (
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 14,
              background: '#185FA5',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              marginBottom: 14,
            }}
          >
            <i className="ti ti-checklist" />
          </div>
        )}
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 500 }}>Family Chores</h1>
        <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>Who's checking in today?</p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 14,
          marginBottom: 28,
        }}
      >
        {children.map((c) => {
          const stats = dayStatsForChild(c.id, date);
          return (
            <Link key={c.id} href={`/child/${c.id}`} className="panel" style={{
              padding: 18,
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              textAlign: 'center',
            }}>
              <Avatar child={c} size={68} rounded={16} />
              <div>
                <div style={{ fontSize: 17, fontWeight: 500 }}>{c.name}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {stats.done}/{stats.total} done · {stats.totalMin} min
                </div>
              </div>
            </Link>
          );
        })}
        {children.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>No children yet — add them in the parent admin.</p>
        ) : null}
      </div>

      <div style={{ textAlign: 'center' }}>
        <Link href="/parent" className="btn btn-primary" style={{ padding: '10px 18px' }}>
          <i className="ti ti-lock" /> Parent admin
        </Link>
      </div>
    </div>
  );
}
