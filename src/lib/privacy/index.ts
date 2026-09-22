/**
 * Architectural Boundary: PAN Privacy & Local Vault
 *
 * NOTE: Implementation is intentionally deferred in accordance with ADR-004 & ADR-009.
 * This file defines the type contracts for future client-side modules.
 * Plaintext PANs must NEVER be transmitted to or stored in the database.
 */

export interface EphemeralAllotmentLookupRequest {
  ipoSlug: string;
  // Transient PAN payload - parsed in RAM, never logged, never stored in DB
  panNumber: string;
}

export interface EphemeralAllotmentLookupResponse {
  status: 'ALLOTTED' | 'NOT_ALLOTTED' | 'AWAITING_RESULT' | 'INVALID_QUERY';
  sharesAllotted: number;
  appliedLots: number;
  refundAmount?: number;
  checkedAt: string;
}
