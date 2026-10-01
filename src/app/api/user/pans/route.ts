import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userPans } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth';
import { encryptPan, decryptPan, maskPan } from '@/lib/security/pan-crypto';

export async function GET(req: NextRequest) {
  try {
    const authData = await getAuthenticatedUser(req.cookies);
    if (!authData) {
      return NextResponse.json({ error: 'unauthorized', pans: [] }, { status: 401 });
    }
    if (!authData.hasConsented) {
      return NextResponse.json({ error: 'consent_required', requiresConsent: true, pans: [] }, { status: 403 });
    }

    const records = await db
      .select({
        id: userPans.id,
        holderName: userPans.holderName,
        panNumber: userPans.panNumber,
        createdAt: userPans.createdAt,
      })
      .from(userPans)
      .where(eq(userPans.userId, authData.user.id))
      .orderBy(desc(userPans.createdAt));

    const pans = records.map((r) => {
      let plainPan = '';
      try {
        plainPan = decryptPan(r.panNumber);
      } catch (err) {
        console.error('[PAN] Decryption error for record id:', r.id);
      }
      return {
        id: r.id,
        holderName: r.holderName,
        maskedPan: maskPan(plainPan),
        createdAt: r.createdAt,
      };
    });

    return NextResponse.json({ pans });
  } catch (err) {
    console.error('PANs GET error:', err);
    return NextResponse.json({ error: 'server_error', pans: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authData = await getAuthenticatedUser(req.cookies);
    if (!authData) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    if (!authData.hasConsented) {
      return NextResponse.json({ error: 'consent_required', requiresConsent: true }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const holderName = typeof body.holderName === 'string' ? body.holderName.trim() : '';
    const panNumber = typeof body.panNumber === 'string' ? body.panNumber.trim().toUpperCase() : '';

    if (!holderName) {
      return NextResponse.json({ error: 'Holder name is required' }, { status: 400 });
    }

    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(panNumber)) {
      return NextResponse.json({ error: 'Invalid PAN format. Must be 10 characters (e.g. ABCDE1234F)' }, { status: 400 });
    }

    // Encrypt PAN before persisting to database
    const encryptedPan = encryptPan(panNumber);

    const [inserted] = await db
      .insert(userPans)
      .values({
        userId: authData.user.id,
        holderName,
        panNumber: encryptedPan,
      })
      .returning();

    return NextResponse.json({
      success: true,
      pan: {
        id: inserted.id,
        holderName: inserted.holderName,
        maskedPan: maskPan(panNumber),
        createdAt: inserted.createdAt,
      },
    });
  } catch (err) {
    console.error('PAN POST error:', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authData = await getAuthenticatedUser(req.cookies);
    if (!authData) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    if (!authData.hasConsented) {
      return NextResponse.json({ error: 'consent_required', requiresConsent: true }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const id = body.id;
    const holderName = typeof body.holderName === 'string' ? body.holderName.trim() : '';
    const panNumber = typeof body.panNumber === 'string' ? body.panNumber.trim().toUpperCase() : '';

    if (!id || !holderName) {
      return NextResponse.json({ error: 'ID and holder name required' }, { status: 400 });
    }

    const updateData: { holderName: string; panNumber?: string; updatedAt: Date } = {
      holderName,
      updatedAt: new Date(),
    };

    if (panNumber) {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(panNumber)) {
        return NextResponse.json({ error: 'Invalid PAN format' }, { status: 400 });
      }
      // Encrypt PAN before updating database
      updateData.panNumber = encryptPan(panNumber);
    }

    await db
      .update(userPans)
      .set(updateData)
      .where(and(eq(userPans.id, id), eq(userPans.userId, authData.user.id)));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PAN PUT error:', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
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
    const id = body.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await db
      .delete(userPans)
      .where(and(eq(userPans.id, id), eq(userPans.userId, authData.user.id)));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PAN DELETE error:', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
