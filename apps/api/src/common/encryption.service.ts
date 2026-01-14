import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/**
 * Local copy for API runtime so we don't depend on TS sources from workspace packages.
 * (The repo also has an identical implementation in `packages/core`.)
 */
export class EncryptionService {
  private key: Buffer;

  constructor(secret: string) {
    if (!secret) {
      throw new Error('Encryption secret is required');
    }
    // 32 bytes for aes-256-cbc
    this.key = createHash('sha256').update(secret).digest();
  }

  encrypt(text: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', this.key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  decrypt(text: string): string {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = createDecipheriv('aes-256-cbc', this.key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }
}

