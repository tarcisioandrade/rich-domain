import type { PrismaClient } from "@prisma/client";

export class PrismaTransactionContext {
  constructor(public readonly client: PrismaClient) {}
}
