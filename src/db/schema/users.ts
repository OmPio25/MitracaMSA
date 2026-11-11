import {
  pgTable, uuid, varchar, text, boolean, timestamp, index, uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { userRoleEnum } from './enums';
import { agents } from './agents';
import { branches } from './branches';
import { uploadBatches } from './upload-batches';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 50 }),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('AGENT'),
  
  // ── Scoping Pointers for RBAC ───────────────────────────────────────────────
  // Scoping for KACAB & PIC_CABANG: Restricts data exclusively to this branch
  branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'set null' }),

  // Scoping for AGENT: Links directly to their Agent profile
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'set null' }),

  // Scoping for OFFICER_AGENT: Identical privileges to this owner agent
  parentAgentId: uuid('parent_agent_id').references(() => agents.id, { onDelete: 'set null' }),
  
  // Who created this account (e.g. Agent creating their Officer)
  createdById: uuid('created_by_id'),

  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
  roleIdx: index('users_role_idx').on(table.role),
  branchIdIdx: index('users_branch_id_idx').on(table.branchId),
  agentIdIdx: index('users_agent_id_idx').on(table.agentId),
  parentAgentIdIdx: index('users_parent_agent_id_idx').on(table.parentAgentId),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  branch: one(branches, {
    fields: [users.branchId],
    references: [branches.id],
  }),
  agent: one(agents, {
    fields: [users.agentId],
    references: [agents.id],
    relationName: 'userAgent',
  }),
  parentAgent: one(agents, {
    fields: [users.parentAgentId],
    references: [agents.id],
    relationName: 'officerOwnerAgent',
  }),
  uploadBatches: many(uploadBatches),
}));
