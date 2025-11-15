import { IDomainEvent } from '../interface/types';
import { Author, AuthorProps } from './author';

export class DomainEvent<T, K = void> implements IDomainEvent<T> {
  static queueName: string;
  static eventDisplayName: string;
  static aggregate: string;
  static eventDescription: string;
  static availableOnWorkflows = false;

  public aggregate!: T;
  public createdAt!: Date;
  public eventName: string;

  public authorProps: AuthorProps<any> | null = null;

  // @ts-ignore
  public returnType: K;

  constructor(aggregate: T, eventName?: string) {
    this.aggregate = aggregate;
    this.createdAt = new Date();
    this.eventName = eventName || this?.constructor?.name;
  }

  public setAuthor(author: Author<any>) {
    this.authorProps = author.getProps();
  }
}
