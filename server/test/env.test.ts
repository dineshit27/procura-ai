import assert from 'node:assert/strict';
import { env, envSchema, validateEnv, getPayPalConfig } from '../src/config/env.js';

console.log('🧪 Starting Procura AI Environment Configuration Test Suite...\n');

let testsPassed = 0;
let testsFailed = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(err);
    testsFailed++;
  }
}

// Baseline mock valid server environment
const BASE_ENV: NodeJS.ProcessEnv = {
  PORT: '5000',
  NODE_ENV: 'development',
  CLIENT_URL: 'http://localhost:5173',
  GEMINI_MODEL: 'gemini-2.5-flash',
};

// -----------------------------------------------------------------------------
// Test 1: Active server/.env values are correctly loaded
// -----------------------------------------------------------------------------
runTest('Test 1: Server environment loads PAYPAL_BASE_URL defaulting or from file', () => {
  assert.ok(env.PORT === 5000, 'PORT should be 5000');
  assert.ok(env.PAYPAL_BASE_URL.startsWith('https://'), 'PAYPAL_BASE_URL should be a valid https URL');
  assert.equal(env.PAYPAL_BASE_URL, 'https://api-m.sandbox.paypal.com');
});

// -----------------------------------------------------------------------------
// Test 2: PAYPAL_BASE_URL defaults to https://api-m.sandbox.paypal.com
// -----------------------------------------------------------------------------
runTest('Test 2: PAYPAL_BASE_URL defaults to sandbox when omitted or empty', () => {
  const result1 = validateEnv({
    ...BASE_ENV,
  });
  assert.equal(result1.PAYPAL_BASE_URL, 'https://api-m.sandbox.paypal.com');

  const result2 = validateEnv({
    ...BASE_ENV,
    PAYPAL_BASE_URL: '   ',
  });
  assert.equal(result2.PAYPAL_BASE_URL, 'https://api-m.sandbox.paypal.com');
});

// -----------------------------------------------------------------------------
// Test 3: PAYPAL_BASE_URL normalizes trailing slashes and validates URL
// -----------------------------------------------------------------------------
runTest('Test 3: PAYPAL_BASE_URL normalizes trailing slashes and accepts valid URLs', () => {
  const result = validateEnv({
    ...BASE_ENV,
    PAYPAL_BASE_URL: 'https://api-m.sandbox.paypal.com/',
  });
  assert.equal(result.PAYPAL_BASE_URL, 'https://api-m.sandbox.paypal.com');

  const liveResult = validateEnv({
    ...BASE_ENV,
    PAYPAL_BASE_URL: 'https://api-m.paypal.com',
  });
  assert.equal(liveResult.PAYPAL_BASE_URL, 'https://api-m.paypal.com');

  // Invalid URL must fail validation
  const invalidParse = envSchema.safeParse({
    ...BASE_ENV,
    PAYPAL_BASE_URL: 'not-a-valid-url',
  });
  assert.equal(invalidParse.success, false, 'Invalid PAYPAL_BASE_URL should fail validation');
});

// -----------------------------------------------------------------------------
// Test 4: When PayPal credentials are provided, validate them successfully
// -----------------------------------------------------------------------------
runTest('Test 4: Valid PayPal Client ID and Secret pass schema validation', () => {
  const testId = 'AREXWZMwMJ9REmbAq4jolc3SNdilspD79MvfZI9_h9F8ryaNUFnPmXXySyfiOPmImrDTs_sM5LfLSAlv';
  const testSecret = 'ECyFdaFaFfJmWw0Ckl4qiI1K-DM-fKlwpz94K1hH8O8zKu_IMCUFofwQVm_U3-3SkyGMluU_1V_cVgNf';

  const result = validateEnv({
    ...BASE_ENV,
    PAYPAL_CLIENT_ID: testId,
    PAYPAL_CLIENT_SECRET: testSecret,
  });

  assert.equal(result.PAYPAL_CLIENT_ID, testId);
  assert.equal(result.PAYPAL_CLIENT_SECRET, testSecret);

  const status = getPayPalConfig(result);
  assert.equal(status.isConfigured, true);
  assert.equal(status.checkoutEnabled, true);
  assert.ok(status.message.includes('enabled'));
});

// -----------------------------------------------------------------------------
// Test 5: Validate that invalid Client ID format is rejected
// -----------------------------------------------------------------------------
runTest('Test 5: Reject malformed PAYPAL_CLIENT_ID (short or invalid characters)', () => {
  // Too short (< 10 chars)
  const shortId = envSchema.safeParse({
    ...BASE_ENV,
    PAYPAL_CLIENT_ID: 'abc',
    PAYPAL_CLIENT_SECRET: 'valid_secret_1234567890',
  });
  assert.equal(shortId.success, false, 'Short PAYPAL_CLIENT_ID must be rejected');

  // Invalid characters (spaces)
  const invalidCharsId = envSchema.safeParse({
    ...BASE_ENV,
    PAYPAL_CLIENT_ID: 'invalid id with spaces 12345',
    PAYPAL_CLIENT_SECRET: 'valid_secret_1234567890',
  });
  assert.equal(invalidCharsId.success, false, 'PAYPAL_CLIENT_ID with spaces must be rejected');
});

