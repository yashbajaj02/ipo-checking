import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  getGoogleRedirectUri,
  createSessionRecord,
  SESSION_COOKIE_NAME,
  OAUTH_STATE_COOKIE_NAME,
} from '@/lib/auth';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const incomingState = searchParams.get('state');

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim().replace(/\/+$/, '');

  // Helper to build a redirect response while ensuring the short-lived OAuth state cookie is deleted
  const createRedirectWithError = (errorKey: string) => {
    const res = NextResponse.redirect(
      `${baseUrl}/?tab=settings&auth_error=${encodeURIComponent(errorKey)}`
    );
    res.cookies.delete(OAUTH_STATE_COOKIE_NAME);
    return res;
  };

  // 1. Check for provider-level authorization errors
  if (error) {
    console.error('Google OAuth callback error received from provider:', error);
    return createRedirectWithError(error);
  }

  // 2. Retrieve and validate stored OAuth CSRF state token
  const storedState = req.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value;

  if (!incomingState || !storedState) {
    console.warn('Google OAuth CSRF validation failed: missing incoming or stored state.');
    return createRedirectWithError('missing_oauth_state');
  }

  // Timing-safe or strict equality check
  if (incomingState !== storedState) {
    console.warn('Google OAuth CSRF validation failed: state mismatch (potential CSRF attempt).');
    return createRedirectWithError('invalid_oauth_state');
  }

  // 3. Ensure authorization code is present
  if (!code) {
    console.error('Missing code in Google OAuth callback');
    return createRedirectWithError('missing_code');
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = getGoogleRedirectUri();

    // 4. Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.access_token) {
      console.error('Google token exchange failed:', tokens.error || 'No access token returned');
      return createRedirectWithError('token_exchange_failed');
    }

    // 5. Fetch user profile from Google UserInfo endpoint
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const googleProfile = await profileRes.json();

    if (!googleProfile.email) {
      console.error('No email returned by Google profile endpoint');
      return createRedirectWithError('no_email');
    }

    const email = googleProfile.email.toLowerCase().trim();
    const displayName = googleProfile.name || email.split('@')[0];
    const avatarUrl = googleProfile.picture || null;
    const googleId = googleProfile.id || null;

    // 6. Check if user exists in Neon DB
    let userId: string;
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      userId = existingUser.id;
      // Update profile info
      const [existingProfile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, userId))
        .limit(1);

      if (existingProfile) {
        await db
          .update(profiles)
          .set({
            displayName,
            avatarUrl,
            googleId,
          })
          .where(eq(profiles.userId, userId));
      } else {
        await db.insert(profiles).values({
          userId,
          displayName,
          avatarUrl,
          googleId,
        });
      }
    } else {
      // Create new user & profile in Neon DB
      const [newUser] = await db
        .insert(users)
        .values({ email })
        .returning({ id: users.id });

      userId = newUser.id;

      await db.insert(profiles).values({
        userId,
        displayName,
        avatarUrl,
        googleId,
      });
    }

    // 7. Extract client IP and User-Agent
    const userAgent = req.headers.get('user-agent');
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : null;

    // 8. Create session record in Neon DB
    const sessionToken = await createSessionRecord(userId, userAgent, ipAddress);

    // 9. Redirect to consent gate with session cookie and consume/delete OAuth state cookie
    const response = NextResponse.redirect(`${baseUrl}/consent`);
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      sameSite: 'lax',
    });

    // Invalidate state cookie immediately to prevent replay attacks
    response.cookies.delete(OAUTH_STATE_COOKIE_NAME);

    return response;
  } catch (err) {
    console.error('Google OAuth callback exception:', err);
    return createRedirectWithError('server_exception');
  }
}
