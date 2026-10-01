import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { neon } from '@neondatabase/serverless';
import { encryptPan, isEncryptedPan } from './pan-crypto';

async function migratePans() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const sql = neon(dbUrl);

  console.log('--- Step 1: Checking schema column type for user_pans.pan_number ---');
  const cols = await sql`
    SELECT column_name, data_type, character_maximum_length 
    FROM information_schema.columns 
    WHERE table_name = 'user_pans' AND column_name = 'pan_number';
  `;

  if (cols.length > 0) {
    const col = cols[0];
    console.log(`Current column type: ${col.data_type} (max length: ${col.character_maximum_length})`);
    if (col.character_maximum_length !== null) {
      console.log('Altering column user_pans.pan_number to TYPE text...');
      await sql`ALTER TABLE "user_pans" ALTER COLUMN "pan_number" TYPE text;`;
      console.log('Column altered successfully to text.');
    } else {
      console.log('Column is already text or unbounded.');
    }
  } else {
    console.log('Table user_pans does not exist or column pan_number not found.');
  }

  console.log('\n--- Step 2: Checking existing records in user_pans ---');
  const records = await sql`SELECT id, pan_number FROM "user_pans";`;
  console.log(`Total records in user_pans: ${records.length}`);

  let alreadyEncrypted = 0;
  let migrated = 0;

  for (const row of records) {
    const storedVal = String(row.pan_number || '');
    if (isEncryptedPan(storedVal)) {
      alreadyEncrypted++;
    } else {
      // Legacy plaintext detected -> migrate to encrypted
      const encrypted = encryptPan(storedVal);
      await sql`
        UPDATE "user_pans"
        SET "pan_number" = ${encrypted}, "updated_at" = NOW()
        WHERE "id" = ${row.id};
      `;
      migrated++;
    }
  }

  console.log(`Already encrypted: ${alreadyEncrypted}`);
  console.log(`Migrated to AES-256-GCM: ${migrated}`);

  console.log('\n--- Step 3: Verifying all records are now encrypted ---');
  const checkRecords = await sql`SELECT id, pan_number FROM "user_pans";`;
  let allEncrypted = true;
  for (const row of checkRecords) {
    if (!isEncryptedPan(String(row.pan_number || ''))) {
      allEncrypted = false;
      break;
    }
  }

  if (allEncrypted) {
    console.log('Verification PASSED: 100% of user_pans records are securely encrypted.');
  } else {
    console.error('Verification FAILED: Unencrypted records still present!');
    process.exit(1);
  }
}

migratePans().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
