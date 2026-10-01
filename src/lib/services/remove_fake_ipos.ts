import './load-env';
import { db } from '@/db';
import { ipos, ipoDates, ipoGmpHistory, ipoSubscriptionHistory, ipoListingResults, ipoActionScores } from '@/db/schema';
import { inArray, eq } from 'drizzle-orm';

async function removeFakeIpos() {
  console.log('=== REMOVING CONFIRMED SYNTHETIC/TEST RECORDS FROM NEON DB ===');

  const fakeSlugs = ['test-alerts-ipo-ltd', 'mock-company-ltd', 'mock-static-ipo-ltd'];

  const fakeIpos = await db.select().from(ipos).where(inArray(ipos.slug, fakeSlugs));
  console.log(`Found ${fakeIpos.length} confirmed fake IPO records to delete.`);

  if (fakeIpos.length === 0) {
    console.log('No fake IPO records found in Neon DB.');
    return;
  }

  const fakeIds = fakeIpos.map((i) => i.id);

  // 1. Remove dependent child records for these fake IDs
  const deletedScores = await db.delete(ipoActionScores).where(inArray(ipoActionScores.ipoId, fakeIds)).returning({ id: ipoActionScores.id });
  const deletedListings = await db.delete(ipoListingResults).where(inArray(ipoListingResults.ipoId, fakeIds)).returning({ id: ipoListingResults.id });
  const deletedSubs = await db.delete(ipoSubscriptionHistory).where(inArray(ipoSubscriptionHistory.ipoId, fakeIds)).returning({ id: ipoSubscriptionHistory.id });
  const deletedGmp = await db.delete(ipoGmpHistory).where(inArray(ipoGmpHistory.ipoId, fakeIds)).returning({ id: ipoGmpHistory.id });
  const deletedDates = await db.delete(ipoDates).where(inArray(ipoDates.ipoId, fakeIds)).returning({ id: ipoDates.id });

  console.log(`Deleted dependent child rows:`);
  console.log(`- ipo_action_scores: ${deletedScores.length}`);
  console.log(`- ipo_listing_results: ${deletedListings.length}`);
  console.log(`- ipo_subscription_history: ${deletedSubs.length}`);
  console.log(`- ipo_gmp_history: ${deletedGmp.length}`);
  console.log(`- ipo_dates: ${deletedDates.length}`);

  // 2. Remove confirmed fake parent IPO rows
  const deletedIpos = await db.delete(ipos).where(inArray(ipos.id, fakeIds)).returning({ id: ipos.id, slug: ipos.slug, name: ipos.companyName });

  console.log(`\nSuccessfully removed ${deletedIpos.length} fake IPO parent records:`);
  for (const item of deletedIpos) {
    console.log(`- [${item.id}] ${item.slug} (${item.name})`);
  }

  // 3. Verify total remaining real IPOs in Neon
  const remainingReal = await db.select().from(ipos);
  console.log(`\nRemaining Real IPOs in Neon DB: ${remainingReal.length}`);
}

removeFakeIpos().catch(console.error);
