/**
 * POST /api/game/upgrade
 * Body: { state: GameState, facility: keyof FacilityLevels }
 * Returns: { state, success, reason? }
 *
 * Stateless server-side facility upgrade. The client owns the state;
 * the server is a trusted rules engine that returns the transformed
 * state on success.
 */
import { NextRequest, NextResponse } from 'next/server';
import type { GameState } from '@/lib/game/types';
import { doUpgradeFacility } from '@/lib/game/actions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { state, facility } = body as { state: GameState; facility: keyof GameState['facilities'] };
    if (!state || !facility) {
      return NextResponse.json({ success: false, reason: 'Missing state or facility' }, { status: 400 });
    }
    const result = doUpgradeFacility(state, facility);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ success: false, reason: 'Invalid request' }, { status: 400 });
  }
}
