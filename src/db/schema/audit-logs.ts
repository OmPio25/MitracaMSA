import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    userName: varchar('user_name', { length: 255 }),
    userEmail: varchar('user_email', { length: 255 }),
    userRole: varchar('user_role', { length: 50 }),
    action: varchar('action', { length: 100 }).notNull(),
    category: varchar('category', { length: 50 }).notNull(), // 'AUTH', 'UPLOAD', 'USER_MANAGEMENT', 'SETTINGS', 'EXPORT', 'SYSTEM'
    status: varchar('status', { length: 20 }).notNull().default('SUCCESS'), // 'SUCCESS', 'FAILED', 'WARNING'
    description: text('description').notNull(),
    ipAddress: varchar('ip_address', { length: 100 }),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
    categoryIdx: index('audit_logs_category_idx').on(table.category),
    actionIdx: index('audit_logs_action_idx').on(table.action),
    userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
    statusIdx: index('audit_logs_status_idx').on(table.status),
  })
);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));
