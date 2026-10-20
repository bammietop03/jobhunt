import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionToken, passwordMatches, sessionIsValid, SESSION_MAX_AGE } from '../src/lib/auth';

test('password login and signed session validity', () => {
  const oldPassword = process.env.APP_PASSWORD;
  const oldSecret = process.env.CRON_SECRET;
  try {
    process.env.APP_PASSWORD = 'a private test password';
    process.env.CRON_SECRET = 'a separate test secret';
    const now = Date.UTC(2026, 9, 20);
    assert.equal(passwordMatches('a private test password'), true);
    assert.equal(passwordMatches('wrong password'), false);
    const token = createSessionToken(now);
    assert.equal(sessionIsValid(token, now), true);
    assert.equal(sessionIsValid(token.slice(0, -1) + (token.endsWith('0') ? '1' : '0'), now), false);
    assert.equal(sessionIsValid(token, now + (SESSION_MAX_AGE + 1) * 1000), false);
    process.env.APP_PASSWORD = 'a changed password';
    assert.equal(sessionIsValid(token, now), false);
  } finally {
    if (oldPassword === undefined) delete process.env.APP_PASSWORD;
    else process.env.APP_PASSWORD = oldPassword;
    if (oldSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = oldSecret;
  }
});
