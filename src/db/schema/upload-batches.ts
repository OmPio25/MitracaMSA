import {
  pgTable, uuid, varchar, text, integer, jsonb,
  timestamp, index,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { uploadBatchTypeEnum, uploadBatchStatusEnum, uploadRowStatusEnum } from './enums';
import { users } from './users';

export const uploadBatches = pgTable('upload_batches', {
  id: uuid('id').defaultRandom().primaryKey(),
  batchType: uploadBatchTypeEnum('batch_type').notNull(),
  fileName: varchar('file_name', { length: 500 }).notNull(),
  fileSize: integer('file_size'),
  uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),

  status: uploadBatchStatusEnum('status').notNull().default('QUEUED'),
  totalRows: integer('total_rows').notNull().default(0),
  processedRows: integer('processed_rows').notNull().default(0),
  successRows: integer('success_rows').notNull().default(0),
  warningRows: integer('warning_rows').notNull().default(0), // Rows with PENDING_UPLINE or auto-provisions
  failedRows: integer('failed_rows').notNull().default(0),
  skippedRows: integer('skipped_rows').notNull().default(0),

  // Summary Metrics
  summary: jsonb('summary').$type<{
    pendingUplinesCount: number;
    autoProvisionedBranchesCount: number;
    autoProvisionedAgentsCount: number;
    skippedDuplicateRowsCount?: number;
    updatedEndorsementRowsCount?: number;
    mappedColumnsCount?: number;
    fallbackColumns?: Record<string, string>;
    unmappedColumns?: string[];
    warnings: Array<{ code: string; message: string; sampleRow: number }>;
  }>().default(sql`'{}'::jsonb`),

  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  batchTypeIdx: index('batches_type_idx').on(table.batchType),
  batchStatusIdx: index('batches_status_idx').on(table.status),
  uploadedByIdx: index('batches_uploaded_by_idx').on(table.uploadedBy),
  createdAtIdx: index('batches_created_at_idx').on(table.createdAt),
}));

export const uploadRowLogs = pgTable('upload_row_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  batchId: uuid('batch_id').notNull().references(() => uploadBatches.id, { onDelete: 'cascade' }),
  rowNumber: integer('row_number').notNull(),
  status: uploadRowStatusEnum('status').notNull(),
  
  // Row payload snapshot
  rawData: jsonb('raw_data').$type<Record<string, unknown>>().notNull(),
  normalizedData: jsonb('normalized_data').$type<Record<string, unknown>>(),
  
  warningMessage: text('warning_message'), // e.g., "Agen belum terdaftar, disimpan dengan status PENDING_UPLINE"
  errorMessage: text('error_message'),
  errorCode: varchar('error_code', { length: 100 }),

  processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  batchStatusIdx: index('row_logs_batch_status_idx').on(table.batchId, table.status),
  batchRowIdx: index('row_logs_batch_row_idx').on(table.batchId, table.rowNumber),
  rawDataGinIdx: index('row_logs_raw_data_gin_idx').using('gin', table.rawData),
}));

export const uploadBatchesRelations = relations(uploadBatches, ({ one, many }) => ({
  uploader: one(users, {
    fields: [uploadBatches.uploadedBy],
    references: [users.id],
  }),
  rowLogs: many(uploadRowLogs),
}));

export const uploadRowLogsRelations = relations(uploadRowLogs, ({ one }) => ({
  batch: one(uploadBatches, {
    fields: [uploadRowLogs.batchId],
    references: [uploadBatches.id],
  }),
}));
