import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_STORAGE_BUCKET_CUSTOMS: z.string().default("customs-files"),
  SUPABASE_STORAGE_BUCKET_DOCS: z.string().default("auth-docs"),
  SUPABASE_STORAGE_BUCKET_PACKS: z.string().default("submission-packs"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_STARTER: z.string().optional(),
  STRIPE_PRICE_BROKER: z.string().optional(),
  STRIPE_PRICE_SCALE: z.string().optional(),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  CRON_SECRET: z.string().optional()
});

export const env = envSchema.parse(process.env);

export function requireEnv(key: keyof typeof env): string {
  const value = env[key];
  if (!value || value.length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
