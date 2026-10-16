import { env } from '../src/config/env.js';
import { analyzePurchasingRequest } from '../src/services/geminiService.js';

async function main() {
  console.log('--- Testing Gemini Live Integration ---');
  console.log('Model:', env.GEMINI_MODEL);
  console.log('Has API Key:', Boolean(env.GEMINI_API_KEY));

  try {
    const result = await analyzePurchasingRequest({
      prompt: 'Ergonomic executive desk chair for office',
      quantity: 2,
      budget: 600,
    });

    console.log('Result Provider:', result.provider);
    console.log('Result Model:', result.model);
    console.log('Summary:', result.summary);
    console.log('Recommendations count:', result.options?.length);
    console.log('Execution Status: SUCCESS');
  } catch (err) {
    console.error('Execution Failed:', err);
  }
}

main();
