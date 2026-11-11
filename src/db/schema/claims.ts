import {
  pgTable, uuid, varchar, text, date, decimal, jsonb,
  timestamp, index, boolean,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { agents } from './agents';
import { branches } from './branches';
import { uploadBatches } from './upload-batches';

export const claims = pgTable('claims', {
  id: uuid('id').defaultRandom().primaryKey(),

  // ── Source & Linkage ────────────────────────────────────────────────────────
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'set null' }),
  branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'set null' }),
  sourceBatchId: uuid('source_batch_id').references(() => uploadBatches.id, { onDelete: 'set null' }),
  isMm: boolean('is_mm').default(true).notNull(), // MM (Mitra Mitraca) vs Non-MM classification

  // ── Template 3: MasterClaim Fixed Columns ───────────────────────────────────
  sourceAgentId: varchar('source_agent_id', { length: 50 }).notNull(), // Agent ID
  claimNo: varchar('claim_no', { length: 100 }).notNull(),             // Claim No
  policyNo: varchar('policy_no', { length: 100 }).notNull(),           // Policy No
  dateOfSettlement: date('date_of_settlement'),                        // Date Of Settlement
  period: date('period').notNull(),                                    // Normalized accounting period (YYYY-MM-01)
  uwYear: varchar('uw_year', { length: 10 }),                          // UW Year (Underwriting Year)
  
  // Financial Precision: DECIMAL(18, 2)
  grossClaim: decimal('gross_claim', { precision: 18, scale: 2 }).notNull().default('0.00'), // Gross Claim
  
  rawBranch: varchar('raw_branch', { length: 255 }),                   // Cabang/Branch
  namaProduk: varchar('nama_produk', { length: 255 }),                 // Nama Produk
  currency: varchar('currency', { length: 10 }).default('IDR'),        // Currency
  causeOfLoss: text('cause_of_loss'),                                  // Cause of Loss
  
  // Claim Breakdown Components (Strict DECIMAL 18,2)
  indemnity: decimal('indemnity', { precision: 18, scale: 2 }).notNull().default('0.00'),     // Indemnity
  deductible: decimal('deductible', { precision: 18, scale: 2 }).notNull().default('0.00'),   // Deductible
  salvage: decimal('salvage', { precision: 18, scale: 2 }).notNull().default('0.00'),         // Salvage
  subrogation: decimal('subrogation', { precision: 18, scale: 2 }).notNull().default('0.00'), // Subrogation

  metadata: jsonb('metadata').$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),

  // Audit
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
}, (table) => ({
  agentPeriodIdx: index('claims_agent_period_idx').on(table.agentId, table.period),
  policyPeriodIdx: index('claims_policy_period_idx').on(table.policyNo, table.period),
  branchIdx: index('claims_branch_idx').on(table.branchId),
  sourceAgentIdx: index('claims_source_agent_idx').on(table.sourceAgentId),
  claimNoIdx: index('claims_claim_no_idx').on(table.claimNo),
  isMmIdx: index('claims_is_mm_idx').on(table.isMm),
  deletedAtIdx: index('claims_deleted_at_idx').on(table.deletedAt),
}));

export const claimsRelations = relations(claims, ({ one }) => ({
  agent: one(agents, {
    fields: [claims.agentId],
    references: [agents.id],
  }),
  branch: one(branches, {
    fields: [claims.branchId],
    references: [branches.id],
  }),
  sourceBatch: one(uploadBatches, {
    fields: [claims.sourceBatchId],
    references: [uploadBatches.id],
  }),
}));
