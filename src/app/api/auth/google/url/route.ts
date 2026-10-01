import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getGoogleRedirectUri, OAUTH_STATE_COOKIE_NAME } from '@/lib/auth';

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = getGoogleRedirectUri();

  if (!clientId) {
    return NextResponse.json({ error: 'Missing GOOGLE_CLIENT_ID' }, { status: 500 });
  }

  // 1. Generate cryptographically random OAuth state token
  const state = crypto.randomBytes(32).toString('hex');

  // 2. Build Google OAuth authorization URL containing the state token
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state,
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  // 3. Return authorization URL and set short-lived HttpOnly state cookie
  const response = NextResponse.json({ url });
  response.cookies.set(OAUTH_STATE_COOKIE_NAME, state, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60, // 10 minutes short-lived TTL
    sameSite: 'lax',
  });

  return response;
}
