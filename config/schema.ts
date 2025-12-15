// config/schema.ts
import { z } from 'zod';

const LambdaFunctionSchema = z.object({
  detailName: z.string(),
  timeoutSeconds: z.number().min(1).max(900).optional(),
  memorySizeMb: z.number().min(128).max(10240).optional(),
});

const subnetSchema = z.object({
  name: z.string(),
  type: z.enum(['PUBLIC', 'PRIVATE_WITH_NAT', 'PRIVATE_ISOLATED']),
  cidrMask: z.number().min(16).max(28),
});

export const AppConfigSchema = z.object({
  envName: z.enum(['dev', 'stg', 'prod']),
  project: z.object({
    org: z.string(),
    system: z.string(),
    service: z.string(),
  }),
  vpc: z.object({
    cidr: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/, 'Invalid CIDR notation'),
    maxAzs: z.number().min(1).max(6),
    natGateways: z.number().min(0).max(3),
    subnets: z.record(z.string(), subnetSchema).optional(),
  }).optional(),
  database: z.object({
    minAcu: z.number().min(0.5).max(128),
    maxAcu: z.number().min(0.5).max(128),
    dbName: z.string(),
  }),
  api: z.object({
    stagename: z.string(),
  }).optional,
  lambdas: z.record(z.string(),LambdaFunctionSchema).optional(),
}).refine(data => data.database.maxAcu >= data.database.minAcu, {
  message: "Max ACU must be >= Min ACU",
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