// -----------------------------------------------------------------------------
// Test 6: Validate that invalid Client Secret format is rejected
// -----------------------------------------------------------------------------
runTest('Test 6: Reject malformed PAYPAL_CLIENT_SECRET (short or invalid characters)', () => {
  // Too short (< 10 chars)
  const shortSecret = envSchema.safeParse({
    ...BASE_ENV,
    PAYPAL_CLIENT_ID: 'valid_client_id_1234567890',
    PAYPAL_CLIENT_SECRET: 'short',
  });
  assert.equal(shortSecret.success, false, 'Short PAYPAL_CLIENT_SECRET must be rejected');

  // Invalid characters
  const invalidCharsSecret = envSchema.safeParse({
    ...BASE_ENV,
    PAYPAL_CLIENT_ID: 'valid_client_id_1234567890',
    PAYPAL_CLIENT_SECRET: 'secret with spaces and #@! symbols',
  });
  assert.equal(invalidCharsSecret.success, false, 'PAYPAL_CLIENT_SECRET with special chars must be rejected');
});

// -----------------------------------------------------------------------------
// Test 7: Mismatched credentials (one provided, other omitted) must fail
// -----------------------------------------------------------------------------
runTest('Test 7: Client ID without Secret or Secret without Client ID fails validation', () => {
  const onlyId = envSchema.safeParse({
    ...BASE_ENV,
    PAYPAL_CLIENT_ID: 'valid_client_id_1234567890',
  });
  assert.equal(onlyId.success, false, 'Client ID without Secret must fail validation');

  const onlySecret = envSchema.safeParse({
    ...BASE_ENV,
    PAYPAL_CLIENT_SECRET: 'valid_secret_1234567890',
  });
  assert.equal(onlySecret.success, false, 'Secret without Client ID must fail validation');
});

// -----------------------------------------------------------------------------
// Test 8: Application remains runnable when credentials are absent, checkout disabled
// -----------------------------------------------------------------------------
runTest('Test 8: Server runs when credentials are absent, disabling checkout with clear message', () => {
  const result = validateEnv({
    ...BASE_ENV,
    PAYPAL_CLIENT_ID: undefined,
    PAYPAL_CLIENT_SECRET: undefined,
  });

  assert.equal(result.PAYPAL_CLIENT_ID, undefined);
  assert.equal(result.PAYPAL_CLIENT_SECRET, undefined);

  const status = getPayPalConfig(result);
  assert.equal(status.isConfigured, false, 'isConfigured should be false');
  assert.equal(status.checkoutEnabled, false, 'checkoutEnabled should be false');
  assert.equal(status.baseUrl, 'https://api-m.sandbox.paypal.com');
  assert.ok(
    status.message.includes('PayPal checkout is disabled'),
    'Status message should clearly indicate PayPal checkout is disabled'
  );
  assert.ok(
    status.message.includes('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET'),
    'Status message should name required variables'
  );
});

// -----------------------------------------------------------------------------
// Test 9: Zero Client Secret exposure
// -----------------------------------------------------------------------------
runTest('Test 9: PAYPAL_CLIENT_SECRET is never exposed in PayPal status objects', () => {
  const testSecret = 'ECyFdaFaFfJmWw0Ckl4qiI1K-DM-fKlwpz94K1hH8O8zKu_IMCUFofwQVm_U3-3SkyGMluU_1V_cVgNf';
  const result = validateEnv({
    ...BASE_ENV,
    PAYPAL_CLIENT_ID: 'AREXWZMwMJ9REmbAq4jolc3SNdilspD79MvfZI9_h9F8ryaNUFnPmXXySyfiOPmImrDTs_sM5LfLSAlv',
    PAYPAL_CLIENT_SECRET: testSecret,
  });

  const status = getPayPalConfig(result) as Record<string, unknown>;
  const serialized = JSON.stringify(status);

  assert.equal(serialized.includes(testSecret), false, 'PayPal status object must NEVER leak client secret');
  assert.equal('PAYPAL_CLIENT_SECRET' in status, false, 'No secret property should exist on status');
  assert.equal('clientSecret' in status, false, 'No clientSecret property should exist on status');
});

console.log('\n========================================');
console.log(`Test Results: ${testsPassed} passed, ${testsFailed} failed`);
console.log('========================================\n');

if (testsFailed > 0) {
  process.exit(1);
}
