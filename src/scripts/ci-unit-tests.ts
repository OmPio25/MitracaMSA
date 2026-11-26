import assert from 'node:assert/strict';
import { mapMasterProduksiRow } from '../lib/ingestion/template-mappers';
import { parsePolicyNo } from '../lib/ingestion/policy-parser';
import { signSessionToken, verifySessionToken } from '../lib/auth/session';
import { getAgentScopeFilter } from '../lib/auth/rbac-filter';
import {
  getCurrentCutoffYear,
  getCutoffPeriod,
  evaluateLossRatio,
  formatMonthYearLabel,
} from '../lib/analytics/loss-ratio';

async function runUploadRulesAndIngestionTests() {
  // 1. Tanggal terbit mapping (Submit date, BOOKING_DATE, Tanggal Terbit)
  const mapped1 = mapMasterProduksiRow(
    {
      'Policy No': '107020625030000045',
      'Nilai Premi': '1500000',
      Bulan: '2026-02',
      'Submit date': '2026-01-20',
      'Agent ID': 'AGT-01',
    },
    1
  );
  assert.equal(mapped1.success, true);
  assert.equal(mapped1.data?.issueDate, '2026-01-20');

  const mapped2 = mapMasterProduksiRow(
    {
      'Policy No': 'POL-TEST-002',
      'Nilai Premi': '2500000',
      Bulan: '2026-03',
      BOOKING_DATE: '15-02-2026',
      'Agent ID': 'AGT-01',
    },
    2
  );
  assert.equal(mapped2.success, true);
  assert.equal(mapped2.data?.issueDate, '2026-02-15');

  const mapped3 = mapMasterProduksiRow(
    {
      'Policy No': 'POL-TEST-003',
      'Nilai Premi': '3500000',
      Bulan: '2026-04',
      'Tanggal Terbit': '2026/03/10',
      'Agent ID': 'AGT-01',
    },
    3
  );
  assert.equal(mapped3.success, true);
  assert.equal(mapped3.data?.issueDate, '2026-03-10');

  // 2. Policy number structure parser (Konvensional & Syariah)
  const conv = parsePolicyNo('107020625030000045');
  assert.ok(conv);
  assert.equal(conv.isSyariah, false);
  assert.equal(conv.branchCode, '07');
  assert.equal(conv.policyYear, '2025');
  assert.equal(conv.policyMonth, '03');

  const syariah = parsePolicyNo('S10601052609000015');
  assert.ok(syariah);
  assert.equal(syariah.isSyariah, true);
  assert.equal(syariah.branchCode, '06');
  assert.equal(syariah.policyYear, '2026');
  assert.equal(syariah.policyMonth, '09');

  console.log('✓ Upload rules, template mappers, and policy parser passed');
}

async function runAgentPortalAuthAndRbacTests() {
  // 1. JWT Session round-trip for AGENT & OFFICER_AGENT
  const token = await signSessionToken({
    userId: '00000000-0000-0000-0000-000000000001',
    email: 'agent.test@mitraca.com',
    name: 'Agent Test',
    role: 'AGENT',
    agentId: '00000000-0000-0000-0000-000000000002',
    agentCode: '871300',
  });
  const verified = await verifySessionToken(token);
  assert.ok(verified);
  assert.equal(verified.role, 'AGENT');
  assert.equal(verified.agentCode, '871300');

  // Invalid token must return null
  const invalid = await verifySessionToken(`${token}tampered`);
  assert.equal(invalid, null);

  // 2. RBAC Scope Filter guards
  assert.equal(
    getAgentScopeFilter({ userId: 'u1', role: 'SUPERADMIN' }),
    undefined
  );
  assert.ok(
    getAgentScopeFilter({ userId: 'u2', role: 'KACAB', branchId: null })
  );
  assert.ok(
    getAgentScopeFilter({
      userId: 'u3',
      role: 'AGENT',
      agentId: '00000000-0000-0000-0000-000000000002',
    })
  );
  assert.ok(
    getAgentScopeFilter({
      userId: 'u4',
      role: 'OFFICER_AGENT',
      parentAgentId: null,
    })
  );

  console.log('✓ Agent portal session JWT and RBAC scope guards passed');
}

async function runAgentKpiCutoffTests() {
  // 1. Cutoff cycle boundaries (14 Nov prev year - 13 Nov target year)
  assert.equal(getCurrentCutoffYear(new Date('2026-11-13T12:00:00Z')), 2026);
  assert.equal(getCurrentCutoffYear(new Date('2026-11-14T12:00:00Z')), 2027);

  const cutoff2026 = getCutoffPeriod(2026);
  assert.equal(cutoff2026.startDate, '2025-11-14');
  assert.equal(cutoff2026.endDate, '2026-11-13');

  // 2. Loss ratio evaluation thresholds (<35 HEALTHY, =35 WARNING, >35 CRITICAL)
  assert.equal(evaluateLossRatio(null).status, 'NO_DATA');
  assert.equal(evaluateLossRatio(24.5).status, 'HEALTHY');
  assert.equal(evaluateLossRatio(35).status, 'WARNING');
  assert.equal(evaluateLossRatio(42.1).status, 'CRITICAL');

  // 3. Month-year formatting
  assert.equal(formatMonthYearLabel('2026-01'), 'Jan-26');
  assert.equal(formatMonthYearLabel(null), '-');

  console.log('✓ Agent KPI cutoff boundaries and loss ratio rules passed');
}

async function main() {
  console.log('Running MitracaMSA CI automated test suite...\n');
  await runUploadRulesAndIngestionTests();
  await runAgentPortalAuthAndRbacTests();
  await runAgentKpiCutoffTests();
  console.log('\nAll CI automated tests passed.');
}

main().catch((err) => {
  console.error('CI automated test suite failed:', err);
  process.exit(1);
});
