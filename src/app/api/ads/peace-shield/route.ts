/**
 * POST /api/ads/peace-shield
 * Body: { state }
 * Returns: { state } — with a 3-hour shield applied.
 */
import { NextRequest, NextResponse } from 'next/server';
import type { GameState } from '@/lib/game/types';
import { doPeaceShieldAd } from '@/lib/game/actions';

export async function POST(req: NextRequest) {
  try {
    const { state } = (await req.json()) as { state: GameState };
    if (!state) {
      return NextResponse.json({ success: false, reason: 'Missing state' }, { status: 400 });
    }
    const next = doPeaceShieldAd(state);
    return NextResponse.json({ state: next });
  } catch (e) {
    return NextResponse.json({ success: false, reason: 'Invalid request' }, { status: 400 });
  }
}
