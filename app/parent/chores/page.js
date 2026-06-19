import { listChildren } from '@/lib/chores';
import { addChore, updateChore, deleteChore, toggleChoreActive } from '@/lib/actions';
import { DifficultyPill, Shell, ParentNav } from '@/components/ui';
import CategoryPicker from '@/components/CategoryPicker';
import { requireParent } from '@/lib/auth';
import getDb from '@/lib/db';

export const dynamic = 'force-dynamic';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function scheduleLabel(c) {
  if (c.frequency === 'weekly') return `Weekly · ${DAYS[c.weekday ?? 0]}`;
  const mask = c.days_mask == null ? 127 : c.days_mask;
  if (mask === 127) return 'Daily';
  const days = DAYS.filter((_, i) => mask & (1 << i));
  return days.join(', ');
}

export default function ChoresPage() {
  requireParent();
  const db = getDb();
  const children = listChildren();
  const chores = db.prepare('SELECT * FROM chores ORDER BY chore_type, category, sort, id').all();

  const elig = {};
  db.prepare('SELECT chore_id, child_id FROM chore_eligibility')
    .all()
    .forEach((r) => {
      (elig[r.chore_id] = elig[r.chore_id] || new Set()).add(r.child_id);
    });

  const priority = chores.filter((c) => c.chore_type === 'priority');
  const rotating = chores.filter((c) => c.chore_type === 'rotating');

  // All category names, sorted, for the group headers and the form's picker.
  const categories = [...new Set(chores.map((c) => c.category || 'General'))].sort((a, b) =>
    a.localeCompare(b)
  );
  // Group rotating chores by category.
  const rotatingByCategory = categories
    .map((cat) => ({ cat, items: rotating.filter((c) => (c.category || 'General') === cat) }))
    .filter((g) => g.items.length > 0);

  return (
    <Shell
      title="Chore list"
      subtitle="The master list — organized by category. Toggle on/off, edit, add notes, or delete."
    >
      <ParentNav active="/parent/chores" />

      <div className="panel" style={{ padding: 16, marginBottom: 18 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 12px' }}>
          <i className="ti ti-plus" /> Add a new chore
        </h2>
        <ChoreForm action={addChore} children={children} categories={categories} />
      </div>

      <Section title="Priority chores · same every day" icon="ti-flag" count={priority.length}>
        {priority.map((c) => (
          <ChoreItem key={c.id} c={c} children={children} elig={elig[c.id]} categories={categories} />
        ))}
        {priority.length === 0 ? <Empty>No priority chores yet.</Empty> : null}
      </Section>

      <Section title="Rotating chores · by category" icon="ti-refresh" count={rotating.length}>
        {rotatingByCategory.map((g) => (
          <div key={g.cat}>
            <div
              style={{
                padding: '8px 14px',
                background: '#eef2f7',
                borderBottom: '1px solid var(--border)',
                fontSize: 12,
                fontWeight: 500,
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <i className="ti ti-folder" /> {g.cat} · {g.items.length}
            </div>
            {g.items.map((c) => (
              <ChoreItem key={c.id} c={c} children={children} elig={elig[c.id]} categories={categories} />
            ))}
          </div>
        ))}
        {rotating.length === 0 ? <Empty>No rotating chores yet.</Empty> : null}
      </Section>
    </Shell>
  );
}

function ChoreItem({ c, children, elig, categories }) {
  const eligNames = children
    .filter((k) => (elig ? elig.has(k.id) : false))
    .map((k) => k.name);
  const who =
    c.assigned_child_id != null
      ? `Assigned to ${children.find((k) => k.id === c.assigned_child_id)?.name || '—'}`
      : eligNames.length
      ? (c.chore_type === 'priority' ? 'For: ' : 'Pool: ') + eligNames.join(', ')
      : 'Anyone';

  return (
    <div
      style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--border)',
        opacity: c.active ? 1 : 0.55,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
            {c.title}
            {!c.active ? (
              <span className="pill" style={{ background: '#F1EFE8', color: '#444441' }}>off</span>
            ) : null}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
            {c.category} · {scheduleLabel(c)} · {who}
          </div>
        </div>
        <DifficultyPill difficulty={c.difficulty} minutes={c.minutes} />
        <form action={toggleChoreActive}>
          <input type="hidden" name="id" value={c.id} />
          <button className="btn" type="submit" style={{ padding: '5px 10px', fontSize: 13 }}>
            <i className={c.active ? 'ti ti-toggle-right' : 'ti ti-toggle-left'} />
            {c.active ? ' On' : ' Off'}
          </button>
        </form>
      </div>

      <details style={{ marginTop: 8 }}>
        <summary style={{ fontSize: 13, color: '#185FA5', cursor: 'pointer' }}>
          <i className="ti ti-edit" /> Edit
        </summary>
        <div style={{ marginTop: 12 }}>
          <ChoreForm action={updateChore} children={children} c={c} elig={elig} categories={categories} />
          <form action={deleteChore} style={{ marginTop: 10 }}>
            <input type="hidden" name="id" value={c.id} />
            <button className="btn btn-danger" type="submit" style={{ padding: '5px 10px', fontSize: 13 }}>
              <i className="ti ti-trash" /> Delete chore
            </button>
          </form>
        </div>
      </details>
    </div>
  );
}

function ChoreForm({ action, children, c, elig, categories = [] }) {
  const mask = c ? (c.days_mask == null ? 127 : c.days_mask) : 127;
  return (
    <form action={action}>
      {c ? <input type="hidden" name="id" value={c.id} /> : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 12 }}>
        <Field label="Title">
          <input className="input" name="title" defaultValue={c?.title || ''} required />
        </Field>
        <Field label="Category">
          <CategoryPicker categories={categories} defaultValue={c?.category || 'General'} />
        </Field>
        <Field label="Minutes">
          <input className="input" type="number" name="minutes" defaultValue={c?.minutes ?? 10} min={1} />
        </Field>
        <Field label="Difficulty">
          <select className="select" name="difficulty" defaultValue={c?.difficulty || 'easy'}>
            <option value="easy">easy</option>
            <option value="medium">medium</option>
            <option value="hard">hard</option>
          </select>
        </Field>
        <Field label="Type">
          <select className="select" name="chore_type" defaultValue={c?.chore_type || 'rotating'}>
            <option value="rotating">rotating (family pool)</option>
            <option value="priority">priority (same every day)</option>
          </select>
        </Field>
        <Field label="Frequency">
          <select className="select" name="frequency" defaultValue={c?.frequency || 'daily'}>
            <option value="daily">daily</option>
            <option value="weekly">weekly</option>
          </select>
        </Field>
        <Field label="Weekly day (if weekly)">
          <select className="select" name="weekday" defaultValue={c?.weekday ?? 6}>
            {DAYS.map((d, i) => (
              <option key={i} value={i}>{d}</option>
            ))}
          </select>
        </Field>
        <Field label="Force to child (rotating only)">
          <select className="select" name="assigned_child_id" defaultValue={c?.assigned_child_id ?? ''}>
            <option value="">— rotate —</option>
            {children.map((k) => (
              <option key={k.id} value={k.id}>{k.name}</option>
            ))}
          </select>
        </Field>
      </div>

      <div style={{ marginTop: 12 }}>
        <span className="label" style={{ display: 'block', marginBottom: 6 }}>
          Days eligible (for daily chores)
        </span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {DAYS.map((d, i) => (
            <label key={i} className="pill" style={{ background: '#f1f5f9', color: '#334155', cursor: 'pointer', padding: '5px 10px' }}>
              <input type="checkbox" name="days" value={i} defaultChecked={(mask & (1 << i)) !== 0} style={{ marginRight: 4 }} />
              {d}
            </label>
          ))}
        </div>
      </div>

      {children.length ? (
        <div style={{ marginTop: 12 }}>
          <span className="label" style={{ display: 'block', marginBottom: 6 }}>
            Who can be assigned (none = everyone)
          </span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {children.map((k) => (
              <label key={k.id} className="pill" style={{ background: '#f1f5f9', color: '#334155', cursor: 'pointer', padding: '5px 10px' }}>
                <input type="checkbox" name="eligible" value={k.id} defaultChecked={elig ? elig.has(k.id) : false} style={{ marginRight: 4 }} />
                {k.name}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 12 }}>
        <span className="label" style={{ display: 'block', marginBottom: 6 }}>
          <i className="ti ti-notes" /> Training notes (how to do it right / don't forget to…)
        </span>
        <textarea className="textarea" name="training_notes" rows={2} defaultValue={c?.training_notes || ''} />
      </div>

      <button className="btn btn-primary" type="submit" style={{ marginTop: 14 }}>
        <i className="ti ti-device-floppy" /> {c ? 'Save changes' : 'Add chore'}
      </button>
    </form>
  );
}

function Section({ title, icon, count, children }) {
  return (
    <div className="panel" style={{ overflow: 'hidden', marginBottom: 16 }}>
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
        {title} · {count}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block' }}>
      <span className="label" style={{ display: 'block', marginBottom: 5 }}>{label}</span>
      {children}
    </label>
  );
}

function Empty({ children }) {
  return <div style={{ padding: '14px', fontSize: 13, color: 'var(--muted)' }}>{children}</div>;
}
