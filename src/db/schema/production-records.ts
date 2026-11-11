import {
  pgTable, uuid, varchar, text, date, decimal, jsonb,
  timestamp, index, boolean,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { agents } from './agents';
import { branches } from './branches';
import { uploadBatches } from './upload-batches';

export const productionRecords = pgTable('production_records', {
  id: uuid('id').defaultRandom().primaryKey(),

  // ── Source & Linkage ────────────────────────────────────────────────────────
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'set null' }),
  branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'set null' }),
  sourceBatchId: uuid('source_batch_id').references(() => uploadBatches.id, { onDelete: 'set null' }),
  isMm: boolean('is_mm').default(true).notNull(), // MM (Mitra Mitraca) vs Non-MM classification

  // ── Template 2: MasterProduksi Fixed Columns ────────────────────────────────
  bulan: varchar('bulan', { length: 50 }).notNull(),          // Bulan (e.g. "Januari 2026" or "2026-01")
  period: date('period').notNull(),                           // Normalized accounting date (YYYY-MM-01)
  policyStatus: varchar('policy_status', { length: 50 }),     // Policy Status
  sourceAgentId: varchar('source_agent_id', { length: 50 }).notNull(), // Agent ID
  profileId: varchar('profile_id', { length: 100 }),          // Profile ID
  agentName: varchar('agent_name', { length: 255 }),          // Agent Name
  agentStatus: varchar('agent_status', { length: 50 }),       // Agent Status
  rawBranch: varchar('raw_branch', { length: 255 }),          // Branch
  representative: varchar('representative', { length: 255 }), // Representative
  product: varchar('product', { length: 255 }),               // Product
  coverage: varchar('coverage', { length: 255 }),             // Coverage
  renewed: varchar('renewed', { length: 50 }),                // Renewed
  prevPolicy: varchar('prev_policy', { length: 100 }),        // Prev Policy
  spauType: varchar('spau_type', { length: 100 }),            // SPAU Type
  spauNo: varchar('spau_no', { length: 100 }),                // SPAU No
  
  // NOTE: policy_no is NON-UNIQUE across periods to support endorsements & installment payments
  policyNo: varchar('policy_no', { length: 100 }).notNull(),  // Policy No
  
  startPeriod: date('start_period'),                          // Start Period
  endPeriod: date('end_period'),                              // End Period
  insuredName: text('insured_name'),                          // Insured Name
  
  // Financial Precision: DECIMAL(18, 2)
  currencyTsi: varchar('currency_tsi', { length: 10 }).default('IDR'), // Currency of TSI
  rateTsi: decimal('rate_tsi', { precision: 18, scale: 4 }).default('1.0000'), // Rate of TSI
  tsi: decimal('tsi', { precision: 18, scale: 2 }).notNull().default('0.00'), // TSI
  tsiInIdr: decimal('tsi_in_idr', { precision: 18, scale: 2 }).notNull().default('0.00'), // TSI in IDR
  nilaiPremi: decimal('nilai_premi', { precision: 18, scale: 2 }).notNull().default('0.00'), // Nilai Premi
  nilaiKomisi: decimal('nilai_komisi', { precision: 18, scale: 2 }).notNull().default('0.00'), // Nilai Komisi
  nilaiDiskon: decimal('nilai_diskon', { precision: 18, scale: 2 }).notNull().default('0.00'), // Nilai Diskon
  nilaiAkusisi: decimal('nilai_akusisi', { precision: 18, scale: 2 }).notNull().default('0.00'), // Nilai Akusisi

  // Dynamic Consolidation: Object Information 1 s/d Object Information 15
  objectDetails: jsonb('object_details').$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
  
  // Dynamic Overflow Metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),

  // Audit
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
}, (table) => ({
  agentPeriodIdx: index('prod_agent_period_idx').on(table.agentId, table.period),
  policyPeriodIdx: index('prod_policy_period_idx').on(table.policyNo, table.period),
  branchIdx: index('prod_branch_idx').on(table.branchId),
  sourceAgentIdx: index('prod_source_agent_idx').on(table.sourceAgentId),
  isMmIdx: index('production_records_is_mm_idx').on(table.isMm),
  objectDetailsGinIdx: index('prod_object_details_gin_idx').using('gin', table.objectDetails),
  deletedAtIdx: index('prod_deleted_at_idx').on(table.deletedAt),
}));

export const productionRecordsRelations = relations(productionRecords, ({ one }) => ({
  agent: one(agents, {
    fields: [productionRecords.agentId],
    references: [agents.id],
  }),
  branch: one(branches, {
    fields: [productionRecords.branchId],
    references: [branches.id],
  }),
  sourceBatch: one(uploadBatches, {
    fields: [productionRecords.sourceBatchId],
    references: [uploadBatches.id],
  }),
}));
