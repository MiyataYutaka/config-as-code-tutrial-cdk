// config/values.ts
import { AppConfig } from './schema';

export const devConfig: AppConfig = {
  envName: 'dev',
  project: { org: 'ACME', system: 'Ecom', service: 'Order' },
  vpc: { cidr: '10.1.0.0.0/16', maxAzs: 2, natGateways: 0,
    subnets: {
      'public-subnet': { name: 'public-subnet', type: 'PUBLIC', cidrMask: 24 },
      'app-subnet': { name: 'app-subnet', type: 'PRIVATE_ISOLATED', cidrMask: 24 },
      'db-subnnet': { name: 'db-subnnet', type: 'PRIVATE_ISOLATED', cidrMask: 24 },
    }
   },
  database: { minAcu: 0.5, maxAcu: 2.0, dbName: 'orders_db' },
  api: { stagename: 'v1'},
  lambdas: {
    'OrderProcessor': { detailName: 'order-processor', timeoutSeconds: 30, memorySizeMb: 512 },
    'InventoryUpdater': { detailName: 'inventory-updater', timeoutSeconds: 20, memorySizeMb: 256 },
  }
};