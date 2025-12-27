import "dotenv/config";
import { registerUserEventHandlers } from "./infrastructure/events/user";
import {
  BullMQDomainEventWorker,
  connection,
  QueuePublisher,
} from "./infrastructure/queue";

export const worker = new BullMQDomainEventWorker(connection);
export const queuePublisher = new QueuePublisher(connection);

registerUserEventHandlers(worker);

async function main() {
  try {
    console.log("🔄 Starting domain event worker...");
    await worker.start();
    console.log("✅ Domain event worker started successfully");
  } catch (error) {
    console.error("❌ Failed to start domain event worker:", error);
    await worker.stop();
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  console.log("👋 Shutting down worker...");
  await worker.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("👋 Shutting down worker...");
  await worker.stop();
  process.exit(0);
});

main();
