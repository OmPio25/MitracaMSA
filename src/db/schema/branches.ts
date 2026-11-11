import {
  pgTable, uuid, varchar, boolean, timestamp, index, uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { agents } from './agents';

export const branches = pgTable('branches', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(), // Normalized uppercase code (e.g., 'JKT-SELATAN')
  name: varchar('name', { length: 255 }).notNull(),         // Display Name (e.g., 'Jakarta Selatan')
  rawAlias: varchar('raw_alias', { length: 255 }),          // Original raw string captured during auto-provisioning
  isAutoProvisioned: boolean('is_auto_provisioned').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  isPortalActive: boolean('is_portal_active').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  branchesCodeIdx: uniqueIndex('branches_code_idx').on(table.code),
  branchesNameIdx: index('branches_name_idx').on(table.name),
}));

export const branchesRelations = relations(branches, ({ many }) => ({
  agents: many(agents),
}));
