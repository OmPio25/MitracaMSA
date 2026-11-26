import { unlink } from 'node:fs/promises';
import { db } from '@/db';
import { uploadBatches } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { processUploadedExcelFile } from './unified-processor';
import { logActivity } from '@/lib/audit/audit-logger';

export interface UploadJobPayload {
  batchId: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  userId: string | null;
  userName: string;
  userEmail: string | null;
  userRole: string;
}

const jobQueue: UploadJobPayload[] = [];
let isWorkerRunning = false;

/**
 * Menambahkan job ingestion Excel ke antrian latar belakang (sequential worker)
 * agar koneksi HTTP tidak timeout dan beban CPU/DB tetap terkendali saat upload >10.000 baris.
 */
export function enqueueUploadJob(job: UploadJobPayload): void {
  jobQueue.push(job);
  if (!isWorkerRunning) {
    void processNextJob();
  }
}

export function getUploadQueueStats(): { pendingCount: number; isWorkerRunning: boolean } {
  return {
    pendingCount: jobQueue.length,
    isWorkerRunning,
  };
}

async function processNextJob(): Promise<void> {
  if (isWorkerRunning) return;
  isWorkerRunning = true;

  try {
    while (jobQueue.length > 0) {
      const job = jobQueue.shift()!;
      try {
        const result = await processUploadedExcelFile(
          job.filePath,
          job.fileName,
          job.fileSize,
          job.userId,
          job.batchId
        );

        await logActivity({
          userId: job.userId,
          userName: job.userName,
          userEmail: job.userEmail,
          userRole: job.userRole,
          action: 'UPLOAD_BATCH_PROCESSED',
          category: 'UPLOAD',
          status: result.status === 'FAILED' ? 'FAILED' : 'SUCCESS',
          description: `Unggah file Excel '${job.fileName}' (${result.detectedType}): ${result.totalRows} baris diproses (${result.successRows} sukses, ${result.failedRows} gagal)`,
          metadata: {
            batchId: result.batchId,
            fileName: job.fileName,
            fileSize: job.fileSize,
            detectedType: result.detectedType,
            totalRows: result.totalRows,
            successRows: result.successRows,
            failedRows: result.failedRows,
          },
        });
      } catch (err: any) {
        console.error(`Background upload job ${job.batchId} failed:`, err);
        await db
          .update(uploadBatches)
          .set({
            status: 'FAILED',
            completedAt: new Date(),
            updatedAt: new Date(),
            summary: {
              pendingUplinesCount: 0,
              autoProvisionedBranchesCount: 0,
              autoProvisionedAgentsCount: 0,
              warnings: [
                {
                  code: 'JOB_FAILED',
                  message: err?.message || 'Terjadi kesalahan saat memproses file Excel.',
                  sampleRow: 0,
                },
              ],
            },
          })
          .where(eq(uploadBatches.id, job.batchId))
          .catch(() => {});

        await logActivity({
          userId: job.userId,
          userName: job.userName,
          userEmail: job.userEmail,
          userRole: job.userRole,
          action: 'UPLOAD_BATCH_PROCESSED',
          category: 'UPLOAD',
          status: 'FAILED',
          description: `Gagal memproses file Excel '${job.fileName}': ${err?.message || 'Unknown error'}`,
          metadata: {
            batchId: job.batchId,
            fileName: job.fileName,
            error: err?.message || String(err),
          },
        }).catch(() => {});
      } finally {
        await unlink(job.filePath).catch(() => {});
      }
    }
  } finally {
    isWorkerRunning = false;
  }
}
