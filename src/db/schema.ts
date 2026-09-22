import {
  pgTable,
  uuid,
  varchar,
  numeric,
  integer,
  date,
  timestamp,
  boolean,
  text,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const ipoStatusEnum = pgEnum('ipo_status', [
  'UPCOMING',
  'OPEN',
  'CLOSED',
  'LISTED',
]);

export const ipoCategoryEnum = pgEnum('ipo_category', [
  'MAINBOARD', // Eligible for public listing feeds
  'SME',       // Strictly excluded from public user experience
  'UNKNOWN',   // Held in unverified/staging state; not published
]);

export const verificationStatusEnum = pgEnum('verification_status', [
  'UNVERIFIED',
  'PROVISIONAL',
  'VERIFIED',
]);

// Core Users Table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Profiles Table
export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  displayName: varchar('display_name', { length: 100 }),
  preferences: jsonb('preferences').default({}),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// IPO Main Entity Table
export const ipos = pgTable(
  'ipos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyName: varchar('company_name', { length: 255 }).notNull(),
    symbol: varchar('symbol', { length: 50 }),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    category: ipoCategoryEnum('category').default('UNKNOWN').notNull(),
    status: ipoStatusEnum('status').default('UPCOMING').notNull(),
    priceBandMin: numeric('price_band_min', { precision: 10, scale: 2 }),
    priceBandMax: numeric('price_band_max', { precision: 10, scale: 2 }),
    lotSize: integer('lot_size'),
    issueSizeCrores: numeric('issue_size_crores', { precision: 10, scale: 2 }),
    freshIssueCrores: numeric('fresh_issue_crores', { precision: 10, scale: 2 }),
    ofsCrores: numeric('ofs_crores', { precision: 10, scale: 2 }),
    faceValue: numeric('face_value', { precision: 6, scale: 2 }),
    retailQuotaPercent: numeric('retail_quota_percent', { precision: 5, scale: 2 }),
    qibQuotaPercent: numeric('qib_quota_percent', { precision: 5, scale: 2 }),
    niiQuotaPercent: numeric('nii_quota_percent', { precision: 5, scale: 2 }),
    drhpUrl: text('drhp_url'),
    rhpUrl: text('rhp_url'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_ipos_status_category').on(table.status, table.category),
  ]
);

// IPO Dates Table
export const ipoDates = pgTable('ipo_dates', {
  id: uuid('id').defaultRandom().primaryKey(),
  ipoId: uuid('ipo_id')
    .notNull()
    .references(() => ipos.id, { onDelete: 'cascade' }),
  offerStartDate: date('offer_start_date'),
  offerEndDate: date('offer_end_date'),
  allotmentDate: date('allotment_date'),
  unblockingDate: date('unblocking_date'),
  creditToDematDate: date('credit_to_demat_date'),
  listingDate: date('listing_date'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Data Sources Table
export const dataSources = pgTable('data_sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  providerName: varchar('provider_name', { length: 100 }).notNull().unique(), // 'upstox', 'ipo_guru', 'ipo_alerts'
  isActive: boolean('is_active').default(true).notNull(),
  priorityRank: integer('priority_rank').default(1).notNull(), // lower = higher priority
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Grey Market Premium (GMP) History Table
export const ipoGmpHistory = pgTable(
  'ipo_gmp_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ipoId: uuid('ipo_id')
      .notNull()
      .references(() => ipos.id, { onDelete: 'cascade' }),
    dataSourceId: uuid('data_source_id').references(() => dataSources.id),
    gmpAmount: numeric('gmp_amount', { precision: 10, scale: 2 }).notNull(),
    gmpPercentage: numeric('gmp_percentage', { precision: 6, scale: 2 }).notNull(),
    estimatedListingPrice: numeric('estimated_listing_price', {
      precision: 10,
      scale: 2,
    }),
    sourceTimestamp: timestamp('source_timestamp', { withTimezone: true }).notNull(),
    fetchedTimestamp: timestamp('fetched_timestamp', { withTimezone: true })
      .defaultNow()
      .notNull(),
    verificationStatus: verificationStatusEnum('verification_status')
      .default('UNVERIFIED')
      .notNull(),
    confidenceScore: numeric('confidence_score', { precision: 3, scale: 2 }).default(
      '1.00'
    ),
  },
  (table) => [
    index('idx_gmp_ipo_timestamp').on(table.ipoId, table.sourceTimestamp),
  ]
);

// Subscription History Table (QIB, NII, Retail, Total)
export const ipoSubscriptionHistory = pgTable(
  'ipo_subscription_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ipoId: uuid('ipo_id')
      .notNull()
      .references(() => ipos.id, { onDelete: 'cascade' }),
    dataSourceId: uuid('data_source_id').references(() => dataSources.id),
    snapshotTimestamp: timestamp('snapshot_timestamp', {
      withTimezone: true,
    }).notNull(),
    qibSubscription: numeric('qib_subscription', { precision: 8, scale: 2 }),
    niiSubscription: numeric('nii_subscription', { precision: 8, scale: 2 }),
    bNiiSubscription: numeric('b_nii_subscription', { precision: 8, scale: 2 }), // Big NII (>10L)
    sNiiSubscription: numeric('s_nii_subscription', { precision: 8, scale: 2 }), // Small NII (2L-10L)
    retailSubscription: numeric('retail_subscription', { precision: 8, scale: 2 }),
    employeeSubscription: numeric('employee_subscription', { precision: 8, scale: 2 }),
    shareholderSubscription: numeric('shareholder_subscription', { precision: 8, scale: 2 }),
    totalSubscription: numeric('total_subscription', { precision: 8, scale: 2 }).notNull(),
    fetchedTimestamp: timestamp('fetched_timestamp', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_sub_ipo_timestamp').on(table.ipoId, table.snapshotTimestamp),
  ]
);

// Listing Results & Comparison Table
export const ipoListingResults = pgTable('ipo_listing_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  ipoId: uuid('ipo_id')
    .notNull()
    .unique()
    .references(() => ipos.id, { onDelete: 'cascade' }),
  issuePrice: numeric('issue_price', { precision: 10, scale: 2 }).notNull(),
  listingPrice: numeric('listing_price', { precision: 10, scale: 2 }).notNull(),
  finalGmpBeforeListing: numeric('final_gmp_before_listing', {
    precision: 10,
    scale: 2,
  }),
  gmpVsActualVariance: numeric('gmp_vs_actual_variance', {
    precision: 6,
    scale: 2,
  }),
  listedDate: date('listed_date').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Watchlists Table
export const watchlists = pgTable(
  'watchlists',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ipoId: uuid('ipo_id')
      .notNull()
      .references(() => ipos.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('uniq_watchlist_user_ipo').on(table.userId, table.ipoId),
  ]
);

// Notifications Table
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  ipoId: uuid('ipo_id').references(() => ipos.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  channel: varchar('channel', { length: 20 }).default('WEB_PUSH').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Ingestion Audit Logs Table
export const ingestionLogs = pgTable('ingestion_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  dataSourceId: uuid('data_source_id').references(() => dataSources.id),
  status: varchar('status', { length: 20 }).notNull(), // 'SUCCESS', 'FAILED', 'CONFLICT'
  recordsProcessed: integer('records_processed').default(0),
  details: jsonb('details'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Drizzle Relations
export const iposRelations = relations(ipos, ({ one, many }) => ({
  dates: one(ipoDates, {
    fields: [ipos.id],
    references: [ipoDates.ipoId],
  }),
  gmpHistory: many(ipoGmpHistory),
  subscriptionHistory: many(ipoSubscriptionHistory),
  listingResult: one(ipoListingResults, {
    fields: [ipos.id],
    references: [ipoListingResults.ipoId],
  }),
}));
