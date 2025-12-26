import { BullMQEventBus } from "../queue/event-bus.js";
import { connection } from "../queue/connection.js";
import { UserService } from "../../application/services/user.service.js";
import { PostService } from "../../application/services/post.service.js";
import { AppDataSource } from "../database/data-source.js";
import { TypeORMUnitOfWork } from "@woltz/rich-domain-typeorm";
import { TypeORMUserRepository } from "../database/repositories/typeorm-user.repository.js";
import { UserEntity } from "../database/models/User.js";
import { Repository } from "typeorm";
import { TypeORMPostRepository } from "../database/repositories/typeorm-post.repository.js";
import { PostEntity } from "../database/models/Post.js";
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
    this.register("appDataSource", () => AppDataSource);
    this.register("unitOfWork", () => new TypeORMUnitOfWork(AppDataSource));
    this.register("eventBus", () => new BullMQEventBus(connection));

    // Repositories
    this.register(
      "userRepository",
      () =>
        new TypeORMUserRepository(
          this.resolve<Repository<UserEntity>>("userRepository"),
          this.resolve<TypeORMUnitOfWork>("unitOfWork")
        )
    );

    this.register(
      "postRepository",
      () =>
        new TypeORMPostRepository(
          this.resolve<Repository<PostEntity>>("postRepository"),
          this.resolve<TypeORMUnitOfWork>("unitOfWork")
        )
    );

    // Services
    this.register(
      "userService",
      () =>
        new UserService(
          this.resolve<TypeORMUserRepository>("userRepository"),
          this.resolve<IDomainEventBus>("eventBus")
        )
    );

    this.register(
      "postService",
      () =>
        new PostService(
          this.resolve<TypeORMPostRepository>("postRepository"),
          this.resolve<TypeORMUserRepository>("userRepository")
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

  get userRepository(): TypeORMUserRepository {
    return this.resolve<TypeORMUserRepository>("userRepository");
  }

  get postRepository(): TypeORMPostRepository {
    return this.resolve<TypeORMPostRepository>("postRepository");
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
