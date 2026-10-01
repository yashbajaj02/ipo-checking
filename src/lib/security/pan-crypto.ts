import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for AES-GCM
const PREFIX = 'enc_v1:';

/**
 * Derives a 32-byte (256-bit) encryption key from the server environment variable PAN_ENCRYPTION_KEY.
 * Accepts:
 * - 64-character hex string (32 bytes)
 * - 32-byte base64 encoded string
 * - Deterministic SHA-256 derivation for arbitrary passphrase
 */
function getEncryptionKey(): Buffer {
  const rawKey = process.env.PAN_ENCRYPTION_KEY;
  if (!rawKey || !rawKey.trim()) {
    throw new Error('PAN_ENCRYPTION_KEY server environment variable is not configured');
  }

  const trimmed = rawKey.trim();

  // 1. Direct 64-character hex string (32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }

  // 2. Base64 32-byte key
  try {
    const b64 = Buffer.from(trimmed, 'base64');
    if (b64.length === 32) {
      return b64;
    }
  } catch {
    // Ignore and fallback
  }

  // 3. Deterministic SHA-256 derivation
  return crypto.createHash('sha256').update(trimmed).digest();
}

/**
 * Checks whether a given string is an authenticated encrypted payload.
 */
export function isEncryptedPan(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.startsWith(PREFIX);
}

/**
 * Encrypts a plaintext PAN using AES-256-GCM.
 * Output format: enc_v1:<iv_hex>:<tag_hex>:<ciphertext_hex>
 * Plaintext is never logged or leaked.
 */
export function encryptPan(plainPan: string): string {
  if (!plainPan || typeof plainPan !== 'string') {
    throw new Error('PAN to encrypt must be a non-empty string');
  }

  const cleanPan = plainPan.trim().toUpperCase();
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(cleanPan, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts an AES-256-GCM encrypted PAN payload.
 * If the value is legacy plaintext (unencrypted), it safely returns the plaintext without throwing.
 */
export function decryptPan(storedValue: string): string {
  if (!storedValue || typeof storedValue !== 'string') {
    return '';
  }

  if (!isEncryptedPan(storedValue)) {
    // Legacy plaintext support for seamless migration
    return storedValue;
  }

  const payload = storedValue.slice(PREFIX.length);
  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted PAN payload');
  }

  const [ivHex, tagHex, cipherHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(cipherHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Securely formats a masked PAN string for display.
 * Example: ABCDE1234F -> ABCDE****F
 */
export function maskPan(pan: string): string {
  if (!pan || pan.length < 10) return 'XXXXXXXXXX';
  return `${pan.slice(0, 5)}****${pan.slice(9)}`;
}
