import Link from 'next/link';
import { redirect } from 'next/navigation';
import { parentLogin } from '@/lib/actions';
import { isParentAuthed } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default function ParentLogin({ searchParams }) {
  if (isParentAuthed()) redirect('/parent');
  const error = searchParams?.e;

  return (
    <div style={{ maxWidth: 380, margin: '0 auto', padding: '72px 20px' }}>
      <div className="panel" style={{ padding: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#185FA5',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              marginBottom: 10,
            }}
          >
            <i className="ti ti-lock" />
          </div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Parent admin</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
            Enter the parent passcode to continue
          </p>
        </div>

        <form action={parentLogin}>
          <input
            className="input"
            type="password"
            name="passcode"
            placeholder="Passcode"
            autoFocus
            style={{ textAlign: 'center', letterSpacing: '0.2em' }}
          />
          {error ? (
            <p style={{ margin: '10px 0 0', fontSize: 13, color: '#A32D2D', textAlign: 'center' }}>
              <i className="ti ti-alert-circle" /> Incorrect passcode
            </p>
          ) : null}
          <button className="btn btn-primary" type="submit" style={{ width: '100%', marginTop: 14 }}>
            <i className="ti ti-login" /> Unlock
          </button>
        </form>
      </div>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <Link href="/" className="btn" style={{ padding: '7px 12px', fontSize: 13 }}>
          <i className="ti ti-arrow-left" /> Back to family
        </Link>
      </div>
    </div>
  );
}
