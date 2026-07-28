import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

export function getPrisma(env?: any): PrismaClient {
  if (prisma) return prisma;

  // In Cloudflare Workers, D1 is available via env.DB
  // For local development, use the standard SQLite file
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  return prisma;
}

// D1-compatible query helper for Cloudflare Workers
export async function d1Query(db: D1Database, sql: string, params?: any[]) {
  const result = params
    ? await db.prepare(sql).bind(...params).all()
    : await db.prepare(sql).all();
  return result;
}

export async function d1Execute(db: D1Database, sql: string, params?: any[]) {
  const result = params
    ? await db.prepare(sql).bind(...params).run()
    : await db.prepare(sql).run();
  return result;
}
