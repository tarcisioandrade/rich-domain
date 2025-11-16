import assert from 'assert';
import { Aggregate } from './aggregate';
import { DomainEvent } from './domain-event';

export enum AuthorContext {
  Customer = 'Customer',
  Manager = 'Manager',
}

const PERMISSION_HIERARCHY = {
  basic: 1,
  advanced: 2,
  admin: 3,
  dev: 4,
} as const;

interface AbstractPermission {
  permissionId: string;
  level: string;
  context: string;
}

export interface BaseAuthorProps<T extends AbstractPermission> {
  id: string;
  exp: number;
  email: string | null;
  fullName: string | null;
  context: AuthorContext;
  permissions: T[];
}
export interface ManagerAuthorProps<T extends AbstractPermission>
  extends BaseAuthorProps<T> {
  context: AuthorContext.Manager;
}

export interface CustomerAuthorProps<T extends AbstractPermission>
  extends BaseAuthorProps<T> {
  context: AuthorContext.Customer;
  customerId: string;
}

export type AuthorProps<T extends AbstractPermission> =
  | ManagerAuthorProps<T>
  | CustomerAuthorProps<T>;

export class Author<T extends AbstractPermission> {
  private props: AuthorProps<T>;

  constructor(input: AuthorProps<T>) {
    this.props = input;

    if (this.props.context === AuthorContext.Customer) {
      if (!this.props.customerId) {
        throw new Error('Customer ID is required');
      }
    }
  }

  get id() {
    return this.props.id;
  }

  get exp() {
    return this.props.exp;
  }

  get email() {
    return this.props.email;
  }

  get fullName() {
    return this.props.fullName;
  }

  get context() {
    return this.props.context;
  }

  get customerId(): string {
    if (this.props.context !== AuthorContext.Customer) {
      throw new Error('Forbidden. Customer ID is required');
    }

    return this.props.customerId;
  }

  public getProps(): AuthorProps<T> {
    return this.props;
  }

  public isTheSameAs(user: Aggregate<any>) {
    return user.id.value === this.id;
  }

  public subscribeTo(event: DomainEvent<unknown, unknown>) {
    event.setAuthor(this);
  }

  get permissions(): T[] {
    return this.props.permissions;
  }

  public isCustomer() {
    return this.props.context === AuthorContext.Customer;
  }

  public isManager() {
    return this.props.context === AuthorContext.Manager;
  }

  public hasPermission(
    requiredPermissionsInput:
      | `${T['permissionId']}.${Lowercase<T['level']>}`
      | `${T['permissionId']}.${Lowercase<T['level']>}`[],
  ): boolean {
    const permissions = Array.isArray(requiredPermissionsInput)
      ? requiredPermissionsInput
      : [requiredPermissionsInput];

    return permissions.some((requiredPermission) => {
      const [permissionId, level] = requiredPermission.split('.');

      if (!permissionId || !level) {
        return false;
      }

      const userPermissionsForType = this.props.permissions.filter(
        (permission) => permission.permissionId === permissionId,
      );

      if (userPermissionsForType.length === 0) {
        return false;
      }

      return userPermissionsForType.some((userPermission) => {
        const userLevel =
          PERMISSION_HIERARCHY[
            userPermission.level.toLowerCase() as keyof typeof PERMISSION_HIERARCHY
          ];
        const requiredLevelNum =
          PERMISSION_HIERARCHY[
            level.toLowerCase() as keyof typeof PERMISSION_HIERARCHY
          ];

        if (!userLevel || !requiredLevelNum) {
          return false;
        }

        return userLevel >= requiredLevelNum;
      });
    });
  }

  public getPermissionById(permissionId: T['permissionId']): T[] {
    return this.props.permissions.filter(
      (permission) => permission.permissionId === permissionId,
    );
  }

  public getPermissionByCode(
    code: `${T['permissionId']}.${Lowercase<T['context']>}`,
  ): T | null {
    const [permissionId, context] = code.split('.');

    assert(permissionId, 'Permission ID is required');
    assert(context, 'Context is required');

    const permission = this.props.permissions.find(
      (permission) => permission.permissionId === permissionId,
    );

    if (!permission) {
      throw new Error('Permission not found');
    }

    return permission.context.toLowerCase() === context.toLowerCase()
      ? permission
      : null;
  }
}
