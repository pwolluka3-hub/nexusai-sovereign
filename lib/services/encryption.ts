import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Recommended for GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Encryption service for sensitive user secrets.
 * Uses AES-256-GCM for authenticated encryption.
 */
export const EncryptionService = {
  /**
   * Encrypts a plaintext string.
   * @param plaintext The sensitive value to encrypt.
   * @returns A string in the format `iv:authTag:encryptedValue` (base64 encoded).
   */
  encrypt(plaintext: string): string {
    const encryptionKey = process.env.SECRET_ENCRYPTION_KEY;
    if (!encryptionKey || encryptionKey.length !== 32) {
      throw new Error('SECRET_ENCRYPTION_KEY must be exactly 32 characters long.');
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(encryptionKey), iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag().toString('base64');
    
    return `${iv.toString('base64')}:${authTag}:${encrypted}`;
  },

  /**
   * Decrypts a ciphertext string.
   * @param ciphertext The encrypted value in format `iv:authTag:encryptedValue`.
   * @returns The decrypted plaintext string.
   */
  decrypt(ciphertext: string): string {
    const encryptionKey = process.env.SECRET_ENCRYPTION_KEY;
    if (!encryptionKey || encryptionKey.length !== 32) {
      throw new Error('SECRET_ENCRYPTION_KEY must be exactly 32 characters long.');
    }

    const [ivBase64, authTagBase64, encryptedBase64] = ciphertext.split(':');
    if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
      throw new Error('Invalid ciphertext format. Expected iv:authTag:encryptedValue');
    }

    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    const encryptedValue = Buffer.from(encryptedBase64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(encryptionKey), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedValue, 'binary', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  },

  /**
   * Safe decryption that handles both plaintext (legacy) and encrypted values.
   */
  decryptSafe(value: string): string {
    if (!value) return '';
    
    // Check if it matches the encrypted format (three base64 components)
    if (value.split(':').length === 3) {
      try {
        return this.decrypt(value);
      } catch (e) {
        // If decryption fails, we treat it as plaintext or an invalid secret
        return value;
      }
    }
    
    // Fallback to plaintext for legacy data
    return value;
  }
};
