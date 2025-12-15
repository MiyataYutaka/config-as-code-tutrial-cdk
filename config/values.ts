// config/values.ts
import { AppConfig } from './schema';

export const devConfig: AppConfig = {
  envName: 'dev',
  project: { org: 'ACME', system: 'Ecom', service: 'Order' },
  database: { minAcu: 0.5, maxAcu: 2.0, dbName: 'orders_db' },
  api: { stagename: 'v1'}
};