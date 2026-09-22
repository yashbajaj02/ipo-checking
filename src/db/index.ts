import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

/**
 * Architectural Notes on Database Connection:
 * 1. Uses Neon's Serverless HTTP driver via @neondatabase/serverless.
 * 2. HTTP queries avoid exhausting PostgreSQL connection limits in ephemeral Vercel serverless lambdas.
 * 3. Connection string is read strictly from process.env.DATABASE_URL (never hardcoded).
 * 4. Built for ₹0/month free-tier operation.
 */

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Graceful notice during build or initial unconfigured setup
  if (process.env.NEXT_PHASE !== 'phase-production-build') {
    console.info('ℹ️ [Neon DB] DATABASE_URL is not set. Database queries require configuration in .env.local.');
  }
}

// Neon HTTP driver instance with fallback dummy URL to avoid build-time crashes when DATABASE_URL is unconfigured
const sql = neon(connectionString || 'postgres://placeholder:placeholder@localhost:5432/stub');

export const db = drizzle(sql, { schema });
export type DatabaseInstance = typeof db;

/**
 * Helper to check if database configuration is present
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech'));
}
