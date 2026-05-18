import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const SECRET_PREFIX = 'enc:v1';
const DEV_ENCRYPTION_KEY = 'eco-loom-local-encryption-key-change-me';

function getEncryptionKey() {
  const material =
    process.env.ECO_LOOM_ENCRYPTION_KEY ||
    process.env.ECO_LOOM_AUTH_SECRET ||
    (process.env.NODE_ENV !== 'production' ? DEV_ENCRYPTION_KEY : '');

  if (!material) {
    throw new Error('ECO_LOOM_ENCRYPTION_KEY is required in production');
  }

  return createHash('sha256').update(material).digest();
}

export function isEncryptedSecret(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith(`${SECRET_PREFIX}:`));
}

export function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${SECRET_PREFIX}:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
}

export function decryptSecret(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  if (!isEncryptedSecret(value)) {
    return value;
  }

  const parts = value.split(':');
  const [prefix, version, iv, tag, encrypted] = parts;
  if (
    parts.length !== 5 ||
    `${prefix}:${version}` !== SECRET_PREFIX ||
    !iv ||
    !tag ||
    !encrypted
  ) {
    throw new Error('Invalid encrypted secret format');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(iv, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64url')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
