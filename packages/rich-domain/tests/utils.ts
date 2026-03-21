import {
  Aggregate,
  Criteria,
  Entity,
  Id,
  Mapper,
  PaginatedResult,
  Repository,
  throwValidationError,
  UnitOfWork,
  ValueObject,
  VOHooks,
} from "../src";

export class Like extends Entity<{
  id: Id;
  postId: string;
  userId: string;
  createdAt: Date;
}> {
  get postId() {
    return this.props.postId;
  }
  get userId() {
    return this.props.userId;
  }
}

export class Address extends Entity<{
  id: Id;
  street: string;
  city: string;
}> {
  get street() {
    return this.props.street;
  }
  get city() {
    return this.props.city;
  }

  changeStreet(street: string) {
    this.props.street = street;
  }
}

export class TagReference extends Entity<{
  tagId: string;
  name: string;
  id: Id;
}> {
  get tagId() {
    return this.props.tagId;
  }
  get name() {
    return this.props.name;
  }
}

export class Comment extends Entity<{
  id: Id;
  text: string;
  authorId: string;
  likes: Like[];
}> {
  get text() {
    return this.props.text;
  }
  get authorId() {
    return this.props.authorId;
  }
  get likes() {
    return this.props.likes;
  }

  changeText(text: string) {
    this.props.text = text;
  }

  addLike(like: Like) {
    this.props.likes.push(like);
  }

  removeLike(postId: string, userId: string) {
    this.props.likes = this.props.likes.filter(
      (l) => !(l.postId === postId && l.userId === userId)
    );
  }
}
export class Post extends Entity<{
  id: Id;
  title: string;
  content: string;
  published: boolean;
  comments: Comment[];
}> {
  get title() {
    return this.props.title;
  }
  get content() {
    return this.props.content;
  }
  get published() {
    return this.props.published;
  }
  get comments() {
    return this.props.comments;
  }

  set comments(comments: Comment[]) {
    this.props.comments = comments;
  }

  changeTitle(title: string) {
    this.props.title = title;
  }

  publish() {
    this.props.published = true;
  }

  addComment(comment: Comment) {
    this.props.comments.push(comment);
  }

  removeComment(commentId: Id) {
    this.props.comments = this.props.comments.filter(
      (c) => c.id.value !== commentId.value
    );
  }
}

export class Email extends ValueObject<string> {
  protected static hooks?: VOHooks<string, Email> = {
    rules(valueObject) {
      if (!valueObject.value.includes("@")) {
        throwValidationError("email", "Invalid email");
      }
    },
  };
}

export class User extends Entity<{
  id: Id;
  name: string;
  email: Email;
  address: Address | null;
  posts: Post[];
  tags: TagReference[];
}> {
  get name() {
    return this.props.name;
  }

  get email() {
    return this.props.email.value;
  }

  get address() {
    return this.props.address;
  }
  get posts() {
    return this.props.posts;
  }
  get tags() {
    return this.props.tags;
  }

  set posts(posts: Post[]) {
    this.props.posts = posts;
  }

  changeName(name: string) {
    this.props.name = name;
  }

  changeEmail(email: string) {
    this.props.email = new Email(email);
  }

  setAddress(address: Address) {
    this.props.address = address;
  }

  removeAddress() {
    this.props.address = null;
  }

  addPost(post: Post) {
    this.props.posts.push(post);
  }

  removePost(postId: Id) {
    this.props.posts = this.props.posts.filter(
      (p) => p.id.value !== postId.value
    );
  }

  addTag(tag: TagReference) {
    this.props.tags.push(tag);
  }

  addManyTags(tags: TagReference[]) {
    this.props.tags.push(...tags);
  }

  addManyPosts(posts: Post[]) {
    this.props.posts.push(...posts);
  }

  removeTag(tagId: string) {
    this.props.tags = this.props.tags.filter((t) => t.tagId !== tagId);
  }

  public getTypedChanges() {
    type UserEntities = {
      User: User;
      Post: Post;
      Comment: Comment;
      Address: Address;
      TagReference: TagReference;
      Like: Like;
    };
    return this.getChanges<UserEntities>();
  }
}

export class InMemoryRepository<
  TDomain extends Aggregate<any>,
> extends Repository<TDomain> {
  protected items: Map<string, TDomain> = new Map();
  readonly uow: UnitOfWork;
  constructor(
    protected readonly toDomainMapper: Mapper<unknown, TDomain>,
    protected readonly toPersistenceMapper: Mapper<TDomain, unknown>
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

  async findManyByIds(ids: string[]): Promise<TDomain[]> {
    return ids
      .map((id) => this.items.get(id) as TDomain)
      .filter((item) => item !== null);
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

  async save(aggregate: TDomain): Promise<void> {
    this.items.set(aggregate.id.value, aggregate);
    aggregate.markAsPersisted();
  }

  async createMany(aggregates: TDomain[]): Promise<void> {
    for (const aggregate of aggregates) {
      await this.save(aggregate);
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

  clear(): void {
    this.items.clear();
  }

  getAll(): TDomain[] {
    return Array.from(this.items.values());
  }

  size(): number {
    return this.items.size;
  }
}
