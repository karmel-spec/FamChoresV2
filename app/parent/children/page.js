import { listChildren, globalFineRate } from '@/lib/chores';
import { addChild, updateChild, deleteChild } from '@/lib/actions';
import { Avatar, Shell, ParentNav } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default function ChildrenPage() {
  const children = listChildren();
  const gRate = globalFineRate();

  return (
    <Shell title="Children" subtitle="Profiles, photos, time budgets and fine overrides">
      <ParentNav active="/parent/children" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {children.map((c) => (
          <div key={c.id} className="panel" style={{ padding: 16 }}>
            <form action={updateChild}>
              <input type="hidden" name="id" value={c.id} />
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <Avatar child={c} size={64} rounded={14} />
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 12 }}>
                    <Field label="Name">
                      <input className="input" name="name" defaultValue={c.name} />
                    </Field>
                    <Field label="Color">
                      <input className="input" type="color" name="color" defaultValue={c.color} style={{ height: 38, padding: 4 }} />
                    </Field>
                    <Field label="Daily minute budget">
                      <input className="input" type="number" name="minute_budget" defaultValue={c.minute_budget} min={0} />
                    </Field>
                    <Field label={`Fine rate (blank = $${gRate.toFixed(2)})`}>
                      <input className="input" type="number" step="0.25" name="fine_rate" defaultValue={c.fine_rate ?? ''} placeholder={gRate.toFixed(2)} />
                    </Field>
                    <Field label="Profile photo">
                      <input className="input" type="file" name="photo" accept="image/*" style={{ padding: 6 }} />
                    </Field>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button className="btn btn-primary" type="submit">
                      <i className="ti ti-device-floppy" /> Save
                    </button>
                  </div>
                </div>
              </div>
            </form>
            <form action={deleteChild} style={{ marginTop: 10 }}>
              <input type="hidden" name="id" value={c.id} />
              <button className="btn btn-danger" type="submit" style={{ padding: '5px 10px', fontSize: 13 }}>
                <i className="ti ti-trash" /> Remove {c.name}
              </button>
            </form>
          </div>
        ))}
      </div>

      <div className="panel" style={{ padding: 16, marginTop: 18 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 12px' }}>
          <i className="ti ti-user-plus" /> Add a child
        </h2>
        <form action={addChild}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 12 }}>
            <Field label="Name">
              <input className="input" name="name" placeholder="Child's name" required />
            </Field>
            <Field label="Color">
              <input className="input" type="color" name="color" defaultValue="#185FA5" style={{ height: 38, padding: 4 }} />
            </Field>
            <Field label="Daily minute budget">
              <input className="input" type="number" name="minute_budget" defaultValue={45} min={0} />
            </Field>
            <Field label="Profile photo">
              <input className="input" type="file" name="photo" accept="image/*" style={{ padding: 6 }} />
            </Field>
          </div>
          <button className="btn btn-primary" type="submit" style={{ marginTop: 14 }}>
            <i className="ti ti-plus" /> Add child
          </button>
        </form>
      </div>
    </Shell>
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
