# Rich Domain

Uma biblioteca TypeScript para Domain-Driven Design (DDD) com suporte a validação via Standard Schema, rastreamento automático de mudanças, sistema de eventos, e repositories enterprise-ready.

## Características

- 🏗️ **Entities & Aggregates** - Classes base com identidade e ciclo de vida
- 💎 **Value Objects** - Objetos imutáveis comparados por valor
- ✅ **Standard Schema Validation** - Integração com Zod, ArkType, Valibot e outras libs
- 📜 **Change Tracking** - Histórico automático de todas as mudanças
- 🔔 **Subscriptions** - Sistema de eventos para observar mudanças
- 🎯 **Hooks** - Interceptação de criação e atualização de entidades
- 🆔 **Smart IDs** - Identificadores que sabem se a entidade é nova ou existente
- 🔍 **Criteria Pattern** - Query builder type-safe com filtros, ordenação e paginação
- 📦 **Repository Pattern** - Abstrações para persistência com suporte a Prisma, TypeORM, etc.
- 🔄 **Unit of Work** - Gerenciamento de transações cross-repository
- 📊 **Paginated Results** - Resultados paginados com serialização profunda

## Instalação

```bash
npm install rich-domain
```

## Quick Start

### 1. Definindo um Aggregate com Validação

```typescript
import { z } from "zod";
import {
  Id,
  Aggregate,
  EntityValidation,
  EntityHooks,
  BaseProps,
  throwValidationError,
} from "rich-domain";

// Define as propriedades
interface UserProps extends BaseProps {
  name: string;
  email: string;
  age: number;
  status: "active" | "inactive";
}

// Define o schema de validação (Zod, ArkType, Valibot, etc.)
const userSchema = z.object({
  id: z.custom<Id>((val) => val instanceof Id),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  age: z.number().min(0).max(150),
  status: z.enum(["active", "inactive"]),
});

// Cria o Aggregate
class User extends Aggregate<UserProps> {
  // Configuração de validação
  protected static validation: EntityValidation<UserProps> = {
    schema: userSchema,
    config: {
      onCreate: true,
      onUpdate: true,
      throwOnError: true,
    },
  };

  // Hooks de ciclo de vida
  protected static hooks: EntityHooks<UserProps, User> = {
    onCreate: (entity) => {
      console.log(`Usuário criado: ${entity.name}`);
    },

    onBeforeUpdate: (entity, snapshot) => {
      // Bloquear mudança de email
      if (snapshot.email !== entity.email) {
        return false;
      }
      return true;
    },

    rules: (entity) => {
      if (entity.name.toLowerCase() === "admin") {
        throwValidationError("name", 'Nome não pode ser "admin"');
      }
    },
  };

  get name() {
    return this.props.name;
  }
  set name(value: string) {
    this.props.name = value;
  }

  get email() {
    return this.props.email;
  }
  get age() {
    return this.props.age;
  }
  get status() {
    return this.props.status;
  }

  activate() {
    this.props.status = "active";
  }
  deactivate() {
    this.props.status = "inactive";
  }
}
```

### 2. Repository Pattern

#### In-Memory (Para Testes)

```typescript
import { InMemoryRepository, Criteria } from "rich-domain";

const userRepo = new InMemoryRepository<User>();

// Salvar
const user = new User({
  name: "João Silva",
  email: "joao@example.com",
  age: 30,
  status: "active",
});
await userRepo.save(user);

// Buscar por ID
const found = await userRepo.findById(user.id);

// Buscar com Criteria (type-safe!)
const result = await userRepo.find(
  Criteria.create<User>()
    .whereEquals("status", "active")
    .where("age", "greaterThan", 18)
    .orderByDesc("age")
    .paginate(1, 10)
);

console.log(result.data); // Array de User
console.log(result.meta); // { page, limit, total, totalPages, hasNext, hasPrevious }

// Serializar para API
const json = result.toJSON(); // Deep serialization de todos os agregados
res.json(json);
```

#### Production (Prisma, TypeORM, etc)

