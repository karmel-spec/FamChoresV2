'use server';

import getDb from './db';
import { generateAssignments, todayStr, setSetting, ensureToday } from './chores';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import path from 'node:path';
import fs from 'node:fs';
import { UPLOAD_DIR } from './paths';
import { getSetting } from './chores';
import { expectedToken, getParentPasscode, PARENT_COOKIE, COOKIE_OPTS } from './auth';

function revalidateAll() {
  revalidatePath('/', 'layout');
}

// ---------- assignments ----------
export async function toggleAssignment(formData) {
  const id = Number(formData.get('id'));
  const db = getDb();
  const row = db.prepare('SELECT completed FROM assignments WHERE id = ?').get(id);
  if (!row) return;
  const next = row.completed ? 0 : 1;
  db.prepare('UPDATE assignments SET completed = ?, completed_at = ? WHERE id = ?').run(
    next,
    next ? new Date().toISOString() : null,
    id
  );
  revalidateAll();
}

// ---------- rotation ----------
export async function runRotationToday() {
  generateAssignments(todayStr(), { force: true });
  revalidateAll();
}

export async function ensureTodayAction() {
  ensureToday();
  revalidateAll();
}

// ---------- children ----------
async function savePhoto(file) {
  if (!file || typeof file === 'string' || file.size === 0) return null;
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
  const fname = `child_${Date.now()}_${Math.floor(buf.length % 100000)}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, fname), buf);
  return `/media/${fname}`;
}

export async function addChild(formData) {
  const db = getDb();
  const name = (formData.get('name') || '').toString().trim();
  if (!name) return;
  const color = (formData.get('color') || '#185FA5').toString();
  const budget = Number(formData.get('minute_budget')) || 45;
  const maxSort = db.prepare('SELECT COALESCE(MAX(sort), -1) AS m FROM children').get().m;
  const photo = await savePhoto(formData.get('photo'));
  db.prepare(
    'INSERT INTO children (name, color, minute_budget, photo, sort) VALUES (?, ?, ?, ?, ?)'
  ).run(name, color, budget, photo, maxSort + 1);
  revalidateAll();
}

export async function updateChild(formData) {
  const db = getDb();
  const id = Number(formData.get('id'));
  const child = db.prepare('SELECT * FROM children WHERE id = ?').get(id);
  if (!child) return;
  const name = (formData.get('name') || child.name).toString().trim();
  const color = (formData.get('color') || child.color).toString();
  const budget = Number(formData.get('minute_budget')) || child.minute_budget;
  const fineRaw = formData.get('fine_rate');
  const fine_rate = fineRaw === null || fineRaw === '' ? null : parseFloat(fineRaw);
  const photo = (await savePhoto(formData.get('photo'))) || child.photo;
  db.prepare(
    'UPDATE children SET name = ?, color = ?, minute_budget = ?, fine_rate = ?, photo = ? WHERE id = ?'
  ).run(name, color, budget, fine_rate, photo, id);
  revalidateAll();
}

export async function deleteChild(formData) {
  const db = getDb();
  const id = Number(formData.get('id'));
  db.prepare('DELETE FROM children WHERE id = ?').run(id);
  db.prepare('DELETE FROM chore_eligibility WHERE child_id = ?').run(id);
  db.prepare('DELETE FROM assignments WHERE child_id = ?').run(id);
  revalidateAll();
}

// ---------- settings ----------
export async function setHomeHeaderPhoto(formData) {
  const photo = await savePhoto(formData.get('photo'));
  if (photo) setSetting('home_header_photo', photo);
  revalidateAll();
}

export async function removeHomeHeaderPhoto() {
  setSetting('home_header_photo', '');
  revalidateAll();
}

export async function setGlobalFineRate(formData) {
  const rate = parseFloat(formData.get('global_fine_rate')) || 0;
  setSetting('global_fine_rate', rate.toFixed(2));
  revalidateAll();
}

// ---------- chores ----------
function parseChoreForm(formData) {
  const days = formData.getAll('days').map(Number);
  let mask = 0;
  days.forEach((d) => (mask |= 1 << d));
  if (mask === 0) mask = 127;
  return {
    title: (formData.get('title') || '').toString().trim(),
    category: (formData.get('category') || 'General').toString().trim() || 'General',
    minutes: Number(formData.get('minutes')) || 10,
    difficulty: (formData.get('difficulty') || 'easy').toString(),
    frequency: (formData.get('frequency') || 'daily').toString(),
    weekday:
      formData.get('frequency') === 'weekly' ? Number(formData.get('weekday')) || 0 : null,
    days_mask: mask,
    chore_type: (formData.get('chore_type') || 'rotating').toString(),
    assigned_child_id: formData.get('assigned_child_id')
      ? Number(formData.get('assigned_child_id'))
      : null,
    training_notes: (formData.get('training_notes') || '').toString(),
  };
}

function saveEligibility(db, choreId, formData) {
  db.prepare('DELETE FROM chore_eligibility WHERE chore_id = ?').run(choreId);
  const ids = formData.getAll('eligible').map(Number);
  const ins = db.prepare(
    'INSERT OR IGNORE INTO chore_eligibility (chore_id, child_id) VALUES (?, ?)'
  );
  ids.forEach((cid) => ins.run(choreId, cid));
}

export async function addChore(formData) {
  const db = getDb();
  const c = parseChoreForm(formData);
  if (!c.title) return;
  const maxSort = db.prepare('SELECT COALESCE(MAX(sort), -1) AS m FROM chores').get().m;
  const info = db
    .prepare(
      `INSERT INTO chores (title, category, minutes, difficulty, frequency, weekday, days_mask, chore_type, assigned_child_id, training_notes, active, sort)
       VALUES (@title, @category, @minutes, @difficulty, @frequency, @weekday, @days_mask, @chore_type, @assigned_child_id, @training_notes, 1, @sort)`
    )
    .run({ ...c, sort: maxSort + 1 });
  saveEligibility(db, info.lastInsertRowid, formData);
  revalidateAll();
}

export async function updateChore(formData) {
  const db = getDb();
  const id = Number(formData.get('id'));
  const exists = db.prepare('SELECT id FROM chores WHERE id = ?').get(id);
  if (!exists) return;
  const c = parseChoreForm(formData);
  db.prepare(
    `UPDATE chores SET title=@title, category=@category, minutes=@minutes, difficulty=@difficulty,
       frequency=@frequency, weekday=@weekday, days_mask=@days_mask, chore_type=@chore_type,
       assigned_child_id=@assigned_child_id, training_notes=@training_notes WHERE id=@id`
  ).run({ ...c, id });
  saveEligibility(db, id, formData);
  revalidateAll();
}

export async function deleteChore(formData) {
  const db = getDb();
  const id = Number(formData.get('id'));
  db.prepare('DELETE FROM chores WHERE id = ?').run(id);
  db.prepare('DELETE FROM chore_eligibility WHERE chore_id = ?').run(id);
  revalidateAll();
}

export async function toggleChoreActive(formData) {
  const db = getDb();
  const id = Number(formData.get('id'));
  const row = db.prepare('SELECT active FROM chores WHERE id = ?').get(id);
  if (!row) return;
  db.prepare('UPDATE chores SET active = ? WHERE id = ?').run(row.active ? 0 : 1, id);
  revalidateAll();
}

// ---------- parent auth ----------
export async function parentLogin(formData) {
  const entered = (formData.get('passcode') || '').toString();
  if (entered && entered === getParentPasscode()) {
    cookies().set(PARENT_COOKIE, expectedToken(), COOKIE_OPTS);
    redirect('/parent');
  }
  redirect('/parent-login?e=1');
}

export async function parentLogout() {
  cookies().delete(PARENT_COOKIE);
  redirect('/');
}

export async function setParentPasscode(formData) {
  const next = (formData.get('passcode') || '').toString().trim();
  if (next.length >= 3) {
    setSetting('parent_passcode', next);
    // keep the current session valid by re-issuing the cookie for the new passcode
    cookies().set(PARENT_COOKIE, expectedToken(), COOKIE_OPTS);
  }
  revalidateAll();
  redirect('/parent/settings');
}
