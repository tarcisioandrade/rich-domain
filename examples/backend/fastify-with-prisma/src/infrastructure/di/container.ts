import { PrismaClient } from "@prisma/client";
import { PrismaUnitOfWork } from "@woltz/rich-domain-prisma";
import { prisma } from "../database/prisma.js";
import { BullMQEventBus } from "../queue/event-bus.js";
import { connection } from "../queue/connection.js";
import { PrismaUserRepository } from "../database/repositories/prisma-user.repository.js";
import { PrismaPostRepository } from "../database/repositories/prisma-post.repository.js";
import { UserService } from "../../application/services/user.service.js";
import { PostService } from "../../application/services/post.service.js";
import { IDomainEventBus } from "@woltz/rich-domain";

export class Container {
  private static instance: Container;
  private services = new Map<string, any>();

  private constructor() {
    this.registerDependencies();
  }

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  private registerDependencies() {
    // Infrastructure dependencies
    this.register("prisma", () => prisma);
    this.register("unitOfWork", () => new PrismaUnitOfWork(prisma));
    this.register("eventBus", () => new BullMQEventBus(connection));

    // Repositories
    this.register(
      "userRepository",
      () =>
        new PrismaUserRepository(
          this.resolve<PrismaClient>("prisma"),
          this.resolve<PrismaUnitOfWork>("unitOfWork")
        )
    );

    this.register(
      "postRepository",
      () =>
        new PrismaPostRepository(
          this.resolve<PrismaClient>("prisma"),
          this.resolve<PrismaUnitOfWork>("unitOfWork")
        )
    );

    // Services
    this.register(
      "userService",
      () =>
        new UserService(
          this.resolve<PrismaUserRepository>("userRepository"),
          this.resolve<IDomainEventBus>("eventBus")
        )
    );

    this.register(
      "postService",
      () =>
        new PostService(
          this.resolve<PrismaPostRepository>("postRepository"),
          this.resolve<PrismaUserRepository>("userRepository")
        )
    );
  }

  private register<T>(name: string, factory: () => T): void {
    this.services.set(name, { factory, instance: null });
  }

  resolve<T>(name: string): T {
    const service = this.services.get(name);

    if (!service) {
      throw new Error(`Service ${name} not found in container`);
    }

    // Singleton pattern - create only once
    if (!service.instance) {
      service.instance = service.factory();
    }

    return service.instance;
  }

  // Type-safe getters for easy access
  get userService(): UserService {
    return this.resolve<UserService>("userService");
  }

  get postService(): PostService {
    return this.resolve<PostService>("postService");
  }

  get userRepository(): PrismaUserRepository {
    return this.resolve<PrismaUserRepository>("userRepository");
  }

  get postRepository(): PrismaPostRepository {
    return this.resolve<PrismaPostRepository>("postRepository");
  }

  // Reset for testing
  reset(): void {
    this.services.forEach((service) => {
      service.instance = null;
    });
  }
}

// Export singleton instance
export const container = Container.getInstance();
