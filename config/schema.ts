// config/schema.ts
import { z } from 'zod';

export const AppConfigSchema = z.object({
  envName: z.enum(['dev', 'stg', 'prod']),
  project: z.object({
    org: z.string(),
    system: z.string(),
    service: z.string(),
  }),
  database: z.object({
    minAcu: z.number().min(0.5).max(128),
    maxAcu: z.number().min(0.5).max(128),
    dbName: z.string(),
  }),
  api: z.object({
    stagename: z.string(),
  }),
}).refine(data => data.database.maxAcu >= data.database.minAcu, {
  message: "Max ACU must be >= Min ACU",
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

