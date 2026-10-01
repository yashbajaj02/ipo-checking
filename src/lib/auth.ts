import { db } from '@/db';
import { users, profiles, userSessions } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  hasConsented: boolean;
}

export const SESSION_COOKIE_NAME = 'ipo_session_token';
export const OAUTH_STATE_COOKIE_NAME = 'ipo_oauth_state';

export const CURRENT_TERMS_VERSION = '1.0';
export const CURRENT_PRIVACY_VERSION = '1.0';

/**
 * Determine the exact Google OAuth Redirect URI.
 * Priority:
 * 1. GOOGLE_REDIRECT_URI env var (if explicitly set for local/production)
 * 2. NEXT_PUBLIC_APP_URL + /api/auth/callback/google
 * 3. Default http://localhost:3000/api/auth/callback/google
 */
export function getGoogleRedirectUri(): string {
  if (process.env.GOOGLE_REDIRECT_URI && process.env.GOOGLE_REDIRECT_URI.trim()) {
    return process.env.GOOGLE_REDIRECT_URI.trim();
  }
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim().replace(/\/+$/, '');
  return `${appUrl}/api/auth/callback/google`;
}

/**
 * Helper to parse a user agent string into human-readable device name and type.
 * Never invents fake devices or locations.
 */
export function parseDeviceFromUserAgent(uaString: string | null): {
  deviceType: 'mobile' | 'laptop' | 'desktop';
  deviceName: string;
} {
  if (!uaString) {
    return { deviceType: 'desktop', deviceName: 'Unknown Device' };
  }

  const ua = uaString.toLowerCase();
  let browser = 'Browser';
  if (ua.includes('edg/')) browser = 'Edge';
  else if (ua.includes('chrome/')) browser = 'Chrome';
  else if (ua.includes('safari/') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('firefox/')) browser = 'Firefox';

  let os = 'Unknown OS';
  let deviceType: 'mobile' | 'laptop' | 'desktop' = 'desktop';

  if (ua.includes('android')) {
    os = 'Android';
    deviceType = 'mobile';
  } else if (ua.includes('iphone') || ua.includes('ipad')) {
    os = ua.includes('ipad') ? 'iPad' : 'iPhone';
    deviceType = 'mobile';
  } else if (ua.includes('windows')) {
    os = 'Windows';
    deviceType = 'laptop';
  } else if (ua.includes('macintosh') || ua.includes('mac os')) {
    os = 'macOS';
    deviceType = 'laptop';
  } else if (ua.includes('linux')) {
    os = 'Linux';
    deviceType = 'desktop';
  }

  return {
    deviceType,
    deviceName: `${browser} on ${os}`,
  };
}

/**
 * Retrieve authenticated user and active session record from Neon PostgreSQL.
 */
export async function getAuthenticatedUser(requestCookies?: { get: (name: string) => { value: string } | undefined }): Promise<{
  user: AuthUser;
  sessionId: string;
  hasConsented: boolean;
} | null> {
  const cookieStore = requestCookies || (await cookies());
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const now = new Date();
    // Look up active unexpired session
    const [session] = await db
      .select()
      .from(userSessions)
      .where(and(eq(userSessions.id, token), gt(userSessions.expiresAt, now)))
      .limit(1);

    if (!session) return null;

    // Look up user & profile
    const [userRecord] = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        termsVersion: profiles.termsVersion,
        privacyVersion: profiles.privacyVersion,
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!userRecord) return null;

    const hasConsented =
      userRecord.termsVersion === CURRENT_TERMS_VERSION &&
      userRecord.privacyVersion === CURRENT_PRIVACY_VERSION;

    // Update last active timestamp
    await db
      .update(userSessions)
      .set({ lastActiveAt: new Date() })
      .where(eq(userSessions.id, token));

    return {
      user: {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.displayName || userRecord.email.split('@')[0],
        picture: userRecord.avatarUrl,
        hasConsented,
      },
      sessionId: session.id,
      hasConsented,
    };
  } catch (err) {
    console.error('getAuthenticatedUser error:', err);
    return null;
  }
}

/**
 * Record server-side user consent acceptance for current Terms & Privacy versions.
 */
export async function recordUserConsent(userId: string): Promise<void> {
  const now = new Date();
  await db
    .update(profiles)
    .set({
      termsAcceptedAt: now,
      termsVersion: CURRENT_TERMS_VERSION,
      privacyAcceptedAt: now,
      privacyVersion: CURRENT_PRIVACY_VERSION,
    })
    .where(eq(profiles.userId, userId));
}

/**
 * Create a new verified user session in Neon DB.
 */
export async function createSessionRecord(
  userId: string,
  userAgent: string | null,
  ipAddress: string | null
): Promise<string> {
  const token = crypto.randomUUID();
  const parsed = parseDeviceFromUserAgent(userAgent);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await db.insert(userSessions).values({
    id: token,
    userId,
    deviceType: parsed.deviceType,
    deviceName: parsed.deviceName,
    userAgent: userAgent || null,
    ipAddress: ipAddress || null,
    createdAt: now,
    lastActiveAt: now,
    expiresAt,
  });

  return token;
}
