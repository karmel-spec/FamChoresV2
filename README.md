# Family Chores

A daily-rotating family chore app (Concept D — "Command Center" design). Built with Next.js
(App Router) and SQLite. Chores rotate among children each day, balanced by time budget and
difficulty, with a parent admin backend and per-child dashboards.

## Run it

```bash
cd family-chores
npm install      # already done if you cloned with node_modules
npm run dev      # http://localhost:3000
```

Open http://localhost:3000 — pick a child to see their dashboard, or go to **Parent admin**.

The first run seeds the database (`data/chores.db`):
- 3 example children (Avery, Ellie, Max) — edit/replace them in **Parent admin → Children**
- 3 priority chores (brush teeth, make bed, get dressed & tidy room)
- ~30 common household rotating chores with minute estimates, difficulty, schedule, and
  training notes.

## What's built

**Child dashboard** (`/child/[id]`)
- Profile photo, stat tiles (completed, time left, time until noon), progress bar, status chip.
- **Priority tasks** (same every day) shown first, then **family contribution** (rotated today).
- Tap the circle to mark a chore done. Each chore has an expandable "How to do it" with the
  parent's training notes. Fine warning if not done by noon.

**Parent admin** (`/parent`)
- **Overview** — per-child completion, minutes, status, and fines owed today; "Run rotation now".
- **Children** — add/edit/remove kids, set color, **daily minute budget**, per-child fine
  override, and **upload a profile photo**.
- **Chore list** — the master list. Add/edit/delete chores, toggle each **on/off** (keep it in
  the list without assigning it), set minutes, difficulty, daily/weekly + which day(s), who can
  be assigned (or force to one child), priority vs. rotating, and **training notes**.
- **Settings** — default fine rate (charged per unfinished chore after noon) and a summary of
  per-child overrides.

## How rotation works

- A new batch is generated **every day at noon** by an in-process scheduler
  (`instrumentation.js` → `lib/scheduler.js`). It also generates on first visit each day, so the
  batch always exists.
- Priority chores go to their assigned children every day.
- Rotating chores due that day are distributed to eligible children, greedily balancing each
  child's assigned minutes toward their **daily minute budget**, with a day-based offset so who
  gets what shifts day to day. Forced assignments are honored first.
- External scheduler hook: `GET /api/cron` (add `?force=1` to regenerate). Point a real cron job
  at it if you deploy.

## Fines

After noon, an incomplete chore counts toward a fine: `incomplete chores × fine rate`
(per-child override, else the global default). Shown on each child's dashboard and totaled on the
parent overview.

## Notes

- Data lives in `data/chores.db` (SQLite). Delete it to reset to the seed.
- Uploaded photos are stored in `public/uploads/`.
