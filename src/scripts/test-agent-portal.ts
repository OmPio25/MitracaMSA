import { db } from '../db';
import { users, agents, auditLogs } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { signSessionToken } from '../lib/auth/session';

async function testAgentPortal() {
  console.log('🧪 Starting Verification: Portal Mandiri Agen & Manajemen Asisten...');

  // 1. Get Agent Ekasurya Halim (agent.citra@mitraca.com)
  const [agentUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, 'agent.citra@mitraca.com'))
    .limit(1);

  if (!agentUser || !agentUser.agentId) {
    throw new Error('Test agent user not found');
  }

  const [agentMaster] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentUser.agentId))
    .limit(1);

  console.log(`✅ Found Test Agent: ${agentUser.name} (${agentMaster.agentCode})`);

  // Sign session token for Agent
  const agentToken = await signSessionToken({
    userId: agentUser.id,
    email: agentUser.email,
    name: agentUser.name,
    role: agentUser.role,
    branchId: agentUser.branchId,
    agentId: agentUser.agentId,
    agentCode: agentMaster.agentCode,
    agentName: agentMaster.name,
  });

  const baseUrl = 'http://localhost:3000';

  // 2. Test GET /api/agent/profile
  console.log('\n--- 1. Testing GET /api/agent/profile ---');
  const resProfile = await fetch(`${baseUrl}/api/agent/profile`, {
    headers: { Cookie: `mitraca_session=${agentToken}` },
  });
  const dataProfile = await resProfile.json();
  console.log('Profile Response Status:', resProfile.status);
  console.log('Agent Name:', dataProfile.agent?.name);
  console.log('Agent Code:', dataProfile.agent?.agentCode);
  console.log('Peringkat:', dataProfile.agent?.peringkat);
  console.log('KPI Policies:', dataProfile.kpi?.personalPolicyCount);
  console.log('KPI Gross Premium:', dataProfile.kpi?.personalGrossPremium);
  console.log('KPI Total Assistants:', dataProfile.kpi?.totalAssistants);
  if (!dataProfile.success) throw new Error('Profile fetch failed');

  // 3. Test GET /api/agent/assistants
  console.log('\n--- 2. Testing GET /api/agent/assistants ---');
  const resAssistants = await fetch(`${baseUrl}/api/agent/assistants`, {
    headers: { Cookie: `mitraca_session=${agentToken}` },
  });
  const dataAssistants = await resAssistants.json();
  console.log('Assistants Response Status:', resAssistants.status);
  console.log('Total Assistants Found:', dataAssistants.total);
  console.log('Can Manage:', dataAssistants.canManage);
  if (!dataAssistants.success) throw new Error('Assistants fetch failed');

  // 4. Test POST /api/agent/assistants (Create New Assistant)
  console.log('\n--- 3. Testing POST /api/agent/assistants ---');
  const testEmail = `assistant.test.${Date.now()}@mitraca.com`;
  const resCreate = await fetch(`${baseUrl}/api/agent/assistants`, {
    method: 'POST',
    headers: {
      Cookie: `mitraca_session=${agentToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Rudi Pratama (Asisten Test)',
      email: testEmail,
      phone: '081299998888',
      password: 'password123',
      confirmPassword: 'password123',
    }),
  });
  const dataCreate = await resCreate.json();
  console.log('Create Assistant Status:', resCreate.status);
  console.log('Created Message:', dataCreate.message);
  console.log('Created Assistant ID:', dataCreate.assistant?.id);
  if (!dataCreate.success) throw new Error('Create assistant failed: ' + dataCreate.error);
  const createdAssistantId = dataCreate.assistant.id;

  // 5. Test PATCH /api/agent/assistants/[id] (Update Info & Password)
  console.log('\n--- 4. Testing PATCH /api/agent/assistants/[id] ---');
  const resPatch = await fetch(`${baseUrl}/api/agent/assistants/${createdAssistantId}`, {
    method: 'PATCH',
    headers: {
      Cookie: `mitraca_session=${agentToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Rudi Pratama Updated',
      phone: '081299997777',
      password: 'newpassword123',
    }),
  });
  const dataPatch = await resPatch.json();
  console.log('Patch Assistant Status:', resPatch.status);
  console.log('Patch Message:', dataPatch.message);
  if (!dataPatch.success) throw new Error('Patch assistant failed: ' + dataPatch.error);

  // 6. Test GET /api/agent/profile as OFFICER_AGENT
  console.log('\n--- 5. Testing GET /api/agent/profile as OFFICER_AGENT ---');
  const [officerUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, 'officer.ani@mitraca.com'))
    .limit(1);

  const officerToken = await signSessionToken({
    userId: officerUser.id,
    email: officerUser.email,
    name: officerUser.name,
    role: officerUser.role,
    branchId: officerUser.branchId,
    parentAgentId: officerUser.parentAgentId,
    parentAgentCode: agentMaster.agentCode,
  });

  const resOfficerProfile = await fetch(`${baseUrl}/api/agent/profile`, {
    headers: { Cookie: `mitraca_session=${officerToken}` },
  });
  const dataOfficerProfile = await resOfficerProfile.json();
  console.log('Officer View Status:', resOfficerProfile.status);
  console.log('Officer Caller Role:', dataOfficerProfile.callerRole);
  console.log('Officer Is Owner:', dataOfficerProfile.isOwner);
  console.log('Officer Is Officer:', dataOfficerProfile.isOfficer);
  console.log('Officer Sees Owner Name:', dataOfficerProfile.agent?.name);

  // Officer attempts to create assistant (Must be rejected with 403)
  const resOfficerCreate = await fetch(`${baseUrl}/api/agent/assistants`, {
    method: 'POST',
    headers: {
      Cookie: `mitraca_session=${officerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Illegal Assistant',
      email: 'illegal@mitraca.com',
      password: 'password123',
    }),
  });
  console.log('Officer Create Attempt Status (Expect 403):', resOfficerCreate.status);
  if (resOfficerCreate.status !== 403) {
    throw new Error('Security flaw: Officer was able to create assistant!');
  }

  // 7. Test DELETE /api/agent/assistants/[id]
  console.log('\n--- 6. Testing DELETE /api/agent/assistants/[id] ---');
  const resDelete = await fetch(`${baseUrl}/api/agent/assistants/${createdAssistantId}`, {
    method: 'DELETE',
    headers: { Cookie: `mitraca_session=${agentToken}` },
  });
  const dataDelete = await resDelete.json();
  console.log('Delete Assistant Status:', resDelete.status);
  console.log('Delete Message:', dataDelete.message);
  if (!dataDelete.success) throw new Error('Delete assistant failed: ' + dataDelete.error);

  // 8. Test SUPERADMIN National Summary & Inspector Mode
  console.log('\n--- 7. Testing SUPERADMIN National Summary & Inspector ---');
  const [superadminUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, 'superadmin@mitraca.com'))
    .limit(1);

  const superadminToken = await signSessionToken({
    userId: superadminUser.id,
    email: superadminUser.email,
    name: superadminUser.name,
    role: superadminUser.role,
  });

  // 8a. GET /api/agent/profile without agentId (National Summary)
  const resSaProfile = await fetch(`${baseUrl}/api/agent/profile`, {
    headers: { Cookie: `mitraca_session=${superadminToken}` },
  });
  const dataSaProfile = await resSaProfile.json();
  console.log('Superadmin Summary Status:', resSaProfile.status);
  console.log('Mode:', dataSaProfile.mode);
  console.log('Is National Role:', dataSaProfile.isNationalRole);
  console.log('Total Agents:', dataSaProfile.nationalKPI?.totalAgents);
  console.log('Total Assistants:', dataSaProfile.nationalKPI?.totalAssistants);
  console.log('National Gross Premium:', dataSaProfile.nationalKPI?.nationalGrossPremium);
  console.log('National Loss Ratio:', dataSaProfile.nationalKPI?.nationalLossRatio);
  if (dataSaProfile.mode !== 'NATIONAL_SUMMARY') {
    throw new Error('Expected NATIONAL_SUMMARY mode for Superadmin!');
  }

  // 8b. GET /api/agent/search?q=CITRA
  console.log('\n--- 8. Testing Agent Search for Inspector ---');
  const resSearch = await fetch(`${baseUrl}/api/agent/search?q=CITRA`, {
    headers: { Cookie: `mitraca_session=${superadminToken}` },
  });
  const dataSearch = await resSearch.json();
  console.log('Search Status:', resSearch.status);
  console.log('Found agents count:', dataSearch.agents?.length);
  if (!dataSearch.success || !Array.isArray(dataSearch.agents)) {
    throw new Error('Agent search failed!');
  }

  // 8c. Inspect specific agent with ?agentId=
  console.log('\n--- 9. Testing Superadmin Inspector Mode ---');
  const resSaInspect = await fetch(`${baseUrl}/api/agent/profile?agentId=${agentMaster.id}`, {
    headers: { Cookie: `mitraca_session=${superadminToken}` },
  });
  const dataSaInspect = await resSaInspect.json();
  console.log('Inspect Status:', resSaInspect.status);
  console.log('Mode:', dataSaInspect.mode);
  console.log('Inspected Agent Name:', dataSaInspect.agent?.name);
  if (dataSaInspect.mode !== 'INSPECT_AGENT' || dataSaInspect.agent?.id !== agentMaster.id) {
    throw new Error('Expected INSPECT_AGENT mode with correct agent id!');
  }

  // 9. Test AUDIT Role Read-Only Access
  console.log('\n--- 10. Testing AUDIT Role Read-Only Enforcement ---');
  const [auditUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, 'audit@mitraca.com'))
    .limit(1);

  const auditToken = await signSessionToken({
    userId: auditUser.id,
    email: auditUser.email,
    name: auditUser.name,
    role: auditUser.role,
  });

  // 9a. Audit profile fetch
  const resAuditProfile = await fetch(`${baseUrl}/api/agent/profile`, {
    headers: { Cookie: `mitraca_session=${auditToken}` },
  });
  const dataAuditProfile = await resAuditProfile.json();
  console.log('Audit Profile Status:', resAuditProfile.status);
  console.log('Audit isReadOnly:', dataAuditProfile.isReadOnly);
  if (resAuditProfile.status !== 200 || !dataAuditProfile.isReadOnly) {
    throw new Error('Audit should have 200 status and isReadOnly=true');
  }

  // 9b. Audit assistants fetch
  const resAuditAssistants = await fetch(`${baseUrl}/api/agent/assistants`, {
    headers: { Cookie: `mitraca_session=${auditToken}` },
  });
  const dataAuditAssistants = await resAuditAssistants.json();
  console.log('Audit Assistants Status:', resAuditAssistants.status);
  console.log('Audit canManage (Expect false):', dataAuditAssistants.canManage);
  if (dataAuditAssistants.canManage !== false) {
    throw new Error('Audit must have canManage: false');
  }

  // 9c. Audit attempt create assistant (Must return 403)
  const resAuditCreate = await fetch(`${baseUrl}/api/agent/assistants`, {
    method: 'POST',
    headers: {
      Cookie: `mitraca_session=${auditToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Audit Unauthorized Assistant',
      email: 'audit.illegal@mitraca.com',
      password: 'password123',
    }),
  });
  console.log('Audit Create Attempt Status (Expect 403):', resAuditCreate.status);
  if (resAuditCreate.status !== 403) {
    throw new Error('Security flaw: AUDIT was able to create assistant!');
  }

  // 10. Verify Audit Logs
  console.log('\n--- 11. Checking Audit Logs ---');
  const recentLogs = await db
    .select({
      action: auditLogs.action,
      description: auditLogs.description,
      status: auditLogs.status,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(eq(auditLogs.category, 'USER_MANAGEMENT'))
    .orderBy(desc(auditLogs.createdAt))
    .limit(3);

  console.log('Recent USER_MANAGEMENT Audit Logs:');
  recentLogs.forEach((l) => console.log(`- [${l.action}] ${l.description} (${l.status})`));

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 100% VERIFIED!');
  process.exit(0);
}

testAgentPortal().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
