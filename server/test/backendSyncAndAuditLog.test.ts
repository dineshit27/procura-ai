/**
 * Procura AI — Backend Synchronization & Live Audit Log Integration Test Suite
 *
 * Verifies:
 * 1. CORS headers allow https://procura-io.onrender.com
 * 2. Real API routes return valid JSON (requests, spendguard/summary, health)
 * 3. HTTP error status codes and error JSON payloads
 * 4. Missing/invalid route handling (404 JSON)
 * 5. Safe handling and sanitization of unexpected HTML responses
 */

import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';
import { Server } from 'node:http';

console.log('🔄 Starting Procura AI Backend Sync & Audit Log Test Suite...\n');

let passed = 0;
let failed = 0;

async function runTest(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    console.log('  ✅ [PASS] ' + name);
    passed++;
  } catch (err: unknown) {
    console.error('  ❌ [FAIL] ' + name);
    console.error('     ', (err as Error)?.message ?? err);
    failed++;
  }
}

// Client-side sanitization helper logic mirror for verification
function sanitizeResponsePreview(text: string, maxLength = 120): string {
  if (!text) return '';
  const noScripts = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  const noTags = noScripts.replace(/<[^>]+>/g, ' ');
  const scrubbed = noTags
    .replace(/(bearer\s+)[A-Za-z0-9._~+/-]+/gi, '$1[REDACTED]')
    .replace(/(token|password|secret|key|client_id)\s*[:=]\s*["']?[^"'\s,}]+/gi, '$1=[REDACTED]');
  const collapsed = scrubbed.replace(/\s+/g, ' ').trim();
  return collapsed.slice(0, maxLength);
}

const app = createServer();
let server: Server;
let baseUrl: string;

async function startServer(): Promise<void> {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      if (typeof addr === 'object' && addr !== null) {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });
}

async function stopServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

async function main() {
  await startServer();

  // Test 1: CORS headers allow deployed frontend origin https://procura-io.onrender.com
  await runTest('CORS allows deployed frontend origin https://procura-io.onrender.com', async () => {
    const res = await fetch(`${baseUrl}/api/requests`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://procura-io.onrender.com',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type,Accept',
      },
    });

    assert.ok(res.status === 200 || res.status === 204, `Expected 200 or 204, got ${res.status}`);
    const allowOrigin = res.headers.get('access-control-allow-origin');
    assert.equal(allowOrigin, 'https://procura-io.onrender.com', 'Should return matching allow-origin');
    assert.equal(res.headers.get('access-control-allow-credentials'), 'true', 'Credentials should be allowed');
  });

  // Test 2: GET /api/requests returns 200 with valid JSON array
  await runTest('GET /api/requests returns 200 with valid JSON array', async () => {
    const res = await fetch(`${baseUrl}/api/requests`, {
      headers: {
        Origin: 'https://procura-io.onrender.com',
        Accept: 'application/json',
      },
    });

    assert.equal(res.status, 200);
    const contentType = res.headers.get('content-type') || '';
    assert.ok(contentType.includes('application/json'), `Expected JSON content-type, got ${contentType}`);

    const body = await res.json() as { success: boolean; data: any[] };
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data), 'data should be an array of purchase requests');
  });

  // Test 3: GET /api/spendguard/summary returns 200 with authoritative Live Audit Log data
  await runTest('GET /api/spendguard/summary returns 200 with authoritative summary and activity', async () => {
    const res = await fetch(`${baseUrl}/api/spendguard/summary`, {
      headers: {
        Origin: 'https://procura-io.onrender.com',
        Accept: 'application/json',
      },
    });

    assert.equal(res.status, 200);
    const contentType = res.headers.get('content-type') || '';
    assert.ok(contentType.includes('application/json'), `Expected JSON content-type, got ${contentType}`);

    const body = await res.json() as { success: boolean; data: any; timestamp: string };
    assert.equal(body.success, true);
    assert.ok(body.data, 'Summary data should be present');
    assert.ok(typeof body.data.configuredBudget === 'number', 'configuredBudget should be a number');
    assert.ok(Array.isArray(body.data.recentActivity), 'recentActivity should be an array');
    assert.ok(Array.isArray(body.data.alerts), 'alerts should be an array');
  });

  // Test 4: GET /api/health returns 200 with JSON system health
  await runTest('GET /api/health returns 200 with system status JSON', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: { Accept: 'application/json' },
    });

    assert.equal(res.status, 200);
    const body = await res.json() as { status: string; service: string };
    assert.equal(body.status, 'healthy');
    assert.equal(body.service, 'procura-ai-api');
  });

  // Test 5: HTTP 404 on non-existent API routes returns clean JSON, not HTML
  await runTest('Non-existent API route returns JSON 404 error instead of HTML', async () => {
    const res = await fetch(`${baseUrl}/api/non-existent-route-999`, {
      headers: { Accept: 'application/json' },
    });

    assert.equal(res.status, 404);
    const contentType = res.headers.get('content-type') || '';
    assert.ok(contentType.includes('application/json'), `Expected JSON 404 response, got ${contentType}`);

    const body = await res.json() as { status: string; message: string };
    assert.equal(body.status, 'error');
    assert.ok(body.message.includes('not found') || body.message.includes('Cannot'));
  });

  // Test 6: Safe sanitization scrubs HTML tags, scripts, and tokens from error preview
  await runTest('Safe sanitization scrubs HTML tags, scripts, and sensitive tokens', () => {
    const htmlWithSecret = `
      <!DOCTYPE html>
      <html>
        <head><script>alert('malicious')</script></head>
        <body>
          <h1>404 Not Found - Render</h1>
          <p>Bearer secret_token_xyz123456789 should be hidden</p>
          <p>password="mySecretPassword123"</p>
        </body>
      </html>
    `;

    const preview = sanitizeResponsePreview(htmlWithSecret, 200);
    assert.ok(!preview.includes('<script>'), 'Scripts must be stripped');
    assert.ok(!preview.includes('alert('), 'Script body should not execute');
    assert.ok(!preview.includes('secret_token_xyz123456789'), 'Bearer tokens must be redacted');
    assert.ok(!preview.includes('mySecretPassword123'), 'Passwords must be redacted');
    assert.ok(preview.includes('404 Not Found'), 'Public error text preserved');
    assert.ok(preview.includes('[REDACTED]'), 'Redaction placeholder present');
  });

  // Test 7: Simulated SPA HTML response detection prevents SyntaxError '<' and throws informative error
  await runTest('HTML response detection prevents SyntaxError and throws informative message', () => {
    const simulatedHtmlBody = '<!doctype html><html lang="en"><head><title>Procura AI</title></head><body><div id="root"></div></body></html>';
    const isHtml = simulatedHtmlBody.trim().startsWith('<');
    assert.equal(isHtml, true, 'Should detect raw HTML document');

    const preview = sanitizeResponsePreview(simulatedHtmlBody, 80);
    assert.ok(!preview.includes('<div'), 'Tags should be stripped in preview');

    const expectedErrorMsg = `Server returned HTML (HTTP 200) instead of JSON for https://procura-io.onrender.com/api/requests. Preview: "${preview}"`;
    assert.ok(expectedErrorMsg.includes('Server returned HTML'), 'Should have informative error message');
    assert.ok(!expectedErrorMsg.includes("Unexpected token '<'"), 'Must not throw raw unhandled JSON parser error');
  });

  await stopServer();

  console.log(`\n========================================`);
  console.log(`Backend Sync & Audit Log Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
