/**
 * Multi-Tenant-like RBAC Data Filtering Engine
 * 
 * Implements strict data isolation across the 7 User Roles:
 * 1. SUPERADMIN: Full national scope, all modules.
 * 2. ADMIN: Operational upload permissions, full national scope.
 * 3. KACAB: Scoped strictly to branch_id.
 * 4. PIC_CABANG: Scoped strictly to branch_id.
 * 5. AGENT: Personal data + full recursive downline (materialized_path matching).
 * 6. OFFICER_AGENT: Identical scope to owning Agent (parent_agent_id).
 * 7. AUDIT: Read-only access across full national data.
 */

import { SQL, sql, eq, or, and } from 'drizzle-orm';
import { agents, productionRecords, claims } from '@/db/schema';

export type UserRole = 
  | 'SUPERADMIN'
  | 'ADMIN'
  | 'KACAB'
  | 'PIC_CABANG'
  | 'AGENT'
  | 'OFFICER_AGENT'
  | 'AUDIT';

export interface UserSessionContext {
  userId: string;
  role: UserRole;
  branchId?: string | null;      // Required for KACAB & PIC_CABANG
  agentId?: string | null;       // Required for AGENT
  parentAgentId?: string | null; // Required for OFFICER_AGENT (references owner agent)
}

/**
 * Generates SQL condition for filtering the `agents` table based on the user's role.
 */
export function getAgentScopeFilter(ctx: UserSessionContext): SQL | undefined {
  switch (ctx.role) {
    case 'SUPERADMIN':
    case 'ADMIN':
    case 'AUDIT':
      // National scope: No filter
      return undefined;

    case 'KACAB':
    case 'PIC_CABANG':
      if (!ctx.branchId) {
        // Safety guard: if branchId is missing on user, return false condition (deny access)
        return sql`1 = 0`;
      }
      return eq(agents.branchId, ctx.branchId);

    case 'AGENT': {
      const targetAgentId = ctx.agentId;
      if (!targetAgentId) return sql`1 = 0`;

      // Filter: Agent themselves OR any agent whose materialized_path starts with this agent's code
      return sql`
        (${agents.id} = ${targetAgentId}::uuid OR 
         ${agents.materializedPath} LIKE (
           SELECT COALESCE(materialized_path, '/' || agent_code) || '/%' 
           FROM agents 
           WHERE id = ${targetAgentId}::uuid
         ))
      `;
    }

    case 'OFFICER_AGENT': {
      // OFFICER_AGENT has IDENTICAL scope to their owner agent (parentAgentId)
      const ownerAgentId = ctx.parentAgentId || ctx.agentId;
      if (!ownerAgentId) return sql`1 = 0`;

      return sql`
        (${agents.id} = ${ownerAgentId}::uuid OR 
         ${agents.materializedPath} LIKE (
           SELECT COALESCE(materialized_path, '/' || agent_code) || '/%' 
           FROM agents 
           WHERE id = ${ownerAgentId}::uuid
         ))
      `;
    }

    default:
      return sql`1 = 0`;
  }
}

/**
 * Generates SQL condition for filtering `production_records` based on the user's role.
 */
export function getProductionScopeFilter(ctx: UserSessionContext): SQL | undefined {
  switch (ctx.role) {
    case 'SUPERADMIN':
    case 'ADMIN':
    case 'AUDIT':
      return undefined;

    case 'KACAB':
    case 'PIC_CABANG':
      if (!ctx.branchId) return sql`1 = 0`;
      return eq(productionRecords.branchId, ctx.branchId);

    case 'AGENT':
    case 'OFFICER_AGENT': {
      const effectiveAgentId = ctx.role === 'OFFICER_AGENT' 
        ? (ctx.parentAgentId || ctx.agentId) 
        : ctx.agentId;

      if (!effectiveAgentId) return sql`1 = 0`;

      // Subtree production filter: agent itself + all downlines
      return sql`
        ${productionRecords.agentId} IN (
          SELECT id FROM agents 
          WHERE id = ${effectiveAgentId}::uuid 
             OR materialized_path LIKE (
               SELECT COALESCE(materialized_path, '/' || agent_code) || '/%' 
               FROM agents 
               WHERE id = ${effectiveAgentId}::uuid
             )
        )
      `;
    }

    default:
      return sql`1 = 0`;
  }
}

/**
 * Generates SQL condition for filtering `claims` based on the user's role.
 */
export function getClaimScopeFilter(ctx: UserSessionContext): SQL | undefined {
  switch (ctx.role) {
    case 'SUPERADMIN':
    case 'ADMIN':
    case 'AUDIT':
      return undefined;

    case 'KACAB':
    case 'PIC_CABANG':
      if (!ctx.branchId) return sql`1 = 0`;
      return eq(claims.branchId, ctx.branchId);

    case 'AGENT':
    case 'OFFICER_AGENT': {
      const effectiveAgentId = ctx.role === 'OFFICER_AGENT' 
        ? (ctx.parentAgentId || ctx.agentId) 
        : ctx.agentId;

      if (!effectiveAgentId) return sql`1 = 0`;

      return sql`
        ${claims.agentId} IN (
          SELECT id FROM agents 
          WHERE id = ${effectiveAgentId}::uuid 
             OR materialized_path LIKE (
               SELECT COALESCE(materialized_path, '/' || agent_code) || '/%' 
               FROM agents 
               WHERE id = ${effectiveAgentId}::uuid
             )
        )
      `;
    }

    default:
      return sql`1 = 0`;
  }
}

/**
 * Role Permission Check Matrix
 */
export function canUpload(role: UserRole): boolean {
  return role === 'SUPERADMIN' || role === 'ADMIN';
}

export function isReadOnly(role: UserRole): boolean {
  return role === 'AUDIT';
}
