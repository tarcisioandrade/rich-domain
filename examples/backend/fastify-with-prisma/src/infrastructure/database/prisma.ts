import { PrismaClient } from "@prisma/client";
import { PrismaUnitOfWork } from "@woltz/rich-domain-prisma";

export const prisma = new PrismaClient({
  log: ["query", "error", "warn"],
});
export const uow = new PrismaUnitOfWork(prisma);
