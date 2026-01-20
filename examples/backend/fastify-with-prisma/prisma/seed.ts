import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { generateFractionalIndex } from "../src/utils/fractional-index.js";

const prisma = new PrismaClient();

const statuses = ["todo", "doing", "done", "archived", "cancelled"] as const;
const priorities = ["low", "medium", "high", "urgent"] as const;
const labelOptions = [
  "frontend",
  "backend",
  "bug",
  "feature",
  "refactor",
  "documentation",
  "testing",
  "design",
];

async function main() {
  console.log("🌱 Starting seed...");

  await prisma.task.deleteMany({});
  const tasksPerStatus = 100;

  for (const status of statuses) {
    const orders: string[] = [];
    let prevOrder: string | null = null;

    for (let i = 0; i < tasksPerStatus; i++) {
      const order = generateFractionalIndex(prevOrder, null);
      orders.push(order);
      prevOrder = order;
    }

    const tasks = Array.from({ length: tasksPerStatus }, (_, index) => {
      const createdAt = faker.date.past({ years: 1 });
      const updatedAt = faker.date.between({
        from: createdAt,
        to: new Date(),
      });
      const updatedStageAt =
        status !== "todo"
          ? faker.date.between({ from: createdAt, to: updatedAt })
          : createdAt;

      return {
        id: faker.string.uuid(),
        title: faker.lorem.sentence({ min: 3, max: 8 }),
        description: faker.lorem.paragraph({ min: 1, max: 3 }),
        status: status,
        priority: faker.helpers.arrayElement(priorities),
        assignee: faker.person.fullName(),
        labels: faker.helpers.arrayElements(labelOptions, {
          min: 0,
          max: 4,
        }),
        order: orders[index],
        createdAt: createdAt,
        updatedAt: updatedAt,
        updatedStageAt: updatedStageAt,
      };
    });

    await prisma.task.createMany({
      data: tasks,
    });
  }
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
