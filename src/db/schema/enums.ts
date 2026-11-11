import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', [
  'SUPERADMIN',     // Full access all modules & national data
  'ADMIN',          // Operational upload & national data
  'KACAB',          // Auto-filtered to branch_id
  'PIC_CABANG',     // Auto-filtered to branch_id
  'AGENT',          // Personal data + downlines (via upline_agent_code / materialized_path)
  'OFFICER_AGENT',  // Agent employee/staff, identical scope to parent_agent_id
  'AUDIT',          // Read-only all modules & national data
]);

export const uplineStatusEnum = pgEnum('upline_status', [
  'LINKED',                 // Upline confirmed and connected
  'PENDING_UPLINE',         // KodeUpline registered, but upline not yet uploaded (non-blocking)
  'UNREGISTERED_IN_MASTER', // Agent ID discovered in Production/Claim before Master Agent
  'ROOT',                   // Top-level agency without upline
]);

export const uploadBatchTypeEnum = pgEnum('upload_batch_type', [
  'DATA_AGENT',       // Template 1: DataAgent
  'MASTER_PRODUKSI',  // Template 2: MasterProduksi
  'MASTER_CLAIM',     // Template 3: MasterClaim
]);

export const uploadBatchStatusEnum = pgEnum('upload_batch_status', [
  'QUEUED',
  'PROCESSING',
  'COMPLETED',
  'PARTIAL_SUCCESS', // Completed with warnings (e.g. PENDING_UPLINE or Auto-provisioned)
  'FAILED',
]);

export const uploadRowStatusEnum = pgEnum('upload_row_status', [
  'SUCCESS',
  'WARNING',         // e.g. PENDING_UPLINE recorded
  'ERROR',
  'SKIPPED',
]);
