import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userSessions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthenticatedUser, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authData = await getAuthenticatedUser(req.cookies);
    if (!authData) {
      return NextResponse.json({ user: null, hasConsented: false });
    }
    return NextResponse.json({
      user: authData.user,
      hasConsented: authData.hasConsented,
    });
  } catch (err) {
    console.error('Session GET error:', err);
    return NextResponse.json({ user: null, hasConsented: false });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body.action === 'logout') {
      const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
      if (token) {
        await db.delete(userSessions).where(eq(userSessions.id, token));
      }
      const res = NextResponse.json({ success: true });
      res.cookies.delete(SESSION_COOKIE_NAME);
      return res;
    }
    return NextResponse.json({ success: false });
  } catch (err) {
    console.error('Session POST error:', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
