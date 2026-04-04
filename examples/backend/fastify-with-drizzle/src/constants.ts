export const QUEUES = {
  MAIN: "main",
  USERS: "users",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
