import { z } from "zod";
import { baseEnvSchema, validateEnv } from "@platform/core/lib/env";

const envSchema = baseEnvSchema.extend({
  GROQ_API_KEY: z.string().min(1),
  SERPAPI_API_KEY: z.string().optional(),
  AMADEUS_CLIENT_ID: z.string().optional(),
  AMADEUS_CLIENT_SECRET: z.string().optional(),
  KIWI_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export const env = validateEnv(envSchema);
