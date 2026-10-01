import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userSessions } from '@/db/schema';
import { eq, and, gt, desc } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authData = await getAuthenticatedUser(req.cookies);
    if (!authData) {
      return NextResponse.json({ error: 'unauthorized', sessions: [] }, { status: 401 });
    }
    if (!authData.hasConsented) {
      return NextResponse.json({ error: 'consent_required', requiresConsent: true, sessions: [] }, { status: 403 });
    }

    const now = new Date();
    const records = await db
      .select({
        id: userSessions.id,
        deviceType: userSessions.deviceType,
        deviceName: userSessions.deviceName,
        createdAt: userSessions.createdAt,
        lastActiveAt: userSessions.lastActiveAt,
      })
      .from(userSessions)
      .where(and(eq(userSessions.userId, authData.user.id), gt(userSessions.expiresAt, now)))
      .orderBy(desc(userSessions.lastActiveAt));

    const sessions = records.map((s) => ({
      id: s.id,
      deviceType: s.deviceType,
      deviceName: s.deviceName,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
      isCurrent: s.id === authData.sessionId,
    }));

    return NextResponse.json({ sessions });
  } catch (err) {
    console.error('Sessions GET error:', err);
    return NextResponse.json({ error: 'server_error', sessions: [] }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authData = await getAuthenticatedUser(req.cookies);
    if (!authData) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    if (!authData.hasConsented) {
      return NextResponse.json({ error: 'consent_required', requiresConsent: true }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const sessionId = body.sessionId;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Server-side invalidation of the specified session
    await db
      .delete(userSessions)
      .where(and(eq(userSessions.id, sessionId), eq(userSessions.userId, authData.user.id)));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Session DELETE error:', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