```typescript
import { BaseRepository, BaseMapper } from "rich-domain";

// Mapper: Domain ↔ Persistence
class UserMapper extends BaseMapper<User, PrismaUser> {
  toDomain(persistence: PrismaUser): User {
    return new User({
      id: Id.from(persistence.id),
      name: persistence.name,
      email: persistence.email,
      age: persistence.age,
      status: persistence.status as "active" | "inactive",
    });
  }

  toPersistence(domain: User): PrismaUser {
    return {
      id: domain.id.value,
      name: domain.name,
      email: domain.email,
      age: domain.age,
      status: domain.status,
    };
  }
}

// Repository
class UserRepository extends BaseRepository<User, PrismaUser> {
  constructor(private prisma: PrismaClient) {
    super(new UserMapper());
  }

  protected async insertOne(data: PrismaUser) {
    return this.prisma.user.create({ data });
  }

  protected async updateOne(id: string, data: PrismaUser) {
    return this.prisma.user.update({ where: { id }, data });
  }

  protected async deleteOne(id: string) {
    await this.prisma.user.delete({ where: { id } });
  }

  protected async findOneById(id: string) {
    const persistence = await this.prisma.user.findUnique({ where: { id } });
    return persistence ? this.mapper.toDomain(persistence) : null;
  }

  protected async findMany() {
    const persistence = await this.prisma.user.findMany();
    return this.mapper.toDomainList!(persistence);
  }

  protected async applyCriteria(criteria: Criteria<User>) {
    const where = this.buildWhereClause(criteria);
    const orderBy = this.buildOrderBy(criteria);
    const pagination = criteria.getPagination();

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy,
        skip: pagination.offset,
        take: pagination.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return [data, total];
  }

  protected async countByCriteria(criteria?: Criteria<User>) {
    const where = criteria ? this.buildWhereClause(criteria) : {};
    return this.prisma.user.count({ where });
  }

  protected async existsById(id: string) {
    const count = await this.prisma.user.count({ where: { id } });
    return count > 0;
  }

  // Helpers para converter Criteria → Prisma
  private buildWhereClause(criteria: Criteria<User>) {
    // Ver src/repository/examples/prisma-repository.example.ts
  }

  private buildOrderBy(criteria: Criteria<User>) {
    // Ver src/repository/examples/prisma-repository.example.ts
  }
}

// Uso
const prisma = new PrismaClient();
const userRepo = new UserRepository(prisma);

const result = await userRepo.find(
  Criteria.create<User>()
    .whereEquals("status", "active")
    .orderByDesc("createdAt")
    .paginate(1, 10)
);
```

### 3. Criteria Pattern (Type-Safe Queries)

```typescript
import { Criteria } from "rich-domain";

// Criar criteria
const criteria = Criteria.create<User>()
  // Filtros
  .whereEquals("status", "active")
  .where("age", "greaterThan", 18)
  .where("age", "lessThan", 65)
  .whereContains("name", "silva")
  .whereIn("status", ["active", "pending"])
  .whereBetween("age", 18, 65)
  .whereNull("deletedAt")
  .whereNotNull("email")

  // Ordenação
  .orderBy("name", "asc")
  .orderByDesc("createdAt")

  // Paginação
  .paginate(1, 10)
  .limit(20);

// Busca em múltiplos campos
criteria.search(["name", "email"], "joão");

// Serialização
const json = criteria.toJSON();

// Clone
const cloned = criteria.clone();

// From query params (para APIs)
const criteriaFromUrl = Criteria.fromQueryParams<User>({
  "status:equals": "active",
  "age:greaterThan": "18",
  orderBy: "name:asc,createdAt:desc",
  page: "1",
  limit: "10",
  search: "joão",
  searchFields: "name,email",
});
```

### 4. Unit of Work (Transações)

```typescript
import { UnitOfWork } from "rich-domain";

// Executar múltiplas operações em transação
await uow.transaction(async (ctx) => {
  const userRepo = uow.getRepository(UserRepository);
  const orderRepo = uow.getRepository(OrderRepository);

  await userRepo.save(user);
  await orderRepo.save(order);

  // Auto-commit on success
  // Auto-rollback on error
});

// Controle manual
const ctx = await uow.begin();
try {
  await userRepo.save(user);
  await orderRepo.save(order);
  await ctx.commit();
} catch (error) {
  await ctx.rollback();
  throw error;
}
```

### 5. Paginated Results com Deep Serialization

```typescript
// Com Entities/Aggregates
const users = await userRepo.find(criteria);
// users: PaginatedResult<User>

// Serialização profunda (Ids, nested entities, value objects)
const json = users.toJSON();
// {
//   data: [
//     { id: "123", name: "João", ... }, // IDs serializados para string
//     { id: "456", name: "Maria", ... }
//   ],
//   meta: {
//     page: 1,
//     limit: 10,
//     total: 100,
//     totalPages: 10,
//     hasNext: true,
//     hasPrevious: false
//   }
// }

// Utilitários
users.isEmpty; // boolean
users.hasMore; // boolean
users.map((user) => user.name); // Transforma cada item
```

