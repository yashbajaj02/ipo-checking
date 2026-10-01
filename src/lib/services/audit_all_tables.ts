import './load-env';
import { db } from '@/db';
import { users, userPans, userSessions, dataSources, ingestionLogs, ipos } from '@/db/schema';
import { sql } from 'drizzle-orm';

async function auditAllTables() {
  console.log('=== FULL NEON DATABASE AUDIT ===');
  const userList = await db.select().from(users);
  const panList = await db.select().from(userPans);
  const sessionList = await db.select().from(userSessions);
  const dsList = await db.select().from(dataSources);
  const ipoList = await db.select().from(ipos);

  console.log(`Users count: ${userList.length}`);
  console.log(`User PANs count: ${panList.length}`);
  console.log(`User Sessions count: ${sessionList.length}`);
  console.log(`Data Sources count: ${dsList.length}`);
  console.log(`IPOs count: ${ipoList.length}`);

  // Check if any PAN or user is fake/test
  console.log('\nUser PAN Records (Preserved):');
  for (const p of panList) {
    console.log(`- Holder: ${p.holderName}, Updated: ${p.updatedAt}`);
  }

  console.log('\nData Sources:');
  for (const ds of dsList) {
    console.log(`- ID: ${ds.id}, Provider: ${ds.providerName}, Priority: ${ds.priorityRank}`);
  }
}

auditAllTables().catch(console.error);
