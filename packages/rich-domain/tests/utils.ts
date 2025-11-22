// ============================================================================
// Test Entities & Value Objects
// ============================================================================

import {
  Aggregate,
  Criteria,
  Entity,
  Id,
  Mapper,
  PaginatedResult,
  Repository,
  UnitOfWork,
  ValueObject,
} from "../src";

interface AddressProps {
  street: string;
  city: string;
  zipCode: string;
}

class Address extends ValueObject<AddressProps> {
  get street(): string {
    return this.props.street;
  }

  get city(): string {
    return this.props.city;
  }

  get zipCode(): string {
    return this.props.zipCode;
  }
}

interface PostProps {
  id: Id;
  title: string;
  content: string;
  likes: number;
}

class Post extends Entity<PostProps> {
  get title(): string {
    return this.props.title;
  }

  set title(value: string) {
    this.props.title = value;
  }

  get content(): string {
    return this.props.content;
  }

  set content(value: string) {
    this.props.content = value;
  }

  get likes(): number {
    return this.props.likes;
  }

  set likes(value: number) {
    this.props.likes = value;
  }
}

interface CommentProps {
  id: Id;
  text: string;
  author: string;
}

class Comment extends Entity<CommentProps> {
  get text(): string {
    return this.props.text;
  }

  set text(value: string) {
    this.props.text = value;
  }

  get author(): string {
    return this.props.author;
  }
}

interface UserProps {
  id: Id;
  name: string;
  email: string;
  posts: Post[];
  address: Address;
  comments: Comment[];
  extra?: {
    age: number;
    height: number;
  };
}

class User extends Aggregate<UserProps> {
  get name(): string {
    return this.props.name;
  }

  set name(value: string) {
    this.props.name = value;
  }

  get email(): string {
    return this.props.email;
  }

  get posts(): Post[] {
    return this.props.posts;
  }

  set posts(value: Post[]) {
    this.props.posts = value;
  }

  get address(): Address {
    return this.props.address;
  }

  set address(value: Address) {
    this.props.address = value;
  }

  get comments(): Comment[] {
    return this.props.comments;
  }

  set comments(value: Comment[]) {
    this.props.comments = value;
  }

  public addPost(post: Post) {
    this.props.posts.push(post);
  }

  public addManyPosts(posts: Post[]) {
    this.props.posts.push(...posts);
  }

  public removePostById(id: string) {
    this.props.posts = this.props.posts.filter((post) => post.id.value !== id);
  }

  public changeEmail(email: string) {
    this.props.email = email;
  }

  public changeExtra(extra: { age: number; height: number }) {
    this.props.extra = extra;
  }
}

class InMemoryRepository<
  TDomain extends Aggregate<any>
> extends Repository<TDomain> {
  protected items: Map<string, TDomain> = new Map();
  readonly uow: UnitOfWork;
  constructor(
    protected readonly mapperToDomain: Mapper<unknown, TDomain>,
    protected readonly mapperToPersistence: Mapper<TDomain, unknown>
  ) {
    super();
    this.uow = {} as UnitOfWork;
  }

  get model(): any {
    // your database table name
    return "inMemory";
  }

  async findById(id: string): Promise<TDomain | null> {
    return this.items.get(id) || null;
  }

  async find(criteria: Criteria<TDomain>): Promise<PaginatedResult<TDomain>> {
    const allItems = Array.from(this.items.values());
    return PaginatedResult.fromArray(allItems, criteria);
  }

  async findAll(criteria?: Criteria<TDomain>): Promise<TDomain[]> {
    if (criteria) {
      const result = await this.find(criteria);
      return result.data;
    }

    return Array.from(this.items.values());
  }

  async findOne(criteria: Criteria<TDomain>): Promise<TDomain | null> {
    const result = await this.find(criteria.clone().limit(1));
    return result.data.length > 0 ? result.data[0] : null;
  }

  async create(aggregate: TDomain): Promise<void> {
    this.items.set(aggregate.id.value, aggregate);
  }

  async update(entity: TDomain): Promise<void> {
    this.items.set(entity.id.value, entity);
  }

  async createMany(aggregates: TDomain[]): Promise<void> {
    for (const aggregate of aggregates) {
      await this.create(aggregate);
    }
  }

  async delete(aggregate: TDomain): Promise<void> {
    this.items.delete(aggregate.id.value);
  }

  async exists(id: string): Promise<boolean> {
    return this.items.has(id);
  }

  async count(criteria?: Criteria<TDomain>): Promise<number> {
    if (criteria) {
      const result = await this.find(criteria);
      return result.meta.total;
    }
    return this.items.size;
  }

  /**
   * Clear all items (useful for test cleanup)
   */
  clear(): void {
    this.items.clear();
  }

  /**
   * Get all items as array (useful for debugging)
   */
  getAll(): TDomain[] {
    return Array.from(this.items.values());
  }

  /**
   * Get items count
   */
  size(): number {
    return this.items.size;
  }
}

export { User, Post, Comment, Address, InMemoryRepository };
