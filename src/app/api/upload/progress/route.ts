import { NextRequest } from 'next/server';
import { db } from '@/db';
import { uploadBatches } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getServerSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const TERMINAL_STATUSES = new Set(['COMPLETED', 'PARTIAL_SUCCESS', 'FAILED']);

/**
 * Server-Sent Events (SSE) endpoint untuk memantau progres batch upload secara real-time.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session || (session.role !== 'SUPERADMIN' && session.role !== 'ADMIN')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized: Hanya Administrator yang berwenang memantau progres upload.' }),
      { status: session ? 403 : 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { searchParams } = new URL(req.url);
  const batchId = searchParams.get('batchId');

  if (!batchId) {
    return new Response(JSON.stringify({ error: 'Parameter batchId wajib diisi.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (payload: Record<string, unknown>) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      const closeStream = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {}
      };

      req.signal.addEventListener('abort', closeStream);

      let lastSnapshot = '';
      const startedAt = Date.now();
      const maxWaitMs = 10 * 60 * 1000; // 10 menit safety timeout

      while (!closed && Date.now() - startedAt < maxWaitMs) {
        try {
          const [batch] = await db
            .select()
            .from(uploadBatches)
            .where(eq(uploadBatches.id, batchId))
            .limit(1);

          if (!batch) {
            sendEvent({ type: 'ERROR', error: 'Batch upload tidak ditemukan.' });
            break;
          }

          const snapshot = JSON.stringify({
            status: batch.status,
            processedRows: batch.processedRows,
            totalRows: batch.totalRows,
            batchType: batch.batchType,
          });

          if (snapshot !== lastSnapshot) {
            lastSnapshot = snapshot;
            const isDone = TERMINAL_STATUSES.has(batch.status);
            const summary = (batch.summary || {}) as Record<string, any>;
            const warnings = Array.isArray(summary.warnings) ? summary.warnings : [];

            sendEvent({
              type: isDone ? 'DONE' : 'PROGRESS',
              batch: {
                id: batch.id,
                fileName: batch.fileName,
                batchType: batch.batchType,
                status: batch.status,
                totalRows: batch.totalRows,
                processedRows: batch.processedRows,
                successRows: batch.successRows,
                warningRows: batch.warningRows,
                failedRows: batch.failedRows,
                skippedRows: batch.skippedRows,
              },
              ...(isDone
                ? {
                    result: {
                      batchId: batch.id,
                      detectedType: batch.batchType,
                      totalRows: batch.totalRows,
                      successRows: batch.successRows,
                      warningRows: batch.warningRows,
                      failedRows: batch.failedRows,
                      skippedRows: batch.skippedRows,
                      updatedRows: summary.updatedEndorsementRowsCount || 0,
                      status: batch.status,
                      smartMapping: {
                        mappedCount: summary.mappedColumnsCount || 0,
                        fallbackCount: Object.keys(summary.fallbackColumns || {}).length,
                        unmappedCount: (summary.unmappedColumns || []).length,
                        columnMapping: {},
                        fallbackColumns: summary.fallbackColumns || {},
                        unmappedColumns: summary.unmappedColumns || [],
                      },
                      warningDetails: {
                        pendingUplinesCount: summary.pendingUplinesCount || 0,
                        unregisteredAgentsCount: summary.autoProvisionedAgentsCount || 0,
                        sampleCodes: [],
                        explanation: warnings[0]?.message || '',
                      },
                    },
                  }
                : {}),
            });

            if (isDone) break;
          }
        } catch (err: any) {
          sendEvent({ type: 'ERROR', error: err?.message || 'Gagal membaca status upload.' });
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      closeStream();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
