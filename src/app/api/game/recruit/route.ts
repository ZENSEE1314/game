/**
 * POST /api/game/recruit
 * Body: { state, count }
 * Returns: { state, success, reason? }
 */
import { NextRequest, NextResponse } from 'next/server';
import type { GameState } from '@/lib/game/types';
import { doRecruitTroops } from '@/lib/game/actions';

export async function POST(req: NextRequest) {
  try {
    const { state, count } = (await req.json()) as { state: GameState; count: number };
    if (!state || !count) {
      return NextResponse.json({ success: false, reason: 'Missing state or count' }, { status: 400 });
    }
    const result = doRecruitTroops(state, Math.floor(count));
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ success: false, reason: 'Invalid request' }, { status: 400 });
  }
}
