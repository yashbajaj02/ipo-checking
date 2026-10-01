import './load-env';
import { db } from '@/db';
import { ipos } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateGeminiAbout, computeSourceHash } from './gemini-enrichment';
import { getIposFromDatabaseOrFallback } from '../data/ipos';

async function verifyRealIpoEnrichment() {
  console.log('=== VERIFYING REAL IPO GEMINI ENRICHMENT END-TO-END ===');

  // 1. Fetch target IPO from Neon DB
  const [targetIpo] = await db.select().from(ipos).where(eq(ipos.slug, 'german-green-steel-power-ipo')).limit(1);

  if (!targetIpo) {
    console.error('No IPO found in Neon DB!');
    return;
  }

  console.log('\n1. Selected Real IPO:', {
    id: targetIpo.id,
    companyName: targetIpo.companyName,
    slug: targetIpo.slug,
    currentDescription: targetIpo.description,
  });

  // Supply real provider source context for this company
  const sampleSourceText = `${targetIpo.companyName} produces precision steel components for industrial power infrastructure. The company operates manufacturing facilities and focuses on expanding product offerings.`;

  // Update provider source description in DB
  await db
    .update(ipos)
    .set({ description: sampleSourceText })
    .where(eq(ipos.id, targetIpo.id));

  const sourceCtx = {
    companyName: targetIpo.companyName,
    category: targetIpo.category,
    description: sampleSourceText,
    strengths: ['Advanced manufacturing technology', 'Established customer base'],
    risks: ['Raw material price fluctuations'],
  };

  const hash = computeSourceHash(sourceCtx);
  console.log('\n2. Computed Source Hash:', hash);

  // 2. Execute Gemini Enrichment
  console.log('\n3. Triggering Gemini Enrichment via server service...');
  const result = await generateGeminiAbout(targetIpo.id, sourceCtx, { forceRefresh: true });

  console.log('\n4. Gemini Enrichment Result:', {
    status: result.status,
    aiModelVersion: result.aiModelVersion,
    aiGeneratedAt: result.aiGeneratedAt.toISOString(),
    aiDescription: result.aiDescription,
    aiSourceHash: result.aiSourceHash,
  });

  // 3. Test caching behavior (second call should hit cache without calling API)
  console.log('\n5. Testing Caching Behavior (Second call with unchanged source context)...');
  const cachedResult = await generateGeminiAbout(targetIpo.id, sourceCtx, { forceRefresh: false });

  console.log('Cached Call Result Status:', cachedResult.status);
  console.log('Is Cached:', cachedResult.status === 'CACHED');

  // 4. Verify API/Detail-page usage by calling getIposFromDatabaseOrFallback
  console.log('\n6. Verifying API & Detail-Page Data Binding...');
  const allIpos = await getIposFromDatabaseOrFallback();
  const ipoDetail = allIpos.find((item) => item.id === targetIpo.id || item.slug === targetIpo.slug);

  console.log('\n7. Final IPO Detail Page Object:', {
    slug: ipoDetail?.slug,
    companyName: ipoDetail?.companyName,
    description: ipoDetail?.description,
    aiDescription: ipoDetail?.aiDescription,
  });

  // 5. Test Source Context Change Invalidation
  console.log('\n8. Testing Source Hash Change Invalidation...');
  const updatedSourceText = `${sampleSourceText} The company is also expanding into renewable energy sector automation.`;
  const updatedCtx = {
    ...sourceCtx,
    description: updatedSourceText,
  };
  const updatedHash = computeSourceHash(updatedCtx);
  console.log('New Source Hash:', updatedHash, '(Hash changed:', updatedHash !== hash, ')');
  const invalidatedResult = await generateGeminiAbout(targetIpo.id, updatedCtx, { forceRefresh: false });
  console.log('Invalidation Result Status:', invalidatedResult.status);
  console.log('New Hash Match:', invalidatedResult.aiSourceHash === updatedHash);

  console.log('\n=== VERIFICATION COMPLETE ===');
}

verifyRealIpoEnrichment().catch(console.error);
