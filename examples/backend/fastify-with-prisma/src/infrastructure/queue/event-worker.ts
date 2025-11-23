import { Worker } from "bullmq";
import { connection } from "./event-queue";
import { IDomainEvent } from "@woltz/rich-domain";
import { EVENT_BUS } from "./event-bus";

export const DomainEventWorker = new Worker<IDomainEvent>(
  "domain-events",
  async (job) => {
    console.log(`[Worker] Processing event ${job.name}...`);
    await EVENT_BUS.publish(job.data);
    return true;
  },
  { connection }
);

DomainEventWorker.on("completed", (job) => {
  console.log(`[Worker] Event processed: ${job.id}`);
});

DomainEventWorker.on("failed", (job, err) => {
  console.error(`[Worker] Failed job ${job?.id}:`, err);
});

DomainEventWorker.on("ready", () => {
  console.log("[Worker] Ready");
});
