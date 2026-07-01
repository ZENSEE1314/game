/**
 * POST /api/game/offline
 * Body: { state }
 * Returns: { earnings }  — computed but NOT applied (client applies,
 *   optionally after the 2x ad).
 *
 * This lets the server compute offline earnings from the client's
 * last_saved_at, so the client doesn't need to trust its own clock.
 */
import { NextRequest, NextResponse } from 'next/server';
import type { GameState } from '@/lib/game/types';
import { calculate_offline_earnings } from '@/lib/game/engine';

export async function POST(req: NextRequest) {
  try {
    const { state } = (await req.json()) as { state: GameState };
    if (!state) {
      return NextResponse.json({ success: false, reason: 'Missing state' }, { status: 400 });
    }
    const now = Date.now();
    const deltaSec = Math.max(0, (now - state.last_saved_at) / 1000);
    const earnings = calculate_offline_earnings(state, deltaSec);
    return NextResponse.json({ earnings });
  } catch (e) {
    return NextResponse.json({ success: false, reason: 'Invalid request' }, { status: 400 });
  }
}
