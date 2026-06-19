import Database from 'better-sqlite3';
import fs from 'node:fs';
import { DATA_DIR, DB_PATH } from './paths';

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let db;

function getDb() {
  if (db) return db;
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  migrate(db);
  seedIfEmpty(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS children (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#185FA5',
      photo TEXT,
      minute_budget INTEGER DEFAULT 45,
      fine_rate REAL,
      sort INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS chores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'General',
      minutes INTEGER DEFAULT 10,
      difficulty TEXT DEFAULT 'easy',
      frequency TEXT DEFAULT 'daily',
      weekday INTEGER,
      days_mask INTEGER DEFAULT 127,
      chore_type TEXT DEFAULT 'rotating',
      active INTEGER DEFAULT 1,
      assigned_child_id INTEGER,
      training_notes TEXT,
      sort INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS chore_eligibility (
      chore_id INTEGER NOT NULL,
      child_id INTEGER NOT NULL,
      UNIQUE(chore_id, child_id)
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      child_id INTEGER NOT NULL,
      chore_id INTEGER NOT NULL,
      source TEXT NOT NULL,
      minutes INTEGER DEFAULT 0,
      difficulty TEXT,
      title TEXT,
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      fined INTEGER DEFAULT 0,
      fine_amount REAL DEFAULT 0,
      UNIQUE(date, child_id, chore_id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS rotation_log (
      date TEXT PRIMARY KEY,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS unassigned_chores (
      date TEXT NOT NULL,
      chore_id INTEGER NOT NULL,
      title TEXT,
      minutes INTEGER DEFAULT 0,
      difficulty TEXT,
      UNIQUE(date, chore_id)
    );
  `);
}

function seedIfEmpty(db) {
  const choreCount = db.prepare('SELECT COUNT(*) AS c FROM chores').get().c;
  if (choreCount === 0) seedChores(db);

  const childCount = db.prepare('SELECT COUNT(*) AS c FROM children').get().c;
  if (childCount === 0) seedChildren(db);

  const fine = db.prepare('SELECT value FROM settings WHERE key = ?').get('global_fine_rate');
  if (!fine) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('global_fine_rate', '1.00');
  }

  const pass = db.prepare('SELECT value FROM settings WHERE key = ?').get('parent_passcode');
  if (!pass) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('parent_passcode', '1234');
  }
}

function seedChildren(db) {
  const ins = db.prepare(
    'INSERT INTO children (name, color, minute_budget, sort) VALUES (?, ?, ?, ?)'
  );
  const kids = [
    ['Avery', '#185FA5', 45],
    ['Ellie', '#1D9E75', 40],
    ['Max', '#D85A30', 35],
  ];
  kids.forEach((k, i) => ins.run(k[0], k[1], k[2], i));

  // Seed a few default priority chores assigned to all kids
  const priority = [
    ['Brush teeth', 'Personal', 2, 'easy'],
    ['Make bed', 'Bedroom', 5, 'easy'],
    ['Get dressed & tidy room', 'Bedroom', 10, 'easy'],
  ];
  const insP = db.prepare(
    `INSERT INTO chores (title, category, minutes, difficulty, frequency, days_mask, chore_type, training_notes, sort)
     VALUES (?, ?, ?, ?, 'daily', 127, 'priority', ?, ?)`
  );
  priority.forEach((p, i) => {
    insP.run(p[0], p[1], p[2], p[3], '', i);
  });
}

function seedChores(db) {
  const ins = db.prepare(
    `INSERT INTO chores (title, category, minutes, difficulty, frequency, weekday, days_mask, chore_type, training_notes, sort)
     VALUES (@title, @category, @minutes, @difficulty, @frequency, @weekday, @days_mask, 'rotating', @notes, @sort)`
  );

  const ALL = 127;
  const list = [
    // Kitchen
    { title: 'Unload the dishwasher', category: 'Kitchen', minutes: 10, difficulty: 'easy', frequency: 'daily', notes: 'Put everything back in its proper spot. Hot dishes may still be warm — handle carefully.' },
    { title: 'Load the dishwasher', category: 'Kitchen', minutes: 10, difficulty: 'easy', frequency: 'daily', notes: 'Scrape food into the trash first. Don\'t overcrowd; add detergent.' },
    { title: 'Wipe down kitchen counters', category: 'Kitchen', minutes: 8, difficulty: 'easy', frequency: 'daily', notes: 'Clear items, spray cleaner, wipe with a clean cloth. Don\'t forget around the stove.' },
    { title: 'Sweep the kitchen floor', category: 'Kitchen', minutes: 10, difficulty: 'easy', frequency: 'daily', notes: 'Get under the table and into the corners. Empty dustpan into the trash.' },
    { title: 'Take out the trash & recycling', category: 'Kitchen', minutes: 8, difficulty: 'easy', frequency: 'daily', notes: 'Replace the liner. Recycling goes in the blue bin — rinse containers.' },
    { title: 'Clean out the refrigerator', category: 'Kitchen', minutes: 20, difficulty: 'medium', frequency: 'weekly', weekday: 6, notes: 'Toss expired food, wipe shelves. Check the produce drawer.' },
    { title: 'Mop the kitchen floor', category: 'Kitchen', minutes: 15, difficulty: 'medium', frequency: 'weekly', weekday: 6, notes: 'Sweep first. Use warm water with floor cleaner; wring the mop well.' },

    // Bathroom
    { title: 'Wipe the bathroom sink & mirror', category: 'Bathroom', minutes: 8, difficulty: 'easy', frequency: 'daily', notes: 'Glass cleaner on the mirror, all-purpose on the sink. Wipe faucet handles too.' },
    { title: 'Clean the toilet', category: 'Bathroom', minutes: 10, difficulty: 'medium', frequency: 'weekly', weekday: 6, notes: 'Bowl cleaner inside, brush it, then wipe the seat and base with disinfectant.' },
    { title: 'Scrub the shower / tub', category: 'Bathroom', minutes: 20, difficulty: 'hard', frequency: 'weekly', weekday: 6, notes: 'Spray cleaner, let it sit 5 min, then scrub. Rinse well.' },
    { title: 'Restock toilet paper & towels', category: 'Bathroom', minutes: 5, difficulty: 'easy', frequency: 'weekly', weekday: 0, notes: 'Check the supply closet. Hang fresh hand towels.' },

    // Living areas
    { title: 'Vacuum the living room', category: 'Living areas', minutes: 15, difficulty: 'medium', frequency: 'daily', notes: 'Pick up toys first. Get the edges and under cushions.' },
    { title: 'Dust the surfaces', category: 'Living areas', minutes: 12, difficulty: 'easy', frequency: 'weekly', weekday: 3, notes: 'Use a microfiber cloth. Lift items rather than dusting around them.' },
    { title: 'Tidy & organize the living room', category: 'Living areas', minutes: 10, difficulty: 'easy', frequency: 'daily', notes: 'Fold blankets, fluff pillows, put away anything that doesn\'t belong.' },
    { title: 'Vacuum the stairs & hallway', category: 'Living areas', minutes: 15, difficulty: 'medium', frequency: 'weekly', weekday: 6, notes: 'Use the hose attachment on the stair edges.' },
    { title: 'Water the houseplants', category: 'Living areas', minutes: 8, difficulty: 'easy', frequency: 'weekly', weekday: 1, notes: 'Check the soil first — only water if dry. Don\'t overwater.' },

    // Laundry
    { title: 'Start a load of laundry', category: 'Laundry', minutes: 8, difficulty: 'easy', frequency: 'daily', notes: 'Sort lights and darks. Measure detergent; don\'t overload.' },
    { title: 'Fold & put away laundry', category: 'Laundry', minutes: 20, difficulty: 'medium', frequency: 'daily', notes: 'Fold straight from the dryer to avoid wrinkles. Match the socks.' },
    { title: 'Change & remake bed sheets', category: 'Laundry', minutes: 15, difficulty: 'medium', frequency: 'weekly', weekday: 6, notes: 'Strip the bed, put sheets in the wash, remake with fresh ones.' },

    // Bedroom
    { title: 'Clean & organize bedroom', category: 'Bedroom', minutes: 20, difficulty: 'medium', frequency: 'weekly', weekday: 6, notes: 'Clear the floor, put clothes away, clear the desk surface.' },

    // Pets
    { title: 'Feed the pets', category: 'Pets', minutes: 5, difficulty: 'easy', frequency: 'daily', notes: 'Use the correct scoop. Fresh water in the bowl every time.' },
    { title: 'Walk the dog', category: 'Pets', minutes: 20, difficulty: 'medium', frequency: 'daily', notes: 'Bring a waste bag. Stay on the usual route.' },
    { title: 'Clean the litter box / cage', category: 'Pets', minutes: 10, difficulty: 'medium', frequency: 'daily', notes: 'Wear gloves. Scoop daily; full change weekly.' },

    // Outdoor
    { title: 'Take bins to the curb', category: 'Outdoor', minutes: 8, difficulty: 'easy', frequency: 'weekly', weekday: 1, notes: 'Night before pickup. Bins go to the curb with wheels toward the house.' },
    { title: 'Water the garden / yard', category: 'Outdoor', minutes: 15, difficulty: 'easy', frequency: 'weekly', weekday: 2, notes: 'Early morning or evening is best. Don\'t water the leaves in full sun.' },
    { title: 'Rake leaves / sweep porch', category: 'Outdoor', minutes: 20, difficulty: 'medium', frequency: 'weekly', weekday: 6, notes: 'Bag the leaves. Sweep the front steps and walkway.' },
    { title: 'Mow the lawn', category: 'Outdoor', minutes: 40, difficulty: 'hard', frequency: 'weekly', weekday: 6, notes: 'Only with a parent present. Clear toys and rocks from the grass first.' },

    // Meals / general
    { title: 'Set the table for dinner', category: 'Meals', minutes: 8, difficulty: 'easy', frequency: 'daily', notes: 'One plate, fork, knife, napkin, and glass per person.' },
    { title: 'Clear & wipe the table after meals', category: 'Meals', minutes: 8, difficulty: 'easy', frequency: 'daily', notes: 'Bring dishes to the sink, wipe crumbs, push in the chairs.' },
    { title: 'Help make dinner', category: 'Meals', minutes: 25, difficulty: 'medium', frequency: 'daily', notes: 'Wash hands first. Follow the recipe and ask before using the stove.' },
    { title: 'Empty all the small trash cans', category: 'General', minutes: 10, difficulty: 'easy', frequency: 'weekly', weekday: 1, notes: 'Bedrooms, bathrooms, office. Replace liners.' },
  ];

  list.forEach((c, i) => {
    ins.run({
      title: c.title,
      category: c.category,
      minutes: c.minutes,
      difficulty: c.difficulty,
      frequency: c.frequency,
      weekday: c.weekday ?? null,
      days_mask: ALL,
      notes: c.notes || '',
      sort: i,
    });
  });
}

export default getDb;
