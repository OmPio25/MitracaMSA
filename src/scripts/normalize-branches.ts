/**
 * Database Migration Script: Normalize Branches
 * Standarisasi seluruh data cabang ke 49 Cabang Resmi Fixed.
 */

import { db } from '../db';
import { branches, agents, productionRecords, claims, users } from '../db/schema';
import { FIXED_BRANCHES } from '../lib/constants/branches';
import { normalizeBranch } from '../lib/ingestion/sanitizer';
import { eq, sql } from 'drizzle-orm';

async function main() {
  console.log('🚀 Memulai standarisasi & normalisasi 49 Cabang Master...');

  // 1. Ambil seluruh data cabang yang ada di DB saat ini
  const existingBranches = await db.select().from(branches);
  console.log(`📊 Total cabang saat ini di DB: ${existingBranches.length}`);

  // Peta code resmi -> branch record di DB
  const officialBranchMap = new Map<string, typeof branches.$inferSelect>();

  // 2. Pastikan ke-49 Cabang Resmi terdaftar di DB
  for (const fb of FIXED_BRANCHES) {
    // Cari apakah sudah ada cabang dengan code resmi ini
    let found = existingBranches.find((b) => b.code === fb.code);

    if (!found) {
      // Cari apakah ada cabang lama yang namanya sama persis atau slug lamanya
      found = existingBranches.find(
        (b) =>
          b.name.trim().toLowerCase() === fb.name.trim().toLowerCase() ||
          b.code.replace(/[^A-Z0-9]/g, '') === fb.name.toUpperCase().replace(/[^A-Z0-9]/g, '')
      );
    }

    if (found) {
      // Perbarui code dan name ke standar resmi
      const [updated] = await db
        .update(branches)
        .set({
          code: fb.code,
          name: fb.name,
          rawAlias: found.rawAlias || `${fb.code} - ${fb.name.toUpperCase()}`,
          isAutoProvisioned: false,
          isActive: true,
          updatedAt: sql`NOW()`,
        })
        .where(eq(branches.id, found.id))
        .returning();

      officialBranchMap.set(fb.code, updated);
      console.log(`  ✓ Diperbarui: [${fb.code}] ${fb.name} (ID: ${found.id})`);
    } else {
      // Buat baru jika belum ada
      const [inserted] = await db
        .insert(branches)
        .values({
          code: fb.code,
          name: fb.name,
          rawAlias: `${fb.code} - ${fb.name.toUpperCase()}`,
          isAutoProvisioned: false,
          isActive: true,
        })
        .returning();

      officialBranchMap.set(fb.code, inserted);
      console.log(`  + Ditambahkan baru: [${fb.code}] ${fb.name} (ID: ${inserted.id})`);
    }
  }

  // 3. Normalisasi relasi pada tabel agents
  console.log('\n🔄 Menstandarisasi relasi branch_id pada tabel agents...');
  const allAgents = await db
    .select({
      id: agents.id,
      agentCode: agents.agentCode,
      rawBranchName: agents.rawBranchName,
      branchId: agents.branchId,
    })
    .from(agents);

  let updatedAgentsCount = 0;
  for (const a of allAgents) {
    const norm = normalizeBranch(a.rawBranchName);
    if (norm && officialBranchMap.has(norm.code)) {
      const targetBranch = officialBranchMap.get(norm.code)!;
      if (a.branchId !== targetBranch.id || a.rawBranchName !== targetBranch.name) {
        await db
          .update(agents)
          .set({
            branchId: targetBranch.id,
            rawBranchName: targetBranch.name,
            updatedAt: sql`NOW()`,
          })
          .where(eq(agents.id, a.id));
        updatedAgentsCount++;
      }
    }
  }
  console.log(`  ✓ ${updatedAgentsCount} agen berhasil diselaraskan ke cabang resmi.`);

  // 4. Normalisasi relasi pada tabel production_records
  console.log('\n🔄 Menstandarisasi relasi branch_id pada tabel production_records...');
  const allProd = await db
    .select({
      id: productionRecords.id,
      rawBranch: productionRecords.rawBranch,
      branchId: productionRecords.branchId,
    })
    .from(productionRecords);

  let updatedProdCount = 0;
  for (const pr of allProd) {
    const norm = normalizeBranch(pr.rawBranch);
    if (norm && officialBranchMap.has(norm.code)) {
      const targetBranch = officialBranchMap.get(norm.code)!;
      if (pr.branchId !== targetBranch.id) {
        await db
          .update(productionRecords)
          .set({
            branchId: targetBranch.id,
            rawBranch: `${targetBranch.code} - ${targetBranch.name.toUpperCase()}`,
            updatedAt: sql`NOW()`,
          })
          .where(eq(productionRecords.id, pr.id));
        updatedProdCount++;
      }
    }
  }
  console.log(`  ✓ ${updatedProdCount} data produksi berhasil diselaraskan ke cabang resmi.`);

  // 5. Bersihkan cabang duplikat / obsolete yang sudah tidak memiliki referensi
  console.log('\n🧹 Membersihkan cabang lama/duplikat yang sudah dimerge...');
  const officialIds = Array.from(officialBranchMap.values()).map((b) => b.id);
  const obsoleteBranches = await db.select().from(branches);

  let deletedCount = 0;
  for (const b of obsoleteBranches) {
    if (!officialIds.includes(b.id)) {
      // Cek apakah masih ada agen atau produksi yang mengarah ke sini
      const [agentRef] = await db
        .select({ count: sql<number>`count(*)` })
        .from(agents)
        .where(eq(agents.branchId, b.id));
      const [prodRef] = await db
        .select({ count: sql<number>`count(*)` })
        .from(productionRecords)
        .where(eq(productionRecords.branchId, b.id));

      if (Number(agentRef?.count || 0) === 0 && Number(prodRef?.count || 0) === 0) {
        await db.delete(branches).where(eq(branches.id, b.id));
        deletedCount++;
        console.log(`  - Dihapus cabang obsolete: [${b.code}] ${b.name}`);
      } else {
        console.warn(`  ⚠️ Masih ada referensi pada [${b.code}] ${b.name}: ${agentRef?.count} agen, ${prodRef?.count} produksi`);
      }
    }
  }
  console.log(`  ✓ ${deletedCount} cabang obsolete berhasil dibersihkan.`);

  // 6. Ringkasan akhir
  const finalBranches = await db.select().from(branches);
  console.log(`\n🎉 SELESAI! Total Cabang Resmi di Database: ${finalBranches.length} cabang.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error saat migrasi cabang:', err);
    process.exit(1);
  });
