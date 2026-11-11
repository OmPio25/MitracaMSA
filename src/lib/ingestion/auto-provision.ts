/**
 * Auto-Provisioning & Reconciliation Service
 * 
 * Core Rules Handled:
 * 1. Auto-provision Branch Master Data if not yet present in database.
 * 2. Auto-provision Placeholder Agent with status 'UNREGISTERED_IN_MASTER' if
 *    Production or Claims file arrives prior to the Master Agent file.
 * 3. Preserve foreign key referential integrity so premiums and claims are never orphaned.
 */

import { db } from '@/db';
import { branches, agents } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { normalizeBranch } from './sanitizer';

/**
 * Auto-provisions a Branch entity if it doesn't already exist.
 * Returns the Branch UUID.
 */
export async function getOrCreateBranch(rawBranchName: string | null | undefined): Promise<string | null> {
  const normalized = normalizeBranch(rawBranchName);
  if (!normalized) return null;

  // Check if branch exists by code
  const existing = await db
    .select({ id: branches.id })
    .from(branches)
    .where(eq(branches.code, normalized.code))
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  // Auto-provision branch master
  const [created] = await db
    .insert(branches)
    .values({
      code: normalized.code,
      name: normalized.name,
      rawAlias: rawBranchName ? String(rawBranchName).trim() : null,
      isAutoProvisioned: true,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: branches.code,
      set: {
        updatedAt: sql`NOW()`,
      },
    })
    .returning({ id: branches.id });

  return created.id;
}

/**
 * Ensures an Agent exists in the database.
 * If not found, auto-provisions a placeholder agent with 'UNREGISTERED_IN_MASTER'
 * so that Production and Claims records can link to a valid agent_id without data loss.
 */
export async function getOrCreateAgentPlaceholder(
  agentCode: string,
  rawBranchName?: string | null
): Promise<{ agentId: string; wasAutoProvisioned: boolean; branchId?: string | null }> {
  const cleanCode = agentCode.trim().toUpperCase();

  const existing = await db
    .select({ id: agents.id, uplineStatus: agents.uplineStatus, branchId: agents.branchId })
    .from(agents)
    .where(eq(agents.agentCode, cleanCode))
    .limit(1);

  if (existing.length > 0) {
    return {
      agentId: existing[0].id,
      wasAutoProvisioned: false,
      branchId: existing[0].branchId,
    };
  }

  // Provision Branch if supplied
  const branchId = await getOrCreateBranch(rawBranchName);

  // Create placeholder agent with status UNREGISTERED_IN_MASTER
  const [created] = await db
    .insert(agents)
    .values({
      agentCode: cleanCode,
      name: `UNREGISTERED AGENT (${cleanCode})`,
      uplineStatus: 'UNREGISTERED_IN_MASTER',
      materializedPath: `/${cleanCode}`,
      depth: 0,
      branchId: branchId,
      rawBranchName: rawBranchName ? String(rawBranchName).trim() : null,
      isPlaceholder: true,
      metadata: {
        autoProvisionedAt: new Date().toISOString(),
        reason: 'DISCOVERED_IN_PRODUCTION_OR_CLAIMS',
      },
    })
    .onConflictDoNothing({ target: agents.agentCode })
    .returning({ id: agents.id, branchId: agents.branchId });

  // If a race condition occurred and onConflictDoNothing kicked in, re-fetch
  if (!created) {
    const [fetched] = await db
      .select({ id: agents.id, branchId: agents.branchId })
      .from(agents)
      .where(eq(agents.agentCode, cleanCode));
    return { agentId: fetched.id, wasAutoProvisioned: false, branchId: fetched.branchId };
  }

  return {
    agentId: created.id,
    wasAutoProvisioned: true,
    branchId: branchId,
  };
}


/**
 * In-Memory High Performance Provisioning Cache
 * Preloads all branches & agents into RAM so lookups are 0ms.
 */
export class ProvisioningCache {
  private branchCache = new Map<string, string>();
  private agentCache = new Map<string, { agentId: string; wasAutoProvisioned: boolean; branchId?: string | null }>();

  async init(): Promise<void> {
    try {
      const allBranches = await db
        .select({ id: branches.id, code: branches.code, name: branches.name })
        .from(branches);
      for (const b of allBranches) {
        if (b.code) this.branchCache.set(b.code.trim().toUpperCase(), b.id);
        if (b.name) this.branchCache.set(b.name.trim().toUpperCase(), b.id);
      }

      const allAgents = await db
        .select({
          id: agents.id,
          agentCode: agents.agentCode,
          branchId: agents.branchId,
          uplineStatus: agents.uplineStatus,
        })
        .from(agents);
      for (const a of allAgents) {
        if (a.agentCode) {
          this.agentCache.set(a.agentCode.trim().toUpperCase(), {
            agentId: a.id,
            wasAutoProvisioned: a.uplineStatus === 'UNREGISTERED_IN_MASTER',
            branchId: a.branchId,
          });
        }
      }
    } catch (err) {
      console.warn('ProvisioningCache init warning:', err);
    }
  }

  async getOrCreateBranch(rawBranchName: string | null | undefined): Promise<string | null> {
    const normalized = normalizeBranch(rawBranchName);
    if (!normalized) return null;
    const cacheKey = normalized.code.trim().toUpperCase();
    if (this.branchCache.has(cacheKey)) {
      return this.branchCache.get(cacheKey)!;
    }
    const branchId = await getOrCreateBranch(rawBranchName);
    if (branchId) {
      this.branchCache.set(cacheKey, branchId);
      this.branchCache.set(normalized.name.trim().toUpperCase(), branchId);
    }
    return branchId;
  }

  async getOrCreateAgentPlaceholder(
    agentCode: string,
    rawBranchName?: string | null
  ): Promise<{ agentId: string; wasAutoProvisioned: boolean; branchId?: string | null }> {
    const cleanCode = (agentCode || '').trim().toUpperCase();
    if (this.agentCache.has(cleanCode)) {
      return this.agentCache.get(cleanCode)!;
    }
    const agentHolder = await getOrCreateAgentPlaceholder(cleanCode, rawBranchName);
    this.agentCache.set(cleanCode, agentHolder);
    return agentHolder;
  }
}
