import { db } from '../db';
import { users, branches, auditLogs } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { signSessionToken } from '../lib/auth/session';

async function testBranchPortalToggle() {
  console.log('🧪 Starting Verification: Branch Portal Activation Toggle & Role Cabang Access...');

  const baseUrl = 'http://localhost:3000';

  // 1. Setup Sessions
  const [saUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, 'superadmin@mitraca.com'))
    .limit(1);

  const [kacabUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, 'budi.test@mitraca.com'))
    .limit(1);

  const [agentUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, 'agent.citra@mitraca.com'))
    .limit(1);

  if (!saUser || !kacabUser || !agentUser || !kacabUser.branchId) {
    throw new Error('Test users or branch not found');
  }

  const [kacabBranch] = await db
    .select()
    .from(branches)
    .where(eq(branches.id, kacabUser.branchId))
    .limit(1);

  console.log(`✅ Found Superadmin: ${saUser.name}`);
  console.log(`✅ Found Kacab: ${kacabUser.name} (Cabang [${kacabBranch.code}] ${kacabBranch.name})`);
  console.log(`✅ Found Agent: ${agentUser.name}`);

  const saToken = await signSessionToken({
    userId: saUser.id,
    email: saUser.email,
    name: saUser.name,
    role: saUser.role,
  });

  const kacabToken = await signSessionToken({
    userId: kacabUser.id,
    email: kacabUser.email,
    name: kacabUser.name,
    role: kacabUser.role,
    branchId: kacabUser.branchId,
    branchCode: kacabBranch.code,
    branchName: kacabBranch.name,
  });

  const agentToken = await signSessionToken({
    userId: agentUser.id,
    email: agentUser.email,
    name: agentUser.name,
    role: agentUser.role,
    agentId: agentUser.agentId,
  });

  // ── Skenario 1: Non-Superadmin mencoba memanggil toggle-portal (Harus Ditolak 403) ──
  console.log('\n--- 1. Testing Security: Non-Superadmin (Kacab) Calling toggle-portal (Expect 403) ---');
  const resIllegalToggle = await fetch(`${baseUrl}/api/branches/toggle-portal`, {
    method: 'PATCH',
    headers: {
      Cookie: `mitraca_session=${kacabToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ branchId: kacabBranch.id, isPortalActive: true }),
  });
  console.log('Illegal Toggle Status:', resIllegalToggle.status);
  if (resIllegalToggle.status !== 403) {
    throw new Error(`Security flaw: Expected 403 Forbidden, got ${resIllegalToggle.status}`);
  }
  console.log('✅ Security guard passed: Non-superadmin cannot toggle branch portal.');

  // ── Skenario 2: Kondisi Cabang Non-Aktif -> Kacab Ditolak 403 ──
  console.log('\n--- 2. Testing Kacab Access on INACTIVE Branch (Expect 403) ---');
  // Pastikan cabang diset non-aktif terlebih dahulu
  await fetch(`${baseUrl}/api/branches/toggle-portal`, {
    method: 'PATCH',
    headers: {
      Cookie: `mitraca_session=${saToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ branchId: kacabBranch.id, isPortalActive: false }),
  });

  const resKacabInactive = await fetch(`${baseUrl}/api/agent/profile`, {
    headers: { Cookie: `mitraca_session=${kacabToken}` },
  });
  const dataKacabInactive = await resKacabInactive.json();
  console.log('Kacab Status (Expect 403):', resKacabInactive.status);
  console.log('Error Message:', dataKacabInactive.error);
  if (resKacabInactive.status !== 403) {
    throw new Error(`Expected 403 for Kacab on inactive branch, got ${resKacabInactive.status}`);
  }
  console.log('✅ Inactive branch guard verified: Kacab blocked with clear message.');

  // ── Skenario 3: Superadmin Mengaktifkan Portal Cabang ──
  console.log('\n--- 3. Testing Superadmin Activating Branch Portal ---');
  const resSaActivate = await fetch(`${baseUrl}/api/branches/toggle-portal`, {
    method: 'PATCH',
    headers: {
      Cookie: `mitraca_session=${saToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ branchId: kacabBranch.id, isPortalActive: true }),
  });
  const dataSaActivate = await resSaActivate.json();
  console.log('Activate Status:', resSaActivate.status);
  console.log('Activate Message:', dataSaActivate.message);
  if (!dataSaActivate.success || !dataSaActivate.branch?.isPortalActive) {
    throw new Error('Failed to activate branch portal');
  }
  console.log('✅ Superadmin successfully activated branch portal.');

  // ── Skenario 4: Kacab Akses Halaman/API pada Cabang AKTIF (BRANCH_SUMMARY) ──
  console.log('\n--- 4. Testing Kacab Access on ACTIVE Branch (Expect 200 BRANCH_SUMMARY) ---');
  const resKacabActive = await fetch(`${baseUrl}/api/agent/profile`, {
    headers: { Cookie: `mitraca_session=${kacabToken}` },
  });
  const dataKacabActive = await resKacabActive.json();
  console.log('Kacab Profile Status:', resKacabActive.status);
  console.log('Mode:', dataKacabActive.mode);
  console.log('Is Branch Role:', dataKacabActive.isBranchRole);
  console.log('Branch Name:', dataKacabActive.branch?.name);
  console.log('Total Agents in Branch:', dataKacabActive.branchKPI?.totalAgents);
  console.log('Total Assistants in Branch:', dataKacabActive.branchKPI?.totalAssistants);
  console.log('Is Read-Only for Kacab:', dataKacabActive.isReadOnly);
  console.log('Can Manage for Kacab:', dataKacabActive.canManage);

  if (dataKacabActive.mode !== 'BRANCH_SUMMARY' || dataKacabActive.canManage !== false) {
    throw new Error('Expected BRANCH_SUMMARY mode with canManage=false for Kacab');
  }
  console.log('✅ Branch summary verified for active branch.');

  // ── Skenario 5: Kacab Memuat Asisten Cabang (Hanya Lihat) ──
  console.log('\n--- 5. Testing Kacab Assistants List ---');
  const resKacabAssistants = await fetch(`${baseUrl}/api/agent/assistants`, {
    headers: { Cookie: `mitraca_session=${kacabToken}` },
  });
  const dataKacabAssistants = await resKacabAssistants.json();
  console.log('Assistants Status:', resKacabAssistants.status);
  console.log('Assistants Mode:', dataKacabAssistants.mode);
  console.log('Can Manage (Expect false):', dataKacabAssistants.canManage);
  if (dataKacabAssistants.mode !== 'BRANCH' || dataKacabAssistants.canManage !== false) {
    throw new Error('Expected BRANCH mode with canManage=false');
  }

  // ── Skenario 6: Kacab Mencoba Mendaftarkan Asisten (Harus Ditolak 403) ──
  console.log('\n--- 6. Testing Kacab Attempting to Create Assistant (Expect 403) ---');
  const resKacabCreate = await fetch(`${baseUrl}/api/agent/assistants`, {
    method: 'POST',
    headers: {
      Cookie: `mitraca_session=${kacabToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Unauthorized Assistant By Kacab',
      email: 'unauthorized@mitraca.com',
      password: 'password123',
    }),
  });
  console.log('Kacab Create Status (Expect 403):', resKacabCreate.status);
  if (resKacabCreate.status !== 403) {
    throw new Error('Security flaw: Kacab was able to create assistant!');
  }
  console.log('✅ Read-only supervisory verified: Kacab cannot create assistant.');

  // ── Skenario 7: Agen & Officer Wajib Full Akses 100% Selalu ──
  console.log('\n--- 7. Testing Agent Full Access 100% (Regardless of Branch Toggle) ---');
  const resAgent = await fetch(`${baseUrl}/api/agent/profile`, {
    headers: { Cookie: `mitraca_session=${agentToken}` },
  });
  const dataAgent = await resAgent.json();
  console.log('Agent Profile Status:', resAgent.status);
  console.log('Agent Mode:', dataAgent.mode);
  console.log('Agent Can Manage:', dataAgent.canManage);
  if (resAgent.status !== 200 || !dataAgent.canManage) {
    throw new Error('Agent must always have 200 status and canManage=true');
  }
  console.log('✅ Agent 100% full access verified.');

  // ── Skenario 8: Cek Audit Logs Pencatatan Toggle Cabang ──
  console.log('\n--- 8. Checking Audit Logs for BRANCH_PORTAL_ACCESS_TOGGLED ---');
  const toggleLogs = await db
    .select({
      action: auditLogs.action,
      description: auditLogs.description,
      status: auditLogs.status,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(eq(auditLogs.action, 'BRANCH_PORTAL_ACCESS_TOGGLED'))
    .orderBy(desc(auditLogs.createdAt))
    .limit(2);

  console.log('Recent Toggle Audit Logs:');
  toggleLogs.forEach((l) => console.log(`- [${l.action}] ${l.description} (${l.status})`));
  if (toggleLogs.length === 0) {
    throw new Error('No audit log recorded for toggle action');
  }

  console.log('\n🎉 ALL BRANCH PORTAL TOGGLE TESTS PASSED 100% SUCCESSFULLY!');
  process.exit(0);
}

testBranchPortalToggle().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
