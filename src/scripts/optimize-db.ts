import { ensurePerformanceObjects } from '../lib/db/performance-views';

async function main() {
  console.log('Applying PostgreSQL pg_trgm GIN indexes & Analytics Materialized Views...');
  const result = await ensurePerformanceObjects();
  console.log('Optimization complete:', result);
  process.exit(0);
}

main().catch((err) => {
  console.error('Database optimization failed:', err);
  process.exit(1);
});
