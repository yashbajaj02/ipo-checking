import './load-env';
import { db } from '@/db';
import { ipos, ipoDates, ipoGmpHistory, ipoSubscriptionHistory, ipoListingResults, ipoActionScores } from '@/db/schema';
import { inArray } from 'drizzle-orm';

async function inspectDependents() {
  const fakeSlugs = ['test-alerts-ipo-ltd', 'mock-company-ltd', 'mock-static-ipo-ltd'];

  const fakeIpos = await db.select().from(ipos).where(inArray(ipos.slug, fakeSlugs));
  console.log('Confirmed Fake IPO Records in Neon:', fakeIpos.length);

  const fakeIds = fakeIpos.map((i) => i.id);

  if (fakeIds.length > 0) {
    const dates = await db.select().from(ipoDates).where(inArray(ipoDates.ipoId, fakeIds));
    const gmp = await db.select().from(ipoGmpHistory).where(inArray(ipoGmpHistory.ipoId, fakeIds));
    const subs = await db.select().from(ipoSubscriptionHistory).where(inArray(ipoSubscriptionHistory.ipoId, fakeIds));
    const listings = await db.select().from(ipoListingResults).where(inArray(ipoListingResults.ipoId, fakeIds));
    const scores = await db.select().from(ipoActionScores).where(inArray(ipoActionScores.ipoId, fakeIds));

    console.log('Dependent child rows to clean up:');
    console.log(`- ipo_dates: ${dates.length}`);
    console.log(`- ipo_gmp_history: ${gmp.length}`);
    console.log(`- ipo_subscription_history: ${subs.length}`);
    console.log(`- ipo_listing_results: ${listings.length}`);
    console.log(`- ipo_action_scores: ${scores.length}`);
  }
}

inspectDependents().catch(console.error);
