# Database Design & Relational Schema: Neon PostgreSQL

## 1. Engine & Strategy Overview

- **Engine:** Neon Serverless PostgreSQL (`@neondatabase/serverless`).
- **ORM / Query Builder:** Drizzle ORM.
- **Cost Target:** Operates within Neon's Free Tier (0.5 GiB storage, serverless compute hours).
- **Category Support:** Fully supports **BOTH Mainboard and SME IPOs** via the `ipo_category` enum.
- **Privacy Directive:** **Strictly NO `user_pans` table.** No user PAN numbers are ever stored in the database.

---

## 2. Relational Entity Overview

```
                        ┌───────────┐
                        │   users   │
                        └─────┬─────┘
                              │ 1:1
                        ┌─────┴─────┐
                        │  profiles │
                        └─────┬─────┘
                              │ 1:N
                        ┌─────┴─────┐
                        │ watchlists│
                        └───────────┘

 ┌─────────────────────────────────────────────────────────────┐
 │                            ipos                             │
 │   (id, company_name, slug, category, status, price_band)    │
 │   category: 'MAINBOARD' | 'SME' | 'UNKNOWN'                 │
 └──────┬──────────────┬──────────────┬──────────────┬─────────┘
        │ 1:1          │ 1:N          │ 1:N          │ 1:1
 ┌──────┴──────┐ ┌─────┴──────┐ ┌─────┴──────┐ ┌─────┴──────┐
 │  ipo_dates  │ │ipo_gmp_hist│ │ipo_sub_hist│ │ipo_listing │
 └─────────────┘ └────────────┘ └────────────┘ └────────────┘

 ┌─────────────────────────────────────────────────────────────┐
 │                        data_sources                         │
 └──────────────────────────────┬──────────────────────────────┘
                                │ 1:N
 ┌──────────────────────────────┴──────────────────────────────┐
 │                       ingestion_logs                        │
 └─────────────────────────────────────────────────────────────┘
```

---

## 3. Table Definitions & Constraints

### 3.1 `ipos`
The master record for IPO issues (Mainboard and SME).
- `id` (UUID, Primary Key, Default: `gen_random_uuid()`)
- `company_name` (VARCHAR 255, NOT NULL)
- `symbol` (VARCHAR 50)
- `slug` (VARCHAR 255, UNIQUE, NOT NULL)
- `category` (ENUM: `'MAINBOARD'`, `'SME'`, `'UNKNOWN'`, Default: `'UNKNOWN'`, NOT NULL)
  - *Query & Publishing Rules:*
    - When `category=MAINBOARD` (default): `WHERE category = 'MAINBOARD'`.
    - When `category=SME`: `WHERE category = 'SME'`.
    - When `category=ALL`: `WHERE category IN ('MAINBOARD', 'SME')`.
    - Rows with `category = 'UNKNOWN'` are quarantined and **never** returned in public listing queries.
- `status` (ENUM: `'UPCOMING'`, `'OPEN'`, `'CLOSED'`, `'LISTED'`, Default: `'UPCOMING'`, NOT NULL)
- `price_band_min` (NUMERIC 10,2)
- `price_band_max` (NUMERIC 10,2)
- `lot_size` (INT)
- `min_investment` (Generated Column: `price_band_max * lot_size`)
- `issue_size_crores` (NUMERIC 10,2)
- `fresh_issue_crores` (NUMERIC 10,2)
- `ofs_crores` (NUMERIC 10,2)
- `face_value` (NUMERIC 6,2)
- `retail_quota_percent` (NUMERIC 5,2)
- `qib_quota_percent` (NUMERIC 5,2)
- `nii_quota_percent` (NUMERIC 5,2)
- `drhp_url` (TEXT)
- `rhp_url` (TEXT)
- `created_at`, `updated_at` (TIMESTAMPTZ, Default: `NOW()`)

### 3.2 `ipo_dates`
Key milestones in the IPO offer timeline.
- `id` (UUID, Primary Key)
- `ipo_id` (UUID, NOT NULL, REFERENCES `ipos(id)` ON DELETE CASCADE)
- `offer_start_date` (DATE)
- `offer_end_date` (DATE)
- `allotment_date` (DATE)
- `unblocking_date` (DATE)
- `credit_to_demat_date` (DATE)
- `listing_date` (DATE)
- `updated_at` (TIMESTAMPTZ, Default: `NOW()`)

