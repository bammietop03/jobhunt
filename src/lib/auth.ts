import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'jobhunt_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function signingKey(): Buffer | null {
  const password = process.env.APP_PASSWORD;
  if (!password) return null;
  return createHash('sha256')
    .update('jobhunt-session-v1\0')
    .update(password)
    .update('\0')
    .update(process.env.CRON_SECRET ?? '')
    .digest();
}

export function passwordIsConfigured(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

export function passwordMatches(input: string): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;
  const actualBytes = Buffer.from(input);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

export function createSessionToken(now = Date.now()): string {
  const key = signingKey();
  if (!key) throw new Error('APP_PASSWORD is not configured');
  const payload = `v1.${Math.floor(now / 1000) + SESSION_MAX_AGE}`;
  const signature = createHmac('sha256', key).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

export function sessionIsValid(token: string | undefined, now = Date.now()): boolean {
  const key = signingKey();
  if (!key || !token) return false;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1' || !/^\d{10}$/.test(parts[1]) || !/^[a-f0-9]{64}$/.test(parts[2])) return false;
  const expires = Number(parts[1]);
  if (!Number.isSafeInteger(expires) || expires <= Math.floor(now / 1000) || expires > Math.floor(now / 1000) + SESSION_MAX_AGE) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  const actual = Buffer.from(parts[2], 'hex');
  const expected = createHmac('sha256', key).update(payload).digest();
  return timingSafeEqual(actual, expected);
}

