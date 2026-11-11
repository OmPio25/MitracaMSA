import { NextRequest } from 'next/server';
import { db } from '@/db';
import { auditLogs } from '@/db/schema';
import { getServerSession } from '@/lib/auth/session';

export type AuditCategory =
  | 'AUTH'
  | 'UPLOAD'
  | 'USER_MANAGEMENT'
  | 'SETTINGS'
  | 'EXPORT'
  | 'SYSTEM';

export type AuditStatus = 'SUCCESS' | 'FAILED' | 'WARNING';

export interface LogActivityParams {
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  action: string;
  category: AuditCategory;
  status?: AuditStatus;
  description: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any> | null;
  req?: NextRequest | null;
}

/**
 * Ekstraksi IP Address dan User-Agent dari request Next.js
 */
export function getClientInfo(req?: NextRequest | null): {
  ip: string;
  userAgent: string;
} {
  if (!req) {
    return { ip: '127.0.0.1', userAgent: '-' };
  }

  const forwardedFor = req.headers.get('x-forwarded-for');
  const ip = forwardedFor
    ? forwardedFor.split(',')[0].trim()
    : req.headers.get('x-real-ip') || '127.0.0.1';

  const userAgent = req.headers.get('user-agent') || '-';

  return { ip, userAgent };
}

/**
 * Mencatat aktivitas sistem ke tabel audit_logs
 * Bersifat asinkron dan non-blocking (kegagalan logging tidak menggagalkan transaksi utama)
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    let {
      userId,
      userName,
      userEmail,
      userRole,
      action,
      category,
      status = 'SUCCESS',
      description,
      ipAddress,
      userAgent,
      metadata,
      req,
    } = params;

    // Ekstraksi info klien otomatis jika req diberikan
    if (req) {
      const clientInfo = getClientInfo(req);
      if (!ipAddress) ipAddress = clientInfo.ip;
      if (!userAgent) userAgent = clientInfo.userAgent;
    }

    // Ekstraksi info sesi otomatis jika userId belum tersedia
    if (!userId && !userName) {
      try {
        const session = await getServerSession();
        if (session) {
          userId = session.userId;
          userName = session.name;
          userEmail = session.email;
          userRole = session.role;
        }
      } catch (err) {
        // Abaikan jika tidak ada sesi aktif
      }
    }

    await db.insert(auditLogs).values({
      userId: userId || null,
      userName: userName || null,
      userEmail: userEmail || null,
      userRole: userRole || null,
      action,
      category,
      status,
      description,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      metadata: metadata || null,
    });
  } catch (err) {
    console.error('AuditLogger error (non-fatal):', err);
  }
}
