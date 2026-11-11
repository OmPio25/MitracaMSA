import {
  pgTable, uuid, varchar, text, integer, boolean,
  timestamp, jsonb, index, uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { uplineStatusEnum } from './enums';
import { branches } from './branches';
import { productionRecords } from './production-records';
import { claims } from './claims';

export const agents = pgTable('agents', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // ── Template 1: DataAgent Columns ───────────────────────────────────────────
  agentCode: varchar('agent_code', { length: 50 }).notNull().unique(), // KODEAGEN
  name: varchar('name', { length: 255 }).notNull().default('UNREGISTERED AGENT'), // NAMAAGEN
  profId: varchar('prof_id', { length: 100 }),                         // PROFID
  statusKeagenan: varchar('status_keagenan', { length: 50 }),          // STATUSKEAGENAN (e.g. AKTIF, TERMINATED)
  uplineAgentCode: varchar('upline_agent_code', { length: 50 }),       // KodeUpline (raw from Excel)
  peringkat: varchar('peringkat', { length: 100 }),                    // PERINGKAT (Rank/Tier)
  rawBranchName: varchar('raw_branch_name', { length: 255 }),          // NAMACABANG (raw)

  // ── Hierarchy & Self-Healing (Unlimited Depth) ──────────────────────────────
  parentId: uuid('parent_id'),                                         // Resolved FK to upline agent
  uplineStatus: uplineStatusEnum('upline_status').notNull().default('PENDING_UPLINE'),
  materializedPath: text('materialized_path').default('/'),            // e.g. '/AGT001/AGT004/AGT009'
  depth: integer('depth').notNull().default(0),

  // ── Branch Relation (Auto-Provisioned) ──────────────────────────────────────
  branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'set null' }),

  // ── Contact & Status ────────────────────────────────────────────────────────
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  isPlaceholder: boolean('is_placeholder').notNull().default(false),   // True if auto-provisioned by Prod/Claim
  isActive: boolean('is_active').notNull().default(true),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),

  // ── Audit ───────────────────────────────────────────────────────────────────
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
}, (table) => ({
  agentCodeIdx: uniqueIndex('agents_agent_code_idx').on(table.agentCode),
  parentIdIdx: index('agents_parent_id_idx').on(table.parentId),
  uplineAgentCodeIdx: index('agents_upline_agent_code_idx').on(table.uplineAgentCode),
  uplineStatusIdx: index('agents_upline_status_idx').on(table.uplineStatus),
  branchIdIdx: index('agents_branch_id_idx').on(table.branchId),
  profIdIdx: index('agents_prof_id_idx').on(table.profId),
  materializedPathIdx: index('agents_materialized_path_idx').using(
    'btree',
    sql`${table.materializedPath} text_pattern_ops`
  ),
  metadataGinIdx: index('agents_metadata_gin_idx').using('gin', table.metadata),
  deletedAtIdx: index('agents_deleted_at_idx').on(table.deletedAt),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  parent: one(agents, {
    fields: [agents.parentId],
    references: [agents.id],
    relationName: 'agentTree',
  }),
  downlines: many(agents, { relationName: 'agentTree' }),
  branch: one(branches, {
    fields: [agents.branchId],
    references: [branches.id],
  }),
  productionRecords: many(productionRecords),
  claims: many(claims),
}));
