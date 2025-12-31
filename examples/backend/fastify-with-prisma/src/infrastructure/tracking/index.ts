import { EventTracker } from "@woltz/rich-domain-events-tracker";
import { BullMQTrackerAdapter } from "@woltz/rich-domain-bullmq-tracker";
import { connection } from "../queue/connection.js";
import { QUEUES } from "../../constants.js";

const adapter = new BullMQTrackerAdapter({
  connection: connection,
  queueNames: [QUEUES.MAIN, QUEUES.NOTIFICATION_EVENTS, QUEUES.WORKFLOW_EVENTS],
  defaultQueueName: QUEUES.MAIN,
  queueOptions: {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: false,
    },
  },
});

export const eventTracker = new EventTracker({
  adapter,
});

let initialized = false;

export async function initializeEventTracker(): Promise<void> {
  if (!initialized) {
    await eventTracker.initialize();
    initialized = true;
  }
}

export async function shutdownEventTracker(): Promise<void> {
  await eventTracker.shutdown();
  initialized = false;
}
