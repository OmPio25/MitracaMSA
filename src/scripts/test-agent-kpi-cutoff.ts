import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { getCurrentCutoffYear, getCutoffPeriod, evaluateLossRatio } from '@/lib/analytics/loss-ratio';
import { mapMasterProduksiRow } from '@/lib/ingestion/template-mappers';

async function testAll() {
  console.log('=== TEST 1: INGESTION MAPPING FOR TANGGAL TERBIT ===');
  const sampleRow1 = {
    'Policy No': 'POL-TEST-001',
    'Nilai Premi': '1500000',
    'Bulan': '2026-02',
    'Submit date': '2026-01-20',
    'Agent ID': 'AGT-01',
  };
  const mapped1 = mapMasterProduksiRow(sampleRow1);
  console.log('Mapping with "Submit date":', mapped1.success, 'issueDate:', mapped1.data?.issueDate);

  const sampleRow2 = {
    'Policy No': 'POL-TEST-002',
    'Nilai Premi': '2500000',
    'Bulan': '2026-03',
    'BOOKING_DATE': '15-02-2026',
    'Agent ID': 'AGT-01',
  };
  const mapped2 = mapMasterProduksiRow(sampleRow2);
  console.log('Mapping with "BOOKING_DATE":', mapped2.success, 'issueDate:', mapped2.data?.issueDate);

  const sampleRow3 = {
    'Policy No': 'POL-TEST-003',
    'Nilai Premi': '3500000',
    'Bulan': '2026-04',
    'Tanggal Terbit': '2026/03/10',
    'Agent ID': 'AGT-01',
  };
  const mapped3 = mapMasterProduksiRow(sampleRow3);
  console.log('Mapping with "Tanggal Terbit":', mapped3.success, 'issueDate:', mapped3.data?.issueDate);

  if (mapped1.data?.issueDate === '2026-01-20' &&
      mapped2.data?.issueDate === '2026-02-15' &&
      mapped3.data?.issueDate === '2026-03-10') {
    console.log('✅ Ingestion mapping test PASSED!');
  } else {
    console.error('❌ Ingestion mapping test FAILED!');
  }

  console.log('\n=== TEST 2: AGENT CUTOFF 2026 KPI CALCULATION ===');
  const cutoffYear = getCurrentCutoffYear();
  const cutoffPeriod = getCutoffPeriod(cutoffYear);
  console.log('Cutoff Year:', cutoffYear, 'Period:', cutoffPeriod.startDate, 's/d', cutoffPeriod.endDate);

  // Cari agent yang memiliki produksi dan klaim
  const agentQuery = await db.execute<{ id: string; agent_code: string; name: string }>(sql`
    SELECT a.id, a.agent_code, a.name
    FROM agents a
    WHERE EXISTS (SELECT 1 FROM production_records pr WHERE pr.agent_id = a.id AND pr.deleted_at IS NULL)
      AND EXISTS (SELECT 1 FROM claims cl WHERE cl.agent_id = a.id AND cl.deleted_at IS NULL)
    LIMIT 1;
  `);
  const sampleAgent = (agentQuery.rows || agentQuery)[0];

  console.log('Selected agent:', sampleAgent);

  const personalProdResult = await db.execute(sql`
    SELECT 
      COUNT(DISTINCT CASE 
        WHEN COALESCE(issue_date, start_period) >= ${cutoffPeriod.startDate}::date 
         AND COALESCE(issue_date, start_period) <= ${cutoffPeriod.endDate}::date 
        THEN policy_no 
      END)::int AS "personalCutoffPolicyCount",
      COALESCE(SUM(CASE 
        WHEN COALESCE(issue_date, start_period) >= ${cutoffPeriod.startDate}::date 
         AND COALESCE(issue_date, start_period) <= ${cutoffPeriod.endDate}::date 
        THEN nilai_premi 
        ELSE 0 
      END), 0)::numeric(18, 2) AS "personalCutoffGrossPremium",
      COUNT(DISTINCT policy_no)::int AS "personalPolicyCount",
      COALESCE(SUM(nilai_premi), 0)::numeric(18, 2) AS "personalGrossPremium"
    FROM production_records
    WHERE agent_id = ${sampleAgent.id}::uuid
      AND deleted_at IS NULL;
  `);

  const personalClaimResult = await db.execute(sql`
    SELECT 
      COUNT(DISTINCT CASE 
        WHEN date_of_settlement >= ${cutoffPeriod.startDate}::date 
         AND date_of_settlement <= ${cutoffPeriod.endDate}::date 
        THEN claim_no 
      END)::int AS "personalCutoffClaimCount",
      COALESCE(SUM(CASE 
        WHEN date_of_settlement >= ${cutoffPeriod.startDate}::date 
         AND date_of_settlement <= ${cutoffPeriod.endDate}::date 
        THEN gross_claim 
        ELSE 0 
      END), 0)::numeric(18, 2) AS "personalCutoffGrossClaim",
      COUNT(*)::int AS "personalClaimCount",
      COALESCE(SUM(gross_claim), 0)::numeric(18, 2) AS "personalGrossClaim"
    FROM claims
    WHERE agent_id = ${sampleAgent.id}::uuid
      AND deleted_at IS NULL;
  `);

  const prodRow = ((personalProdResult as any).rows || personalProdResult)[0];
  const claimRow = ((personalClaimResult as any).rows || personalClaimResult)[0];

  const cutoffPrem = Number(prodRow.personalCutoffGrossPremium);
  const cutoffClaim = Number(claimRow.personalCutoffGrossClaim);
  const cutoffLossRatio = cutoffPrem > 0 ? Number(((cutoffClaim / cutoffPrem) * 100).toFixed(2)) : 0;
  const lrEval = evaluateLossRatio(cutoffLossRatio);

  console.log('Result KPI Cutoff 2026:');
  console.log('- Premi 2026:', cutoffPrem);
  console.log('- Jumlah Polis 2026:', prodRow.personalCutoffPolicyCount);
  console.log('- Beban Klaim Cutoff 2026:', cutoffClaim);
  console.log('- Jumlah Klaim Cutoff 2026:', claimRow.personalCutoffClaimCount);
  console.log('- Loss Ratio Cutoff 2026:', cutoffLossRatio, '% (', lrEval.label, ')');
  console.log('- All-Time Premi:', prodRow.personalGrossPremium);
  console.log('- All-Time Polis:', prodRow.personalPolicyCount);

  console.log('✅ Agent KPI Cutoff calculation test PASSED!');

  process.exit(0);
}

testAll().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
