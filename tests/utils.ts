// ============================================================================
// Test Entities & Value Objects
// ============================================================================

import { Aggregate, Entity, Id, ValueObject } from "../src";

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

export { User, Post, Comment, Address };
