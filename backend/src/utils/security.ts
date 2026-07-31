import { generateId } from './crypto'

export const MAX_LOGIN_ATTEMPTS = 5
const LOGIN_WINDOW_MS = 15 * 60 * 1000

export const now = () => new Date().toISOString()

export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

export const PASSWORD_MESSAGE = 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character'

export function validatePassword(password: string): boolean {
  return PASSWORD_PATTERN.test(password)
}

export async function recentLoginFailures(db: D1Database, email: string): Promise<number> {
  const since = new Date(Date.now() - LOGIN_WINDOW_MS).toISOString()
  const row = await db.prepare('SELECT COUNT(*) AS count FROM siq_login_attempts WHERE email = ? AND success = 0 AND created_at >= ?').bind(email, since).first<any>()
  return Number(row?.count ?? 0)
}

export async function recordLoginAttempt(db: D1Database, email: string, success: boolean, ip: string | null) {
  await db.prepare('INSERT INTO siq_login_attempts (id, email, success, ip, created_at) VALUES (?, ?, ?, ?, ?)').bind(generateId(), email, success ? 1 : 0, ip, now()).run()
}

export async function clearLoginAttempts(db: D1Database, email: string) {
  await db.prepare('DELETE FROM siq_login_attempts WHERE email = ?').bind(email).run()
}

export async function revokeUserSessions(db: D1Database, userId: string) {
  await db.prepare('UPDATE siq_refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL').bind(now(), userId).run()
}

export async function logAudit(db: D1Database, actorId: string | null, action: string, entityType?: string, entityId?: string, meta?: unknown) {
  await db.prepare('INSERT INTO siq_audit_logs (id, actor_id, action, entity_type, entity_id, meta) VALUES (?, ?, ?, ?, ?, ?)').bind(
    generateId(),
    actorId,
    action,
    entityType ?? null,
    entityId ?? null,
    meta ? JSON.stringify(meta) : null
  ).run()
}
