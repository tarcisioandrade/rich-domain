import type { PrismaClient } from "@prisma/client";
import { BaseTransactionContext } from "@woltz/rich-domain";

export class PrismaTransactionContext extends BaseTransactionContext {
  constructor(private readonly tx: PrismaClient) {
    super();
  }
  get client() {
    return this.tx;
  }

  async commit() {
    this.markInactive();
  }
  async rollback() {
    this.markInactive();
  }
}
