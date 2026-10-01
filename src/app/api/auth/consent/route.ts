import { NextResponse } from 'next/server';
import { getAuthenticatedUser, recordUserConsent, SESSION_COOKIE_NAME } from '@/lib/auth';
import { db } from '@/db';
import { userSessions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { accept } = body;

    if (accept === true) {
      // Record consent acceptance server-side
      await recordUserConsent(authResult.user.id);
      return NextResponse.json({
        success: true,
        hasConsented: true,
        message: 'Consent recorded successfully',
      });
    } else {
      // Decline behavior: invalidate session from DB & clear cookie
      await db.delete(userSessions).where(eq(userSessions.id, authResult.sessionId));

      const res = NextResponse.json({
        success: true,
        declined: true,
        message: 'Consent declined. Session invalidated.',
      });

      res.cookies.set(SESSION_COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        expires: new Date(0),
      });

      return res;
    }
  } catch (err) {
    console.error('Consent processing error:', err);
    return NextResponse.json({ error: 'Failed to process consent' }, { status: 500 });
  }
}
