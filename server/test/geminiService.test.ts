import assert from 'node:assert/strict';
import { runRulesEngineAnalysis } from '../src/services/geminiService.js';
import { CATALOG_ITEMS } from '../src/data/catalog.js';
import type { AnalysisResponsePayload } from '../src/types/catalog.js';

console.log('[Gemini Test Suite] Starting Procura AI Gemini Integration Tests...\n');

let passed = 0;
let failed = 0;

async function runTest(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    console.log('  [PASS] ' + name);
    passed++;
  } catch (err: unknown) {
    console.error('  [FAIL] ' + name);
    console.error('   ', (err as Error)?.message ?? err);
    failed++;
  }
}

const VALID_REQUEST = {
  prompt: 'Need ergonomic chairs for 3 remote employees',
  budget: 1500,
  quantity: 3,
  category: 'Office Ergonomics',
  urgency: 'standard' as const,
};

const CATALOG_IDS = new Set(CATALOG_ITEMS.map((i) => i.id));

async function runAllTests(): Promise<void> {

  // 1. provider is always rules-engine
  await runTest('Test 1: runRulesEngineAnalysis always returns provider=rules-engine', () => {
    const r = runRulesEngineAnalysis(VALID_REQUEST);
    assert.equal(r.provider, 'rules-engine');
    assert.equal(r.model, 'local-deterministic-v1');
    assert.ok(r.options.length > 0, 'options must be non-empty');
  });

  // 2. reasonNotice embedded in summary
  await runTest('Test 2: runRulesEngineAnalysis embeds reasonNotice in summary', () => {
    const notice = 'test-reason-ABC';
    const r = runRulesEngineAnalysis(VALID_REQUEST, notice);
    assert.ok(r.summary.includes(notice), 'summary did not include notice: ' + r.summary);
    assert.equal(r.provider, 'rules-engine');
  });

  // 3. Rules-engine summary never claims Gemini generated it
  await runTest('Test 3: rules-engine summary never says Gemini evaluated', () => {
    const r = runRulesEngineAnalysis(VALID_REQUEST);
    assert.ok(
      !r.summary.toLowerCase().includes('gemini evaluated'),
      'summary must not claim Gemini generated it: ' + r.summary
    );
  });

  // 4. All required fields present
  await runTest('Test 4: runRulesEngineAnalysis result has all required fields', () => {
    const r = runRulesEngineAnalysis(VALID_REQUEST);
    assert.ok(Array.isArray(r.options) && r.options.length >= 1, 'options must be non-empty array');
    for (const opt of r.options) {
      assert.ok(opt.catalogItem, 'option must have catalogItem');
      assert.ok(typeof opt.matchScore === 'number', 'matchScore must be number');
      assert.ok(opt.matchScore >= 1 && opt.matchScore <= 99, 'matchScore out of [1,99]: ' + opt.matchScore);
      assert.ok(Array.isArray(opt.pros), 'pros must be array');
      assert.ok(Array.isArray(opt.cons), 'cons must be array');
      assert.ok(typeof opt.estimatedTotal === 'number', 'estimatedTotal must be number');
      assert.ok(typeof opt.isRecommended === 'boolean', 'isRecommended must be boolean');
    }
  });

  // 5. Only valid catalog IDs returned — no hallucinations
  await runTest('Test 5: runRulesEngineAnalysis returns only valid catalog item IDs (no hallucinations)', () => {
    const r = runRulesEngineAnalysis(VALID_REQUEST);
    for (const opt of r.options) {
      assert.ok(CATALOG_IDS.has(opt.catalogItem.id), 'Hallucinated ID detected: ' + opt.catalogItem.id);
    }
  });

  // 6. Category filter honoured when pool is large enough
  await runTest('Test 6: runRulesEngineAnalysis filters by category when catalog pool >= 3', () => {
    const r = runRulesEngineAnalysis({ ...VALID_REQUEST, category: 'IT & Hardware' });
    const itItems = CATALOG_ITEMS.filter((i) => i.category === 'IT & Hardware');
    if (itItems.length >= 3) {
      for (const opt of r.options) {
        assert.equal(opt.catalogItem.category, 'IT & Hardware',
          'Expected IT & Hardware, got: ' + opt.catalogItem.category);
      }
    }
  });

  // 7. estimatedTotal = unitPrice x quantity
  await runTest('Test 7: estimatedTotal computed correctly as unitPrice x quantity', () => {
    const qty = 3;
    const r = runRulesEngineAnalysis({ ...VALID_REQUEST, quantity: qty });
    for (const opt of r.options) {
      const expected = Number((opt.catalogItem.price * qty).toFixed(2));
      assert.equal(opt.estimatedTotal, expected,
        'expected=' + expected + ' got=' + opt.estimatedTotal + ' for ' + opt.catalogItem.id);
    }
  });

  // 8. Over-budget items have cons noting the overage
  await runTest('Test 8: Items exceeding budget have overage noted in cons', () => {
    const r = runRulesEngineAnalysis({ ...VALID_REQUEST, budget: 100, quantity: 3 });
    for (const opt of r.options) {
      if (opt.estimatedTotal > 100) {
        assert.ok(
          opt.cons.some((c) => c.includes('Exceeds specified budget')),
          'Over-budget item ' + opt.catalogItem.id + ' missing overage con. cons=' + JSON.stringify(opt.cons)
        );
      }
    }
  });

  // 9. First option isRecommended=true, all others false
  await runTest('Test 9: First option isRecommended=true, subsequent options isRecommended=false', () => {
    const r = runRulesEngineAnalysis(VALID_REQUEST);
    assert.equal(r.options[0]!.isRecommended, true, 'First option must be isRecommended');
    for (let i = 1; i < r.options.length; i++) {
      assert.equal(r.options[i]!.isRecommended, false, 'option[' + i + '] must not be isRecommended');
    }
  });

  // 10. Timestamp is valid ISO 8601
  await runTest('Test 10: Result timestamp is a valid ISO 8601 datetime', () => {
    const r = runRulesEngineAnalysis(VALID_REQUEST);
    assert.ok(!isNaN(new Date(r.timestamp).getTime()), 'timestamp is not a valid date: ' + r.timestamp);
  });

  // 11. matchScore clamped to [1,99] even with extreme inputs
  await runTest('Test 11: matchScore always clamped within [1, 99] for extreme inputs', () => {
    const r = runRulesEngineAnalysis({ prompt: 'xxxxxxxxxxx', budget: 1, quantity: 1000 });
    for (const opt of r.options) {
      assert.ok(opt.matchScore >= 1 && opt.matchScore <= 99,
        'matchScore ' + opt.matchScore + ' out of [1,99] for ' + opt.catalogItem.id);
    }
  });

  // 12. Missing API key fallback: summary indicates the missing-key reason
  await runTest('Test 12: Missing GEMINI_API_KEY fallback summary indicates missing key', () => {
    const notice = 'Gemini API key not configured on server; using local purchasing engine';
    const r = runRulesEngineAnalysis(VALID_REQUEST, notice);
    assert.equal(r.provider, 'rules-engine');
    assert.ok(r.summary.includes('Gemini API key not configured'),
      'summary does not mention missing key: ' + r.summary);
  });

  // 13. Gemini error fallback: labelled rules-engine, not Gemini
  await runTest('Test 13: Gemini API error fallback is labelled rules-engine and never claims Gemini output', () => {
    const errReason = 'Gemini request failed (503 UNAVAILABLE); fallback engine activated';
    const r = runRulesEngineAnalysis(VALID_REQUEST, errReason);
    assert.equal(r.provider, 'rules-engine', 'provider must be rules-engine on fallback');
    assert.ok(r.summary.includes(errReason), 'summary must include error reason: ' + r.summary);
    assert.ok(!r.summary.includes('Gemini evaluated'),
      'Fallback summary must not claim Gemini generated the result: ' + r.summary);
  });

  // Helper: returns true for any network error that indicates the server isn't listening.
  // Node's built-in fetch wraps connection failures as TypeError('fetch failed') in some
  // versions rather than attaching code=ECONNREFUSED, so we must check both.
  function isServerNotRunning(err: unknown): boolean {
    if (err instanceof TypeError && err.message.toLowerCase().includes('fetch failed')) return true;
    const code = (err as NodeJS.ErrnoException).code;
    return code === 'ECONNREFUSED' || code === 'ENOTFOUND';
  }

  // 14. HTTP route: invalid body rejected with 400
  await runTest('Test 14: POST /api/ai/analyze-purchase rejects invalid body with 400', async () => {
    try {
      const res = await fetch('http://localhost:5000/api/ai/analyze-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'x', budget: -1, quantity: 0 }),
      });
      assert.equal(res.status, 400, 'Expected 400, got ' + res.status);
      const json = await res.json() as { status: string; details?: unknown };
      assert.equal(json.status, 'error', 'status field must be error');
      assert.ok(json.details, 'Response must include field-level validation details');
    } catch (err: unknown) {
      if (isServerNotRunning(err)) {
        console.log('    [SKIP] Dev server not running — HTTP test skipped');
        return;
      }
      throw err;
    }
  });

  // 15. HTTP route: valid request returns 200 with catalog-grounded options
  await runTest('Test 15: POST /api/ai/analyze-purchase valid request returns 200 with catalog-grounded options', async () => {
    try {
      const res = await fetch('http://localhost:5000/api/ai/analyze-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_REQUEST),
      });
      assert.equal(res.status, 200, 'Expected 200, got ' + res.status);
      const json = await res.json() as { status: string; data: AnalysisResponsePayload };
      assert.equal(json.status, 'success');
      const d = json.data;
      assert.ok(['gemini', 'rules-engine'].includes(d.provider), 'provider must be gemini or rules-engine, got: ' + d.provider);
      assert.ok(typeof d.model === 'string' && d.model.length > 0, 'model must be a non-empty string');
      assert.ok(Array.isArray(d.options) && d.options.length > 0, 'options must be non-empty array');
      assert.ok(typeof d.summary === 'string' && d.summary.length > 0, 'summary must be non-empty string');
      // Catalog grounding: no hallucinated IDs
      for (const opt of d.options) {
        assert.ok(CATALOG_IDS.has(opt.catalogItem.id), 'Hallucinated ID in response: ' + opt.catalogItem.id);
      }
    } catch (err: unknown) {
      if (isServerNotRunning(err)) {
        console.log('    [SKIP] Dev server not running — HTTP test skipped');
        return;
      }
      throw err;
    }
  });

  // 16. provider/model invariant: gemini != local-deterministic-v1, rules-engine = local-deterministic-v1
  await runTest('Test 16: provider and model fields are always mutually consistent (never cross-labelled)', async () => {
    try {
      const res = await fetch('http://localhost:5000/api/ai/analyze-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_REQUEST),
      });
      const json = await res.json() as { data: AnalysisResponsePayload };
      const d = json.data;
      if (d.provider === 'gemini') {
        assert.notEqual(d.model, 'local-deterministic-v1',
          'A gemini response must not use the rules-engine model identifier');
      }
      if (d.provider === 'rules-engine') {
        assert.equal(d.model, 'local-deterministic-v1',
          'A rules-engine response must use local-deterministic-v1');
      }
    } catch (err: unknown) {
      if (isServerNotRunning(err)) {
        console.log('    [SKIP] Dev server not running — HTTP test skipped');
        return;
      }
      throw err;
    }
  });

  // ---- NEW TESTS FOR OPTIMIZATION CHANGES ----

  // 17. Rules-engine fallback is fast (< 50 ms)
  await runTest('Test 17: runRulesEngineAnalysis completes in under 50 ms (fast deterministic fallback)', () => {
    const t0 = performance.now();
    const r = runRulesEngineAnalysis(VALID_REQUEST, 'perf-test');
    const elapsed = performance.now() - t0;
    assert.ok(elapsed < 50, `Expected < 50 ms but took ${elapsed.toFixed(1)} ms`);
    assert.equal(r.provider, 'rules-engine');
    console.log(`    ⏱ rules-engine elapsed: ${elapsed.toFixed(2)} ms`);
  });

  // 18. Timeout / quota exhaustion fallback: simulate a transient error reason
  await runTest('Test 18: Timeout/quota error notice is surfaced in fallback summary', () => {
    const reason = 'AI analysis timed out or failed (AbortError: The operation was aborted); fallback engine activated';
    const r = runRulesEngineAnalysis(VALID_REQUEST, reason);
    assert.equal(r.provider, 'rules-engine');
    assert.ok(r.summary.includes('AbortError') || r.summary.includes('timed out') || r.summary.includes(reason.slice(0, 30)),
      'Timeout reason must appear in fallback summary: ' + r.summary);
  });

  // 19. Invalid model output fallback: labelled correctly
  await runTest('Test 19: Invalid Gemini output reason is passed into fallback summary', () => {
    const reason = 'Invalid response structure: rankedOptions array missing or empty';
    const r = runRulesEngineAnalysis(VALID_REQUEST, reason);
    assert.equal(r.provider, 'rules-engine');
    assert.ok(r.summary.includes('rankedOptions') || r.summary.includes(reason.slice(0, 30)),
      'Parse error reason must appear in fallback summary: ' + r.summary);
  });

  // 20. Missing API key produces rules-engine fallback (not Gemini provider)
  await runTest('Test 20: Missing API key fallback returns rules-engine (not gemini) provider', () => {
    const notice = 'Gemini API key not configured on server; using local purchasing engine';
    const r = runRulesEngineAnalysis(VALID_REQUEST, notice);
    assert.equal(r.provider, 'rules-engine', 'provider must be rules-engine, not gemini');
    assert.notEqual(r.model, 'gemini-2.5-flash', 'rules-engine fallback must never report Gemini model');
    assert.equal(r.model, 'local-deterministic-v1');
  });

  // 21. Authoritative prices: estimatedTotal uses catalog price, not budget
  await runTest('Test 21: SpendGuard/catalog authoritative prices: estimatedTotal = catalog unitPrice * qty (never budget)', () => {
    const overBudgetReq = { ...VALID_REQUEST, budget: 1, quantity: 2 };
    const r = runRulesEngineAnalysis(overBudgetReq);
    for (const opt of r.options) {
      const expected = Number((opt.catalogItem.price * 2).toFixed(2));
      assert.equal(opt.estimatedTotal, expected,
        `estimatedTotal must use catalog price. Expected ${expected}, got ${opt.estimatedTotal} for ${opt.catalogItem.id}`);
      // Must not be set to the budget amount
      assert.notEqual(opt.estimatedTotal, 1,
        'estimatedTotal must never be truncated to the user-specified budget');
    }
  });

  // 22. Recommended option is always the first, with highest or tied matchScore
  await runTest('Test 22: Recommended option is always index 0 and has highest matchScore', () => {
    const r = runRulesEngineAnalysis(VALID_REQUEST);
    const recommended = r.options.find((o) => o.isRecommended);
    assert.ok(recommended, 'At least one option must be isRecommended');
    assert.equal(r.options.indexOf(recommended!), 0, 'isRecommended option must be at index 0');
    const topScore = r.options[0]!.matchScore;
    for (const opt of r.options.slice(1)) {
      assert.ok(topScore >= opt.matchScore,
        `First option matchScore (${topScore}) must be >= subsequent (${opt.matchScore})`);
    }
  });

  // 23. Env model name is correct — gemini-3.8-flash does not exist
  await runTest('Test 23: GEMINI_MODEL default is gemini-2.5-flash (not the wrong gemini-3.8-flash)', async () => {
    const { envSchema } = await import('../src/config/env.js');
    const parsed = envSchema.safeParse({ PORT: '5000', NODE_ENV: 'test' });
    assert.ok(parsed.success, 'envSchema must parse successfully with minimal env');
    const modelDefault = parsed.data.GEMINI_MODEL;
    assert.notEqual(modelDefault, 'gemini-3.8-flash',
      'gemini-3.8-flash does not exist and must not be the default. Got: ' + modelDefault);
    assert.equal(modelDefault, 'gemini-2.5-flash',
      'Default model must be gemini-2.5-flash. Got: ' + modelDefault);
  });

  // 24. Timeout config: GEMINI_TIMEOUT_MS parses correctly and is bounded
  await runTest('Test 24: GEMINI_TIMEOUT_MS is bounded to [3000, 60000] and defaults to 10000', async () => {
    const { envSchema } = await import('../src/config/env.js');

    const defaultParsed = envSchema.safeParse({ PORT: '5000', NODE_ENV: 'test' });
    assert.ok(defaultParsed.success);
    assert.equal(defaultParsed.data.GEMINI_TIMEOUT_MS, 10000, 'Default timeout must be 10000 ms');

    const tooLow = envSchema.safeParse({ PORT: '5000', NODE_ENV: 'test', GEMINI_TIMEOUT_MS: '100' });
    assert.ok(tooLow.success);
    assert.equal(tooLow.data.GEMINI_TIMEOUT_MS, 3000, 'Too-low timeout must be clamped to 3000');

    const tooHigh = envSchema.safeParse({ PORT: '5000', NODE_ENV: 'test', GEMINI_TIMEOUT_MS: '999999' });
    assert.ok(tooHigh.success);
    assert.equal(tooHigh.data.GEMINI_TIMEOUT_MS, 60000, 'Too-high timeout must be clamped to 60000');
  });

  console.log('\n========================================');
  console.log('Gemini Integration Test Results: ' + passed + ' passed, ' + failed + ' failed');
  console.log('========================================\n');

  if (failed > 0) process.exit(1);
}

runAllTests();