## Value Objects

```typescript
import { ValueObject } from "rich-domain";

interface AddressProps {
  street: string;
  city: string;
  zipCode: string;
}

class Address extends ValueObject<AddressProps> {
  get street() {
    return this.props.street;
  }
  get city() {
    return this.props.city;
  }

  changeCity(newCity: string): Address {
    return this.clone({ city: newCity });
  }
}

const addr1 = new Address({
  street: "Av. Paulista",
  city: "São Paulo",
  zipCode: "01310-100",
});

const addr2 = new Address({
  street: "Av. Paulista",
  city: "São Paulo",
  zipCode: "01310-100",
});

addr1.equals(addr2); // true (comparação por valor)

const addr3 = addr1.changeCity("Rio de Janeiro");
addr1.city; // São Paulo (imutável)
addr3.city; // Rio de Janeiro
```

## Sistema de IDs

```typescript
import { Id } from "rich-domain";

// Nova entidade - gera UUID
const newId = new Id();
console.log(newuser.isNew()); // true

// Entidade existente
const existingId = new Id("user-123");
console.log(existinguser.isNew()); // false

// Comparação
newId.equals(existingId); // false
existingId.equals("user-123"); // true

// Static methods
const id1 = Id.create(); // Novo
const id2 = Id.from("abc-123"); // Existente
```

## Change Tracking & Subscriptions

```typescript
const user = new User({
  name: "João",
  email: "joao@example.com",
});

// Subscribe
user.subscribe({
  name: {
    onChange: ({ previous, current }) => {
      console.log(`Nome: ${previous} → ${current}`);
    },
  },
});

user.name = "Maria"; // Trigger onChange

// History
const history = user.getHistory();
// [{ path: 'name', previousValue: 'João', currentValue: 'Maria', timestamp: ... }]

user.clearHistory();
```

## Domain Events

```typescript
import { DomainEvent, DomainEventBus } from "rich-domain";

// Definir evento
class UserCreatedEvent extends DomainEvent {
  constructor(public readonly userId: Id, public readonly userName: string) {
    super("UserCreated", userId);
  }
}

// Criar aggregate
class User extends Aggregate<UserProps> {
  static create(props: Omit<UserProps, "id">) {
    const user = new User({ ...props, id: new Id() });

    // Adicionar evento
    user.addDomainEvent(new UserCreatedEvent(user.id, user.name));

    return user;
  }
}

// Handler
class SendWelcomeEmailHandler {
  async handle(event: UserCreatedEvent) {
    await sendEmail(event.userName);
  }
}

// Registrar handler
const bus = DomainEventBus.getInstance();
bus.subscribe(UserCreatedEvent, new SendWelcomeEmailHandler());

// Publicar eventos
const user = User.create({ name: "João", email: "joao@example.com" });
await user.dispatchAll(bus);
```

## Validation

### Com Throw

```typescript
const user = new User({
  name: "J", // Muito curto
  email: "invalid",
});
// throws ValidationError
```

### Sem Throw

```typescript
class UserSafe extends Aggregate<UserProps> {
  protected static validation = {
    schema: userSchema,
    config: { throwOnError: false },
  };
}

const user = new UserSafe({
  name: "J",
  email: "invalid",
});

if (user.hasValidationErrors) {
  console.log(user.validationErrors!.getMessages());
  // ['Nome deve ter pelo menos 2 caracteres', 'Email inválido']
}
```

## Compatibilidade Standard Schema

### Zod

```typescript
import { z } from "zod";
const schema = z.object({ ... });
```

### Valibot

```typescript
import * as v from "valibot";
const schema = v.object({ ... });
```

### ArkType

```typescript
import { type } from "arktype";
const schema = type({ ... });
```

## Estrutura de Arquivos

Para exemplos completos, veja:

- `src/repository/examples/prisma-repository.example.ts` - Implementação Prisma completa
- `src/repository/examples/README.md` - Documentação detalhada
- `tests/` - Testes completos de todos os recursos

## API Reference

### Repository

```typescript
interface IRepository<TDomain> {
  findById(id: Id): Promise<TDomain | null>;
  find(criteria: Criteria<TDomain>): Promise<PaginatedResult<TDomain>>;
  findAll(criteria?: Criteria<TDomain>): Promise<TDomain[]>;
  findOne(criteria: Criteria<TDomain>): Promise<TDomain | null>;
  save(aggregate: TDomain): Promise<void>;
  saveMany(aggregates: TDomain[]): Promise<void>;
  delete(aggregate: TDomain): Promise<void>;
  deleteById(id: Id): Promise<void>;
  exists(id: Id): Promise<boolean>;
  count(criteria?: Criteria<TDomain>): Promise<number>;
}
```

