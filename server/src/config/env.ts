import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { z } from 'zod';

// Candidates for server/.env location
const serverEnvCandidates = [
  path.resolve(process.cwd(), 'server', '.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../.env'),
];

const selectedEnvPath = serverEnvCandidates.find((candidate) => fs.existsSync(candidate));

if (selectedEnvPath) {
  dotenv.config({ path: selectedEnvPath });
} else {
  dotenv.config();
}

const emptyToUndefined = (val: unknown) => {
  if (typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  return trimmed === '' ? undefined : trimmed;
};

export const envSchema = z
  .object({
    PORT: z
      .string()
      .default('5000')
      .transform((val) => {
        const parsed = parseInt(val, 10);
        if (isNaN(parsed) || parsed <= 0 || parsed > 65535) {
          throw new Error('PORT must be a valid integer between 1 and 65535');
        }
        return parsed;
      }),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    CLIENT_URL: z
      .string()
      .url()
      .default('http://localhost:5173'),
    SUPABASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
    SUPABASE_ANON_KEY: z.preprocess(emptyToUndefined, z.string().min(20).optional()),
    SUPABASE_SERVICE_ROLE_KEY: z.preprocess(emptyToUndefined, z.string().min(20).optional()),
    GEMINI_API_KEY: z
      .string()
      .optional(),
    GEMINI_MODEL: z
      .string()
      .default('gemini-3.8-flash'),
    PAYPAL_CLIENT_ID: z
      .preprocess(
        emptyToUndefined,
        z
          .string()
          .trim()
          .min(10, 'PAYPAL_CLIENT_ID must be at least 10 characters')
          .regex(
            /^[A-Za-z0-9_-]+$/,
            'PAYPAL_CLIENT_ID must contain only alphanumeric characters, underscores, and dashes'
          )
          .optional()
      ),
    PAYPAL_CLIENT_SECRET: z
      .preprocess(
        emptyToUndefined,
        z
          .string()
          .trim()
          .min(10, 'PAYPAL_CLIENT_SECRET must be at least 10 characters')
          .regex(
            /^[A-Za-z0-9_-]+$/,
            'PAYPAL_CLIENT_SECRET must contain only alphanumeric characters, underscores, and dashes'
          )
          .optional()
      ),
    PAYPAL_BASE_URL: z
      .preprocess(
        (val) => {
          if (typeof val !== 'string') return undefined;
          const trimmed = val.trim().replace(/\/+$/, '');
          return trimmed === '' ? undefined : trimmed;
        },
        z
          .string()
          .url('PAYPAL_BASE_URL must be a valid URL')
          .default('https://api-m.sandbox.paypal.com')
      ),
    PAYPAL_PAYEE_EMAIL: z
      .preprocess(
        emptyToUndefined,
        z.string().trim().email('PAYPAL_PAYEE_EMAIL must be a valid email address').optional()
      ),
  })
  .refine(
    (data) => {
      const hasId = Boolean(data.PAYPAL_CLIENT_ID);
      const hasSecret = Boolean(data.PAYPAL_CLIENT_SECRET);
      return (hasId && hasSecret) || (!hasId && !hasSecret);
    },
    {
      message:
        'Both PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be provided together, or both omitted to disable PayPal checkout.',
      path: ['PAYPAL_CLIENT_SECRET'],
    }
  );

export type Env = z.infer<typeof envSchema>;

export interface PayPalConfigStatus {
  isConfigured: boolean;
  checkoutEnabled: boolean;
  baseUrl: string;
  message: string;
}

export function validateEnv(customEnv: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(customEnv);

  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    throw new Error(`Invalid environment configuration: ${JSON.stringify(result.error.format())}`);
  }

  return result.data;
}

function loadEnvSafe(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnvSafe();

export function getPayPalConfig(
  targetEnv: Pick<Env, 'PAYPAL_CLIENT_ID' | 'PAYPAL_CLIENT_SECRET' | 'PAYPAL_BASE_URL'> = env
): PayPalConfigStatus {
  const isConfigured = Boolean(targetEnv.PAYPAL_CLIENT_ID && targetEnv.PAYPAL_CLIENT_SECRET);
  return {
    isConfigured,
    checkoutEnabled: isConfigured,
    baseUrl: targetEnv.PAYPAL_BASE_URL,
    message: isConfigured
      ? 'PayPal credentials configured. PayPal checkout is enabled.'
      : 'PayPal checkout is disabled: PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are not configured in server/.env. Provide valid credentials to enable checkout.',
  };
}

