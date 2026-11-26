import { db } from '@/db';
import { sql } from 'drizzle-orm';

/**
 * Menghitung daftar tahun cutoff yang dipre-agregasi ke Materialized View
 * (5 tahun terakhir + tahun depan untuk siklus 14 Nov - 13 Nov, serta 0 = ALL TIME).
 */
function getPrecomputedCutoffYears(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [0]; // 0 = All-Time
  for (let y = currentYear - 5; y <= currentYear + 1; y++) {
    years.push(y);
  }
  return years;
}

/**
 * Membuat ekstensi pg_trgm, GIN trigram indexes untuk pencarian cepat Explorer/Agent,
 * serta Materialized Views untuk ringkasan Loss Ratio per Cabang & per Agen.
 */
export async function ensurePerformanceObjects(): Promise<{
  pgTrgmEnabled: boolean;
  indexesCreated: number;
  materializedViewsCreated: number;
}> {
  // 1. Aktifkan ekstensi pg_trgm
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

  // 2. Partial GIN Trigram Indexes (mempercepat ILIKE '%keyword%' pada 60k+ baris)
  const trigramIndexes = [
    // Production Records
    `CREATE INDEX IF NOT EXISTS idx_pr_policy_no_trgm ON production_records USING gin (policy_no gin_trgm_ops) WHERE deleted_at IS NULL`,
    `CREATE INDEX IF NOT EXISTS idx_pr_insured_name_trgm ON production_records USING gin (insured_name gin_trgm_ops) WHERE deleted_at IS NULL`,
    `CREATE INDEX IF NOT EXISTS idx_pr_agent_name_trgm ON production_records USING gin (agent_name gin_trgm_ops) WHERE deleted_at IS NULL`,
    `CREATE INDEX IF NOT EXISTS idx_pr_source_agent_id_trgm ON production_records USING gin (source_agent_id gin_trgm_ops) WHERE deleted_at IS NULL`,
    `CREATE INDEX IF NOT EXISTS idx_pr_spau_no_trgm ON production_records USING gin (spau_no gin_trgm_ops) WHERE deleted_at IS NULL`,
    // Claims
    `CREATE INDEX IF NOT EXISTS idx_cl_claim_no_trgm ON claims USING gin (claim_no gin_trgm_ops) WHERE deleted_at IS NULL`,
    `CREATE INDEX IF NOT EXISTS idx_cl_policy_no_trgm ON claims USING gin (policy_no gin_trgm_ops) WHERE deleted_at IS NULL`,
    `CREATE INDEX IF NOT EXISTS idx_cl_source_agent_id_trgm ON claims USING gin (source_agent_id gin_trgm_ops) WHERE deleted_at IS NULL`,
    `CREATE INDEX IF NOT EXISTS idx_cl_cause_of_loss_trgm ON claims USING gin (cause_of_loss gin_trgm_ops) WHERE deleted_at IS NULL`,
    `CREATE INDEX IF NOT EXISTS idx_cl_nama_produk_trgm ON claims USING gin (nama_produk gin_trgm_ops) WHERE deleted_at IS NULL`,
    // Agents
    `CREATE INDEX IF NOT EXISTS idx_ag_agent_code_trgm ON agents USING gin (agent_code gin_trgm_ops) WHERE deleted_at IS NULL`,
    `CREATE INDEX IF NOT EXISTS idx_ag_name_trgm ON agents USING gin (name gin_trgm_ops) WHERE deleted_at IS NULL`,
  ];

  for (const stmt of trigramIndexes) {
    await db.execute(sql.raw(stmt));
  }

  // 3. Materialized View: Ringkasan Loss Ratio per Cabang & Cutoff Year (0 = All Time)
  const years = getPrecomputedCutoffYears();
  const yearsValuesSql = years.map((y) => `(${y})`).join(', ');

  await db.execute(sql`DROP MATERIALIZED VIEW IF EXISTS mv_branch_cutoff_summary`);
  await db.execute(
    sql.raw(`
      CREATE MATERIALIZED VIEW mv_branch_cutoff_summary AS
      WITH cutoff_windows AS (
        SELECT
          y.cutoff_year,
          CASE WHEN y.cutoff_year = 0 THEN NULL::date ELSE make_date(y.cutoff_year - 1, 11, 14) END AS start_date,
          CASE WHEN y.cutoff_year = 0 THEN NULL::date ELSE make_date(y.cutoff_year, 11, 13) END AS end_date
        FROM (VALUES ${yearsValuesSql}) AS y(cutoff_year)
      ),
      prod_agg AS (
        SELECT
          cw.cutoff_year,
          pr.branch_id,
          pr.is_mm,
          COALESCE(SUM(pr.nilai_premi), 0)::numeric(18,2) AS total_premi,
          COALESCE(SUM(pr.nilai_komisi), 0)::numeric(18,2) AS total_komisi,
          COALESCE(SUM(pr.nilai_akusisi), 0)::numeric(18,2) AS total_akusisi,
          COUNT(DISTINCT pr.policy_no)::integer AS policy_count,
          COUNT(pr.id)::integer AS record_count
        FROM cutoff_windows cw
        JOIN production_records pr
          ON pr.deleted_at IS NULL
          AND pr.branch_id IS NOT NULL
          AND (
            cw.cutoff_year = 0
            OR (
              COALESCE(pr.issue_date, pr.start_period) >= cw.start_date
              AND COALESCE(pr.issue_date, pr.start_period) <= cw.end_date
            )
          )
        GROUP BY cw.cutoff_year, pr.branch_id, pr.is_mm
      ),
      claim_agg AS (
        SELECT
          cw.cutoff_year,
          COALESCE(cl.branch_id, ag.branch_id) AS branch_id,
          cl.is_mm,
          COALESCE(SUM(cl.gross_claim), 0)::numeric(18,2) AS total_claim,
          COUNT(DISTINCT cl.claim_no)::integer AS claim_count,
          COUNT(cl.id)::integer AS claim_record_count
        FROM cutoff_windows cw
        JOIN claims cl ON cl.deleted_at IS NULL
        LEFT JOIN agents ag ON cl.agent_id = ag.id
        WHERE COALESCE(cl.branch_id, ag.branch_id) IS NOT NULL
          AND (
            cw.cutoff_year = 0
            OR (
              cl.date_of_settlement >= cw.start_date
              AND cl.date_of_settlement <= cw.end_date
            )
          )
        GROUP BY cw.cutoff_year, COALESCE(cl.branch_id, ag.branch_id), cl.is_mm
      )
      SELECT
        COALESCE(p.cutoff_year, c.cutoff_year) AS cutoff_year,
        COALESCE(p.branch_id, c.branch_id) AS branch_id,
        COALESCE(p.is_mm, c.is_mm) AS is_mm,
        COALESCE(p.total_premi, 0)::numeric(18,2) AS total_premi,
        COALESCE(p.total_komisi, 0)::numeric(18,2) AS total_komisi,
        COALESCE(p.total_akusisi, 0)::numeric(18,2) AS total_akusisi,
        COALESCE(p.policy_count, 0)::integer AS policy_count,
        COALESCE(p.record_count, 0)::integer AS record_count,
        COALESCE(c.total_claim, 0)::numeric(18,2) AS total_claim,
        COALESCE(c.claim_count, 0)::integer AS claim_count,
        COALESCE(c.claim_record_count, 0)::integer AS claim_record_count
      FROM prod_agg p
      FULL OUTER JOIN claim_agg c
        ON p.cutoff_year = c.cutoff_year
        AND p.branch_id = c.branch_id
        AND p.is_mm = c.is_mm
    `)
  );

  await db.execute(sql`
    CREATE UNIQUE INDEX idx_mv_branch_cutoff_unique
    ON mv_branch_cutoff_summary (cutoff_year, branch_id, is_mm)
  `);

  // 4. Materialized View: Ringkasan Loss Ratio per Agen & Cutoff Year (MM)
  await db.execute(sql`DROP MATERIALIZED VIEW IF EXISTS mv_agent_cutoff_summary`);
  await db.execute(
    sql.raw(`
      CREATE MATERIALIZED VIEW mv_agent_cutoff_summary AS
      WITH cutoff_windows AS (
        SELECT
          y.cutoff_year,
          CASE WHEN y.cutoff_year = 0 THEN NULL::date ELSE make_date(y.cutoff_year - 1, 11, 14) END AS start_date,
          CASE WHEN y.cutoff_year = 0 THEN NULL::date ELSE make_date(y.cutoff_year, 11, 13) END AS end_date
        FROM (VALUES ${yearsValuesSql}) AS y(cutoff_year)
      ),
      prod_agg AS (
        SELECT
          cw.cutoff_year,
          pr.agent_id,
          COALESCE(SUM(pr.nilai_premi), 0)::numeric(18,2) AS total_premi,
          COALESCE(SUM(pr.nilai_komisi), 0)::numeric(18,2) AS total_komisi,
          COUNT(DISTINCT pr.policy_no)::integer AS policy_count
        FROM cutoff_windows cw
        JOIN production_records pr
          ON pr.deleted_at IS NULL
          AND pr.is_mm = true
          AND pr.agent_id IS NOT NULL
          AND (
            cw.cutoff_year = 0
            OR (
              COALESCE(pr.issue_date, pr.start_period) >= cw.start_date
              AND COALESCE(pr.issue_date, pr.start_period) <= cw.end_date
            )
          )
        GROUP BY cw.cutoff_year, pr.agent_id
      ),
      claim_agg AS (
        SELECT
          cw.cutoff_year,
          cl.agent_id,
          COALESCE(SUM(cl.gross_claim), 0)::numeric(18,2) AS total_claim,
          COUNT(DISTINCT cl.claim_no)::integer AS claim_count
        FROM cutoff_windows cw
        JOIN claims cl
          ON cl.deleted_at IS NULL
          AND cl.is_mm = true
          AND cl.agent_id IS NOT NULL
          AND (
            cw.cutoff_year = 0
            OR (
              cl.date_of_settlement >= cw.start_date
              AND cl.date_of_settlement <= cw.end_date
            )
          )
        GROUP BY cw.cutoff_year, cl.agent_id
      )
      SELECT
        COALESCE(p.cutoff_year, c.cutoff_year) AS cutoff_year,
        COALESCE(p.agent_id, c.agent_id) AS agent_id,
        COALESCE(p.total_premi, 0)::numeric(18,2) AS total_premi,
        COALESCE(p.total_komisi, 0)::numeric(18,2) AS total_komisi,
        COALESCE(p.policy_count, 0)::integer AS policy_count,
        COALESCE(c.total_claim, 0)::numeric(18,2) AS total_claim,
        COALESCE(c.claim_count, 0)::integer AS claim_count
      FROM prod_agg p
      FULL OUTER JOIN claim_agg c
        ON p.cutoff_year = c.cutoff_year
        AND p.agent_id = c.agent_id
    `)
  );

  await db.execute(sql`
    CREATE UNIQUE INDEX idx_mv_agent_cutoff_unique
    ON mv_agent_cutoff_summary (cutoff_year, agent_id)
  `);

  return {
    pgTrgmEnabled: true,
    indexesCreated: trigramIndexes.length,
    materializedViewsCreated: 2,
  };
}

/**
 * Refresh kedua Materialized View secara CONCURRENTLY agar pembacaan dashboard
 * tetap non-blocking (0ms lock) setiap selesai batch upload.
 */
export async function refreshAnalyticsMaterializedViews(): Promise<boolean> {
  try {
    await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_branch_cutoff_summary`);
    await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_agent_cutoff_summary`);
    return true;
  } catch (err) {
    // Fallback jika MV belum dibuat atau index unique belum tersedia
    console.warn('Materialized view refresh skipped:', (err as Error).message);
    return false;
  }
}

/**
 * Cek cepat apakah mv_branch_cutoff_summary sudah tersedia dan memiliki data.
 */
export async function hasBranchSummaryMaterializedView(): Promise<boolean> {
  try {
    const res = await db.execute<{ exists: boolean }>(sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_branch_cutoff_summary'
      ) AS exists
    `);
    const row = ((res as any).rows || res)[0];
    return Boolean(row?.exists);
  } catch {
    return false;
  }
}
