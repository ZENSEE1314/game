/**
 * POST /api/pvp/attack
 * Body: { state, opponentId, opponents }
 * Returns: { state, success, reason?, result?, opponent?, opponents? }
 *
 * The authoritative PvP resolver. Runs the combat engine server-side
 * and returns the post-battle state + battle result.
 */
import { NextRequest, NextResponse } from 'next/server';
import type { GameState, Opponent } from '@/lib/game/types';
import { doAttack } from '@/lib/game/actions';

export async function POST(req: NextRequest) {
  try {
    const { state, opponentId, opponents } = (await req.json()) as {
      state: GameState;
      opponentId: string;
      opponents: Opponent[];
    };
    if (!state || !opponentId || !opponents) {
      return NextResponse.json({ success: false, reason: 'Missing parameters' }, { status: 400 });
    }
    const result = doAttack(state, opponentId, opponents);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ success: false, reason: 'Invalid request' }, { status: 400 });
  }
}
