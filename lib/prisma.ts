import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"

// Keep both the pool and client as globals so Turbopack hot-reload never recreates them
const g = globalThis as unknown as { pgPool?: Pool; prisma?: PrismaClient }

if (!g.pgPool) {
  g.pgPool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  })
}

if (!g.prisma) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaPg(g.pgPool as any)
  g.prisma = new PrismaClient({ adapter })
}

export const prisma = g.prisma!
