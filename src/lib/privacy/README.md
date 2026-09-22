# PAN Privacy & Local Client Vault (Security-Sensitive Boundary)

> [!CAUTION]
> **DO NOT IMPLEMENT WITHOUT EXPLICIT SECURITY REVIEW SIGN-OFF**
> In accordance with ADR-004 and ADR-009, user Permanent Account Numbers (PANs) must NEVER be persisted to the backend PostgreSQL database or logged in application telemetry.

## Module Scope & Non-Negotiable Boundaries

1. **Zero Database Retention:**
   - There must never be a `user_pans` table or a column storing PAN in PostgreSQL.
2. **Stateless Allotment Execution:**
   - Any future allotment checking routine receives user PANs ephemerally in transient RAM only, proxies the request to the registrar, and immediately purges memory buffers.
3. **Client-Side Key Management (Future Web Vault):**
   - Cryptographic Primitive: Web Crypto API `PBKDF2` (>= 100,000 iterations with SHA-256) deriving 256-bit `AES-GCM` key.
   - Storage Rule: Derived keys reside strictly in transient session memory (never in `localStorage` or `IndexedDB`).
   - Zero-Knowledge Loss Policy: Recovery is intentionally impossible if the user forgets their local unlock PIN.
4. **Current Status:**
   - This module is intentionally decoupled and un-implemented for the MVP foundation.