### Criteria

```typescript
class Criteria<T> {
  static create<T>(): Criteria<T>;

  // Filters
  where(field, operator, value?): this;
  whereEquals(field, value): this;
  whereContains(field, value): this;
  whereIn(field, values): this;
  whereBetween(field, min, max): this;
  whereNull(field): this;
  whereNotNull(field): this;

  // Ordering
  orderBy(field, direction?): this;
  orderByAsc(field): this;
  orderByDesc(field): this;

  // Pagination
  paginate(page, limit): this;
  limit(limit): this;

  // Search
  search(fields, value): this;

  // Utils
  clone(): Criteria<T>;
  toJSON(): object;

  static fromObject<T>(obj): Criteria<T>;
  static fromQueryParams<T>(query): Criteria<T>;
}
```

### PaginatedResult

```typescript
class PaginatedResult<T> {
  readonly data: T[];
  readonly meta: PaginationMeta;

  static create<T>(data, pagination, total): PaginatedResult<T>;
  static createMeta(pagination, total): PaginationMeta;
  static fromArray<T>(items, criteria): PaginatedResult<T>;

  toJSON(): PaginatedJsonResult<T>; // Deep serialization
  map<U>(fn): PaginatedResult<U>;

  get isEmpty(): boolean;
  get hasMore(): boolean;
}
```

### Id

```typescript
class Id {
  constructor(value?: string);

  get value(): string;
  get isNew(): boolean;

  toString(): string;
  toJSON(): string;
  equals(other: Id | string): boolean;

  static create(): Id;
  static from(value: string): Id;
}
```

### BaseEntity

```typescript
abstract class BaseEntity<T extends BaseProps> {
  get id(): Id;
  get isNew(): boolean;
  get hasValidationErrors(): boolean;
  get validationErrors(): ValidationError | undefined;

  subscribe(config: SubscriptionConfig<T>): void;
  getHistory(): HistoryEntry[];
  clearHistory(): void;
  toJson(): DeepJsonResult<T>;

  // Domain Events
  protected addDomainEvent(event: IDomainEvent): void;
  getUncommittedEvents(): IDomainEvent[];
  clearEvents(): void;
  async dispatchAll(bus: DomainEventBus): Promise<void>;
}
```

### ValueObject

```typescript
abstract class ValueObject<T> {
  protected readonly props: T;

  equals(other: ValueObject<T>): boolean;
  toJson(): T;
  protected clone(updates: Partial<T>): this;
}
```

## Testing

```typescript
import { InMemoryRepository } from "rich-domain";

describe("UserService", () => {
  const userRepo = new InMemoryRepository<User>();
  const service = new UserService(userRepo);

  beforeEach(() => userRepo.clear());

  it("should create user", async () => {
    const user = await service.createUser({
      name: "João",
      email: "joao@example.com",
    });

    expect(user.user.isNew()).toBe(false);
    expect(await userRepo.exists(user.id)).toBe(true);
  });
});
```

## Roadmap

- [ ] TypeORM repository example
- [ ] MongoDB repository example
- [ ] Drizzle ORM repository example
- [ ] GraphQL integration utilities
- [ ] Advanced caching strategies

## Contribuindo

Contribuições são bem-vindas! Veja [CONTRIBUTING.md](CONTRIBUTING.md) para detalhes.

## Licença

MIT

## Links

- [Documentação Completa](https://github.com/yourusername/rich-domain)
- [Exemplos](./src/repository/examples)
- [Issues](https://github.com/yourusername/rich-domain/issues)

## Package Formats

This library is published as a **dual package** supporting both CommonJS and ES Modules:

### CommonJS (Node.js)
```javascript
const { Id, Entity, Aggregate } = require('@woltz/rich-domain');
```

### ES Modules (Modern bundlers & Node.js with ESM)
```javascript
import { Id, Entity, Aggregate } from '@woltz/rich-domain';
```

### Benefits
- ✅ **Universal compatibility**: Works in any Node.js environment
- ✅ **Tree-shaking**: Modern bundlers (Vite, Rollup, Webpack 5+) can eliminate unused code
- ✅ **TypeScript support**: Full type definitions included
- ✅ **Zero configuration**: Automatically uses the correct format for your environment

