/**
 * Self-Healing Hierarchy Engine
 * 
 * Core Rules Handled:
 * 1. If KodeUpline is not yet in the database:
 *    - Row is NEVER rejected.
 *    - Agent is persisted with upline_agent_code recorded, uplineStatus = 'PENDING_UPLINE'.
 *    - Batch log registers a Warning ("Agen belum terdaftar, disimpan dengan status PENDING_UPLINE").
 * 2. When the upline is subsequently uploaded:
 *    - System automatically links parent_id.
 *    - Recomputes materialized_path and depth.
 *    - Cascades through all downline descendants recursively.
 *    - No manual re-upload of downline records required.
 */

import { db } from '@/db';
import { agents } from '@/db/schema';
import { sql } from 'drizzle-orm';

export interface SelfHealingResult {
  iterations: number;
  totalResolved: number;
}

/**
 * Executes a recursive self-healing pass on all PENDING_UPLINE records.
 * Can be called after any Master Agent batch upload or scheduled as a maintenance task.
 */
export async function executeSelfHealingPass(): Promise<SelfHealingResult> {
  let totalResolved = 0;
  let iteration = 0;
  let rowsUpdated = 1;
  const MAX_ITERATIONS = 50; // Safeguard against circular hierarchy references

  while (rowsUpdated > 0 && iteration < MAX_ITERATIONS) {
    iteration++;

    // Single atomic CTE update that finds pending downlines whose upline is now LINKED or ROOT
    const result = await db.execute(sql`
      WITH resolvable AS (
        SELECT 
          child.id AS child_id,
          parent.id AS resolved_parent_id,
          COALESCE(parent.materialized_path, '/' || parent.agent_code) || '/' || child.agent_code AS computed_path,
          COALESCE(parent.depth, 0) + 1 AS computed_depth
        FROM agents child
        INNER JOIN agents parent 
          ON child.upline_agent_code = parent.agent_code
          AND parent.deleted_at IS NULL
          AND parent.upline_status IN ('LINKED', 'ROOT')
        WHERE child.upline_status = 'PENDING_UPLINE'
          AND child.deleted_at IS NULL
      )
      UPDATE agents target
      SET 
        parent_id = r.resolved_parent_id,
        upline_status = 'LINKED',
        materialized_path = r.computed_path,
        depth = r.computed_depth,
        updated_at = NOW()
      FROM resolvable r
      WHERE target.id = r.child_id;
    `);

    // In node-postgres / drizzle execute, rowCount indicates affected rows
    rowsUpdated = Number((result as any).rowCount ?? 0);
    totalResolved += rowsUpdated;
  }

  // Refresh all materialized_paths to maintain full tree consistency
  await refreshAllHierarchyPaths();

  return {
    iterations: iteration,
    totalResolved,
  };
}

/**
 * Recomputes materialized_path and depth for all agents in the database
 * using an atomic recursive CTE.
 */
export async function refreshAllHierarchyPaths(): Promise<void> {
  await db.execute(sql`
    WITH RECURSIVE hierarchy_paths AS (
      SELECT 
        id,
        agent_code,
        '/' || agent_code AS computed_path,
        0 AS computed_depth
      FROM agents
      WHERE parent_id IS NULL AND deleted_at IS NULL

      UNION ALL

      SELECT 
        c.id,
        c.agent_code,
        p.computed_path || '/' || c.agent_code AS computed_path,
        p.computed_depth + 1 AS computed_depth
      FROM agents c
      JOIN hierarchy_paths p ON c.parent_id = p.id
      WHERE c.deleted_at IS NULL
    )
    UPDATE agents a
    SET 
      materialized_path = h.computed_path,
      depth = h.computed_depth
    FROM hierarchy_paths h
    WHERE a.id = h.id;
  `);
}

/**
 * Migration SQL snippet for the database-level AFTER INSERT OR UPDATE trigger.
 * This guarantees real-time self-healing at the Postgres kernel level.
 */
export const postgresSelfHealingTriggerSQL = sql`
CREATE OR REPLACE FUNCTION trg_self_heal_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. When an agent becomes LINKED or ROOT, auto-link any pending downlines waiting for this agent_code
  IF (NEW.upline_status IN ('LINKED', 'ROOT')) THEN
    UPDATE agents child
    SET 
      parent_id = NEW.id,
      upline_status = 'LINKED',
      materialized_path = COALESCE(NEW.materialized_path, '/' || NEW.agent_code) || '/' || child.agent_code,
      depth = COALESCE(NEW.depth, 0) + 1,
      updated_at = NOW()
    WHERE child.upline_agent_code = NEW.agent_code
      AND child.upline_status = 'PENDING_UPLINE'
      AND child.deleted_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_agent_self_heal ON agents;

CREATE TRIGGER trigger_agent_self_heal
  AFTER INSERT OR UPDATE OF upline_status, materialized_path, depth
  ON agents
  FOR EACH ROW
  EXECUTE FUNCTION trg_self_heal_hierarchy();
`;
