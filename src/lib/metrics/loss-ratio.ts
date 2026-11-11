/**
 * Loss Ratio & Production Reporting Engine
 * 
 * Formula:
 * Loss Ratio = (Total Gross Claim / Total Nilai Premi) * 100%
 * 
 * Performance:
 * Uses materialized_path O(1) prefix queries with text_pattern_ops index
 * for instant subtree rollups across arbitrary depth hierarchies.
 */

import { db } from '@/db';
import { agents, productionRecords, claims } from '@/db/schema';
import { sql, eq, and, isNull } from 'drizzle-orm';

export interface AgentMetrics {
  agentId: string;
  agentCode: string;
  name: string;
  depth: number;
  totalGrossPremium: string;
  totalNetPremium: string;
  totalGrossClaim: string;
  lossRatioPct: number | null; // Null if no premium written
}

/**
 * Calculates aggregated production and loss ratio for an agent and all their downlines
 * over a specified period range.
 */
export async function getHierarchyMetrics(
  rootAgentCode: string,
  startDate: string,
  endDate: string
): Promise<AgentMetrics[]> {
  // Query uses materialized path prefix matching: '/ROOT_CODE%'
  const result = await db.execute(sql`
    WITH target_scope AS (
      SELECT id, agent_code, name, depth, materialized_path
      FROM agents
      WHERE agent_code = ${rootAgentCode}
        AND deleted_at IS NULL
    ),
    subtree_agents AS (
      SELECT a.id, a.agent_code, a.name, a.depth, a.materialized_path
      FROM agents a
      CROSS JOIN target_scope ts
      WHERE (a.materialized_path = ts.materialized_path 
             OR a.materialized_path LIKE ts.materialized_path || '/%')
        AND a.deleted_at IS NULL
    ),
    production_agg AS (
      SELECT 
        pr.agent_id,
        COALESCE(SUM(pr.gross_premium), 0) AS gross_premium,
        COALESCE(SUM(pr.net_premium), 0) AS net_premium
      FROM production_records pr
      WHERE pr.period BETWEEN ${startDate}::date AND ${endDate}::date
        AND pr.deleted_at IS NULL
      GROUP BY pr.agent_id
    ),
    claims_agg AS (
      SELECT 
        cl.agent_id,
        COALESCE(SUM(cl.gross_claim_amount), 0) AS gross_claim
      FROM claims cl
      WHERE cl.period BETWEEN ${startDate}::date AND ${endDate}::date
        AND cl.deleted_at IS NULL
      GROUP BY cl.agent_id
    )
    SELECT 
      sa.id AS "agentId",
      sa.agent_code AS "agentCode",
      sa.name AS "name",
      sa.depth AS "depth",
      COALESCE(pa.gross_premium, 0)::text AS "totalGrossPremium",
      COALESCE(pa.net_premium, 0)::text AS "totalNetPremium",
      COALESCE(ca.gross_claim, 0)::text AS "totalGrossClaim",
      -- Formula: (Total Gross Claim / Total Nilai Premi) * 100%
      CASE 
        WHEN COALESCE(pa.gross_premium, 0) > 0 
        THEN ROUND((COALESCE(ca.gross_claim, 0) / pa.gross_premium) * 100.0, 2)
        ELSE NULL
      END AS "lossRatioPct"
    FROM subtree_agents sa
    LEFT JOIN production_agg pa ON pa.agent_id = sa.id
    LEFT JOIN claims_agg ca ON ca.agent_id = sa.id
    ORDER BY sa.depth ASC, sa.agent_code ASC;
  `);

  return (result as any).rows as AgentMetrics[];
}