### 3.3 `data_sources`
Registry of external data providers.
- `id` (UUID, Primary Key)
- `provider_name` (VARCHAR 100, UNIQUE, NOT NULL) - e.g. `'upstox'`, `'ipo_guru'`, `'ipo_alerts'`
- `is_active` (BOOLEAN, Default: `TRUE`, NOT NULL)
- `priority_rank` (INT, Default: `1`, NOT NULL)
- `created_at` (TIMESTAMPTZ, Default: `NOW()`)

### 3.4 `ipo_gmp_history`
Non-official Grey Market Premium observations for Mainboard and SME issues.
- `id` (UUID, Primary Key)
- `ipo_id` (UUID, NOT NULL, REFERENCES `ipos(id)` ON DELETE CASCADE)
- `data_source_id` (UUID, REFERENCES `data_sources(id)`)
- `gmp_amount` (NUMERIC 10,2, NOT NULL)
- `gmp_percentage` (NUMERIC 6,2, NOT NULL)
- `estimated_listing_price` (NUMERIC 10,2)
- `source_timestamp` (TIMESTAMPTZ, NOT NULL)
- `fetched_timestamp` (TIMESTAMPTZ, Default: `NOW()`, NOT NULL)
- `verification_status` (ENUM: `'UNVERIFIED'`, `'PROVISIONAL'`, `'VERIFIED'`, Default: `'UNVERIFIED'`)
- `confidence_score` (NUMERIC 3,2, Default: `1.00`)

### 3.5 `ipo_subscription_history`
Bidding subscription snapshots.
- `id` (UUID, Primary Key)
- `ipo_id` (UUID, NOT NULL, REFERENCES `ipos(id)` ON DELETE CASCADE)
- `data_source_id` (UUID, REFERENCES `data_sources(id)`)
- `snapshot_timestamp` (TIMESTAMPTZ, NOT NULL)
- `qib_subscription`, `nii_subscription`, `b_nii_subscription`, `s_nii_subscription`, `retail_subscription`, `employee_subscription`, `shareholder_subscription`, `total_subscription` (NUMERIC 8,2)
- `fetched_timestamp` (TIMESTAMPTZ, Default: `NOW()`, NOT NULL)

### 3.6 `ipo_listing_results`
Post-listing opening performance and GMP variance.
- `id` (UUID, Primary Key)
- `ipo_id` (UUID, UNIQUE, NOT NULL, REFERENCES `ipos(id)` ON DELETE CASCADE)
- `issue_price`, `listing_price` (NUMERIC 10,2, NOT NULL)
- `listing_gain_loss_amount` (Generated: `listing_price - issue_price`)
- `listing_gain_loss_percent` (Generated: `((listing_price - issue_price) / issue_price) * 100`)
- `final_gmp_before_listing` (NUMERIC 10,2)
- `gmp_vs_actual_variance` (NUMERIC 6,2)
- `listed_date` (DATE, NOT NULL)
- `created_at` (TIMESTAMPTZ, Default: `NOW()`)

### 3.7 `watchlists`, `notifications`, `ingestion_logs`
- `watchlists`: User-saved IPOs (Mainboard or SME).
- `notifications`: Alert subscriptions.
- `ingestion_logs`: Audit trails for provider fetches.

---

## 4. Privacy Prohibition Directive

> [!CAUTION]
> **STRICT BAN ON `user_pans` TABLE:** Under no circumstances will a `user_pans` table or equivalent column storing Permanent Account Numbers be created in this database. Storing PANs on the backend violates our zero-retention privacy architecture.

---

## 5. Performance Indexes

```sql
CREATE INDEX idx_ipos_status_category ON ipos(status, category);
CREATE INDEX idx_gmp_ipo_timestamp ON ipo_gmp_history(ipo_id, source_timestamp DESC);
CREATE INDEX idx_sub_ipo_timestamp ON ipo_subscription_history(ipo_id, snapshot_timestamp DESC);
```
