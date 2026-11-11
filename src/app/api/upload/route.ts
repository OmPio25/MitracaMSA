import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { db } from '@/db';
import { uploadBatches } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { processUploadedExcelFile } from '@/lib/ingestion/unified-processor';
import { getServerSession } from '@/lib/auth/session';
import { logActivity } from '@/lib/audit/audit-logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max processing

export async function GET(req: NextRequest) {
  try {
    // SECURITY FIX: Pastikan user terotentikasi
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Harap login terlebih dahulu' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get('batchId');

    const [batch] = batchId
      ? await db
          .select({
            id: uploadBatches.id,
            fileName: uploadBatches.fileName,
            batchType: uploadBatches.batchType,
            status: uploadBatches.status,
            totalRows: uploadBatches.totalRows,
            processedRows: uploadBatches.processedRows,
            successRows: uploadBatches.successRows,
            warningRows: uploadBatches.warningRows,
            failedRows: uploadBatches.failedRows,
            skippedRows: uploadBatches.skippedRows,
          })
          .from(uploadBatches)
          .where(eq(uploadBatches.id, batchId))
          .limit(1)
      : await db
          .select({
            id: uploadBatches.id,
            fileName: uploadBatches.fileName,
            batchType: uploadBatches.batchType,
            status: uploadBatches.status,
            totalRows: uploadBatches.totalRows,
            processedRows: uploadBatches.processedRows,
            successRows: uploadBatches.successRows,
            warningRows: uploadBatches.warningRows,
            failedRows: uploadBatches.failedRows,
            skippedRows: uploadBatches.skippedRows,
          })
          .from(uploadBatches)
          .orderBy(desc(uploadBatches.createdAt))
          .limit(1);

    if (!batch) {
      return NextResponse.json({ active: false });
    }

    return NextResponse.json({
      active: batch.status === 'PROCESSING' || batch.status === 'QUEUED',
      batch,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let tempFilePath: string | null = null;

  try {
    // SECURITY FIX: Batasi upload hanya untuk SUPERADMIN dan ADMIN
    const session = await getServerSession();
    if (!session || (session.role !== 'SUPERADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Akses ditolak: Hanya Administrator (SUPERADMIN dan ADMIN) yang berwenang mengunggah data.' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file yang diunggah.' }, { status: 400 });
    }

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Format file tidak didukung. Mohon unggah file Excel (.xlsx / .xls).' },
        { status: 400 }
      );
    }

    // Write to temp file to ensure zero memory heap spikes during large streaming
    const tempDir = path.join(process.cwd(), 'tmp', 'uploads');
    await mkdir(tempDir, { recursive: true });

    // SECURITY FIX: Sanitasi nama file untuk mencegah path traversal
    const safeFileName = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileId = randomUUID();
    tempFilePath = path.join(tempDir, `${fileId}-${safeFileName}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tempFilePath, buffer);

    // Run unified ingestion engine (auto-detects template, auto-maps fixed headers)
    const result = await processUploadedExcelFile(
      tempFilePath,
      file.name,
      file.size,
      session?.userId || null
    );

    // Catat audit log aktivitas upload batch
    await logActivity({
      userId: session?.userId || null,
      userName: session?.name || 'Administrator',
      userEmail: session?.email || null,
      userRole: session?.role || 'ADMIN',
      action: 'UPLOAD_BATCH_PROCESSED',
      category: 'UPLOAD',
      status: (result as any).status === 'FAILED' ? 'FAILED' : 'SUCCESS',
      description: `Unggah file Excel '${file.name}' (${result.detectedType}): ${result.totalRows} baris diproses (${result.successRows} sukses, ${result.failedRows} gagal)`,
      req,
      metadata: {
        batchId: result.batchId,
        fileName: file.name,
        fileSize: file.size,
        detectedType: result.detectedType,
        totalRows: result.totalRows,
        successRows: result.successRows,
        failedRows: result.failedRows,
      },
    });

    return NextResponse.json({
      success: true,
      message: `File berhasil diproses sebagai ${result.detectedType}.`,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Terjadi kesalahan sistem saat memproses file Excel.',
      },
      { status: 500 }
    );
  } finally {
    if (tempFilePath) {
      await unlink(tempFilePath).catch(() => {});
    }
  }
}
