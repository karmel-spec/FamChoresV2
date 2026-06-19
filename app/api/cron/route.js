import { generateAssignments, todayStr } from '@/lib/chores';
import { NextResponse } from 'next/server';

// Hit this once a day at noon (e.g. via cron / a scheduler) to assign the day's batch.
// Safe to call repeatedly — it won't duplicate unless ?force=1 is passed.
export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const force = params.get('force') === '1';
  // Optional ?date=YYYY-MM-DD to (re)generate a specific day; defaults to today.
  const dateParam = params.get('date');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateParam || '') ? dateParam : todayStr();
  const result = generateAssignments(date, { force });
  return NextResponse.json({ date, ...result });
}

export const dynamic = 'force-dynamic';
