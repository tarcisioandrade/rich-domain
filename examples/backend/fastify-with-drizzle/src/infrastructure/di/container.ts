import { DrizzleUnitOfWork } from "@woltz/rich-domain-drizzle";
import { IDomainEventBus } from "@woltz/rich-domain";
import { getDb } from "../database/db";
import { DrizzleUserRepository } from "../database/repositories/drizzle-user.repository";
import { DrizzlePostRepository } from "../database/repositories/drizzle-post.repository";
import { UserService } from "../../application/services/user.service";
import { PostService } from "../../application/services/post.service";
import { BullMQEventBus } from "../queue/event-bus";
import { connection } from "../queue/connection";

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
    this.register("unitOfWork", () => new DrizzleUnitOfWork(getDb() as any));
    this.register("eventBus", () => new BullMQEventBus(connection));

    this.register(
      "userRepository",
      () =>
        new DrizzleUserRepository(this.resolve<DrizzleUnitOfWork>("unitOfWork"))
    );

    this.register(
      "postRepository",
      () =>
        new DrizzlePostRepository(this.resolve<DrizzleUnitOfWork>("unitOfWork"))
    );

    this.register(
      "userService",
      () =>
        new UserService(
          this.resolve<DrizzleUserRepository>("userRepository"),
          this.resolve<IDomainEventBus>("eventBus")
        )
    );

    this.register(
      "postService",
      () =>
        new PostService(
          this.resolve<DrizzlePostRepository>("postRepository"),
          this.resolve<DrizzleUserRepository>("userRepository")
        )
    );
  }

  private register<T>(name: string, factory: () => T): void {
    this.services.set(name, { factory, instance: null });
  }

  resolve<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) throw new Error(`Service "${name}" not found in container`);
    if (!service.instance) service.instance = service.factory();
    return service.instance;
  }

  get userService(): UserService {
    return this.resolve<UserService>("userService");
  }

  get postService(): PostService {
    return this.resolve<PostService>("postService");
  }
}

export const container = Container.getInstance();
