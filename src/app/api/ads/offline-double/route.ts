/**
 * POST /api/ads/offline-double
 * Body: { earnings }
 * Returns: { earnings } — the doubled earnings.
 */
import { NextRequest, NextResponse } from 'next/server';
import type { OfflineEarnings } from '@/lib/game/types';
import { doOfflineDoubleAd } from '@/lib/game/actions';

export async function POST(req: NextRequest) {
  try {
    const { earnings } = (await req.json()) as { earnings: OfflineEarnings };
    if (!earnings) {
      return NextResponse.json({ success: false, reason: 'Missing earnings' }, { status: 400 });
    }
    const doubled = doOfflineDoubleAd(earnings);
    return NextResponse.json({ earnings: doubled });
  } catch (e) {
    return NextResponse.json({ success: false, reason: 'Invalid request' }, { status: 400 });
  }
}
