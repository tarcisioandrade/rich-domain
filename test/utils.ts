// ============================================================================
// Test Entities & Value Objects
// ============================================================================

import { Aggregate, Entity, ValueObject } from './core/core';
import { Id } from './core/id';

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
    return this.properties.title;
  }

  set title(value: string) {
    this.properties.title = value;
  }

  get content(): string {
    return this.properties.content;
  }

  set content(value: string) {
    this.properties.content = value;
  }

  get likes(): number {
    return this.properties.likes;
  }

  set likes(value: number) {
    this.properties.likes = value;
  }
}

interface CommentProps {
  id: Id;
  text: string;
  author: string;
}

class Comment extends Entity<CommentProps> {
  get text(): string {
    return this.properties.text;
  }

  set text(value: string) {
    this.properties.text = value;
  }

  get author(): string {
    return this.properties.author;
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
    return this.properties.name;
  }

  set name(value: string) {
    this.properties.name = value;
  }

  get email(): string {
    return this.properties.email;
  }

  get posts(): Post[] {
    return this.properties.posts;
  }

  set posts(value: Post[]) {
    this.properties.posts = value;
  }

  get address(): Address {
    return this.properties.address;
  }

  set address(value: Address) {
    this.properties.address = value;
  }

  get comments(): Comment[] {
    return this.properties.comments;
  }

  set comments(value: Comment[]) {
    this.properties.comments = value;
  }

  public addPost(post: Post) {
    this.properties.posts.push(post);
  }

  public addManyPosts(posts: Post[]) {
    this.properties.posts.push(...posts);
  }

  public removePostById(id: string) {
    this.properties.posts = this.properties.posts.filter(
      post => post.id.value !== id
    );
  }

  public changeEmail(email: string) {
    this.properties.email = email;
  }

  public changeExtra(extra: { age: number; height: number }) {
    this.properties.extra = extra;
  }
}

export { User, Post, Comment, Address };
