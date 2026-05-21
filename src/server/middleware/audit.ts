import { auditLogs } from "../db/schema";
import type { db as DbInstance } from "../db";

interface LogAuditParams {
  db:          typeof DbInstance;
  userId?:     string | null;
  userName?:   string | null;
  action:      string;
  entityType?: string;
  entityId?:   string;
  before?:     unknown;
  after?:      unknown;
  metadata?:   unknown;
  ipAddress?:  string | null;
}

/**
 * Fire-and-forget audit logger.
 * Wraps the insert in try/catch so a logging failure NEVER breaks a mutation.
 * Call with `void logAudit(...)` to ensure it does not block the calling procedure.
 */
export async function logAudit({
  db,
  userId,
  userName,
  action,
  entityType,
  entityId,
  before,
  after,
  metadata,
  ipAddress,
}: LogAuditParams): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId:      userId      ?? null,
      userName:    userName    ?? null,
      action,
      entityType:  entityType  ?? null,
      entityId:    entityId    ?? null,
      beforeValue: (before   ?? null) as Record<string, unknown> | null,
      afterValue:  (after    ?? null) as Record<string, unknown> | null,
      metadata:    (metadata ?? null) as Record<string, unknown> | null,
      ipAddress:   ipAddress   ?? null,
    });
  } catch {
    // Intentional no-op — logging must never break a mutation
  }
}
