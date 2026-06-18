# Family Chores

A daily-rotating family chore app (Concept D — "Command Center" design). Built with Next.js
(App Router) and SQLite. Chores rotate among children each day, balanced by time budget and
difficulty, with a parent admin backend and per-child dashboards.

Deployed on Railway as an always-on Node server with a persistent volume (see deploy steps below).

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

## Deploying to Railway (with persistent data)

The app runs as a normal Node server, so it keeps full functionality (SQLite, photo uploads,
noon scheduler). To make data survive redeploys, give it a persistent volume:

1. **New Project → Deploy from GitHub repo** → pick `karmel-spec/FamChoresV2`. Railway
   auto-detects Next.js (`npm run build` / `npm start`).
2. In the service, add a **Volume** and set its **mount path** to `/data`.
3. In **Variables**, add `DATA_DIR=/data`.
4. Deploy. Every push to `main` auto-deploys; the database and uploaded photos live on the
   volume and persist across deploys.

`DATA_DIR` controls where everything is stored — see `.env.example`.

### Daily noon rotation in production

The in-process scheduler runs on the always-on server. As a belt-and-suspenders option you can
also add a Railway **Cron** that hits `GET /api/cron` at noon.

## Notes

- Data lives in `${DATA_DIR}/chores.db` (SQLite, defaults to `./data` locally). Delete it to
  reset to the seed.
- Uploaded photos are stored in `${DATA_DIR}/uploads/` and served via `/media/<file>`.
