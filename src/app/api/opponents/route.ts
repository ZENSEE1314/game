/**
 * GET /api/opponents?level=N
 * Returns: { opponents } — a freshly generated NPC roster.
 */
import { NextRequest, NextResponse } from 'next/server';
import { generateOpponents } from '@/lib/game/initial-state';

export async function GET(req: NextRequest) {
  const level = Number(req.nextUrl.searchParams.get('level') ?? '1');
  const opponents = generateOpponents(Math.max(1, Math.floor(level)));
  return NextResponse.json({ opponents });
}
