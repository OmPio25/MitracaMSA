/**
 * Database Seed Script for MitracaMSA Phase 1
 * 
 * Provisions:
 * 1. Initial Branches (Jakarta Selatan, Surabaya Pusat)
 * 2. Initial Hierarchy Tree (Director -> Manager -> Agent)
 * 3. 7 Test Users representing every single role with exact data scoping
 */

import { db } from './index';
import { branches, agents, users } from './schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('🌱 Starting MitracaMSA Phase 1 Database Seeding...');

  // 1. Seed Branches (49 Official Branches)
  console.log('🏢 Seeding branches...');
  const [branchPusat] = await db
    .insert(branches)
    .values({
      code: '88',
      name: 'Pusat',
      rawAlias: '88 - PUSAT',
      isAutoProvisioned: false,
    })
    .onConflictDoUpdate({
      target: branches.code,
      set: { name: 'Pusat' },
    })
    .returning();

  const [branchSurabaya] = await db
    .insert(branches)
    .values({
      code: '31',
      name: 'Surabaya',
      rawAlias: '31 - SURABAYA',
      isAutoProvisioned: false,
    })
    .onConflictDoUpdate({
      target: branches.code,
      set: { name: 'Surabaya' },
    })
    .returning();

  // 2. Seed Initial Hierarchy Agents
  console.log('👥 Seeding initial agency hierarchy...');

  // Level 0: Agency Director (ROOT)
  const [agentDirector] = await db
    .insert(agents)
    .values({
      agentCode: 'DIR001',
      name: 'Ahmad Dahlan',
      profId: 'PROF-DIR-01',
      statusKeagenan: 'AKTIF',
      peringkat: 'Agency Director',
      rawBranchName: 'Pusat',
      branchId: branchPusat.id,
      uplineStatus: 'ROOT',
      materializedPath: '/DIR001',
      depth: 0,
      isPlaceholder: false,
    })
    .onConflictDoUpdate({
      target: agents.agentCode,
      set: { name: 'Ahmad Dahlan', uplineStatus: 'ROOT' },
    })
    .returning();

  // Level 1: Business Manager (Upline: DIR001)
  const [agentManager] = await db
    .insert(agents)
    .values({
      agentCode: 'BM001',
      name: 'Budi Santoso',
      profId: 'PROF-BM-01',
      statusKeagenan: 'AKTIF',
      uplineAgentCode: 'DIR001',
      parentId: agentDirector.id,
      peringkat: 'Business Manager',
      rawBranchName: 'Pusat',
      branchId: branchPusat.id,
      uplineStatus: 'LINKED',
      materializedPath: '/DIR001/BM001',
      depth: 1,
      isPlaceholder: false,
    })
    .onConflictDoUpdate({
      target: agents.agentCode,
      set: { name: 'Budi Santoso', parentId: agentDirector.id },
    })
    .returning();

  // Level 2: Field Agent (Upline: BM001)
  const [agentCitra] = await db
    .insert(agents)
    .values({
      agentCode: 'AGT001',
      name: 'Citra Lestari',
      profId: 'PROF-AGT-01',
      statusKeagenan: 'AKTIF',
      uplineAgentCode: 'BM001',
      parentId: agentManager.id,
      peringkat: 'Agent',
      rawBranchName: 'Pusat',
      branchId: branchPusat.id,
      uplineStatus: 'LINKED',
      materializedPath: '/DIR001/BM001/AGT001',
      depth: 2,
      isPlaceholder: false,
    })
    .onConflictDoUpdate({
      target: agents.agentCode,
      set: { name: 'Citra Lestari', parentId: agentManager.id },
    })
    .returning();

  // 3. Seed 7 Users for 7 Roles
  console.log('🔐 Seeding 7 users with distinct data scoping...');
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const testUsers = [
    {
      email: 'superadmin@mitraca.com',
      name: 'Super Administrator',
      role: 'SUPERADMIN' as const,
      passwordHash,
      branchId: null,
      agentId: null,
      parentAgentId: null,
    },
    {
      email: 'admin@mitraca.com',
      name: 'Operational Admin',
      role: 'ADMIN' as const,
      passwordHash,
      branchId: null,
      agentId: null,
      parentAgentId: null,
    },
    {
      email: 'kacab.jaksel@mitraca.com',
      name: 'Kepala Cabang Jakarta Selatan',
      role: 'KACAB' as const,
      passwordHash,
      branchId: branchPusat.id,
      agentId: null,
      parentAgentId: null,
    },
    {
      email: 'pic.jaksel@mitraca.com',
      name: 'PIC Cabang Jakarta Selatan',
      role: 'PIC_CABANG' as const,
      passwordHash,
      branchId: branchPusat.id,
      agentId: null,
      parentAgentId: null,
    },
    {
      email: 'agent.citra@mitraca.com',
      name: 'Citra Lestari (Agent)',
      role: 'AGENT' as const,
      passwordHash,
      branchId: branchPusat.id,
      agentId: agentCitra.id,
      parentAgentId: null,
    },
    {
      email: 'officer.ani@mitraca.com',
      name: 'Ani Suryani (Officer of Citra)',
      role: 'OFFICER_AGENT' as const,
      passwordHash,
      branchId: branchPusat.id,
      agentId: null,
      parentAgentId: agentCitra.id, // Scoped identically to Citra
    },
    {
      email: 'audit@mitraca.com',
      name: 'Internal Auditor',
      role: 'AUDIT' as const,
      passwordHash,
      branchId: null,
      agentId: null,
      parentAgentId: null,
    },
  ];

  for (const u of testUsers) {
    await db
      .insert(users)
      .values(u)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          name: u.name,
          role: u.role,
          branchId: u.branchId,
          agentId: u.agentId,
          parentAgentId: u.parentAgentId,
        },
      });
  }

  console.log('✅ Seeding complete! 7 roles and test hierarchy are ready.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
