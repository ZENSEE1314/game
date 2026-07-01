/**
 * POST /api/ads/conscription
 * Body: { state, troopsLost }
 * Returns: { state } — with 25% of lost troops restored.
 */
import { NextRequest, NextResponse } from 'next/server';
import type { GameState } from '@/lib/game/types';
import { doConscriptionAd } from '@/lib/game/actions';

export async function POST(req: NextRequest) {
  try {
    const { state, troopsLost } = (await req.json()) as { state: GameState; troopsLost: number };
    if (!state || typeof troopsLost !== 'number') {
      return NextResponse.json({ success: false, reason: 'Missing parameters' }, { status: 400 });
    }
    const next = doConscriptionAd(state, troopsLost);
    return NextResponse.json({ state: next });
  } catch (e) {
    return NextResponse.json({ success: false, reason: 'Invalid request' }, { status: 400 });
  }
}
