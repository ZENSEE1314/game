/**
 * POST /api/game/upgrade-weapon-tier
 * Body: { state }
 * Returns: { state, success, reason? }
 */
import { NextRequest, NextResponse } from 'next/server';
import type { GameState } from '@/lib/game/types';
import { doUpgradeWeaponTier } from '@/lib/game/actions';

export async function POST(req: NextRequest) {
  try {
    const { state } = (await req.json()) as { state: GameState };
    if (!state) {
      return NextResponse.json({ success: false, reason: 'Missing state' }, { status: 400 });
    }
    const result = doUpgradeWeaponTier(state);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ success: false, reason: 'Invalid request' }, { status: 400 });
  }
}
