import { IDomainEventBus } from "@woltz/rich-domain";
import {
  eventTracker,
  initializeEventTracker,
  shutdownEventTracker,
} from "../tracking/index.js";

export async function initializeEventTracking(): Promise<void> {
  await initializeEventTracker();
  console.log("✅ Event tracking initialized");
}

export async function shutdownEventTracking(): Promise<void> {
  await shutdownEventTracker();
  console.log("👋 Event tracking shutdown");
}

export const trackedEventBus: IDomainEventBus = {
  async publish(event) {
    await eventTracker.trackEvent(event);
  },

  async publishAll(events) {
    await Promise.all(events.map((e) => eventTracker.trackEvent(e)));
  },
};
