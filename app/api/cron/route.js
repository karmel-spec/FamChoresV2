import { generateAssignments, todayStr } from '@/lib/chores';
import { NextResponse } from 'next/server';

// Hit this once a day at noon (e.g. via cron / a scheduler) to assign the day's batch.
// Safe to call repeatedly — it won't duplicate unless ?force=1 is passed.
export async function GET(request) {
  const force = new URL(request.url).searchParams.get('force') === '1';
  const date = todayStr();
  const result = generateAssignments(date, { force });
  return NextResponse.json({ date, ...result });
}

export const dynamic = 'force-dynamic';
