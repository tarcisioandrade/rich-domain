# Rich Domain

Uma biblioteca TypeScript para Domain-Driven Design (DDD) com suporte a validação via Standard Schema, rastreamento automático de mudanças e sistema de eventos.

## Características

- 🏗️ **Entities & Aggregates** - Classes base com identidade e ciclo de vida
- 💎 **Value Objects** - Objetos imutáveis comparados por valor
- ✅ **Standard Schema Validation** - Integração com Zod, ArkType, Valibot e outras libs
- 📜 **Change Tracking** - Histórico automático de todas as mudanças
- 🔔 **Subscriptions** - Sistema de eventos para observar mudanças
- 🎯 **Hooks** - Interceptação de criação e atualização de entidades
- 🆔 **Smart IDs** - Identificadores que sabem se a entidade é nova ou existente

## Instalação

```bash
npm install rich-domain
```

## Quick Start

### 1. Definindo um Aggregate com Validação

```typescript
import { z } from 'zod';
import { 
  Id, 
  Aggregate, 
  EntityValidation, 
  EntityHooks, 
  BaseProps,
  throwValidationError 
} from 'rich-domain';

// Define as propriedades
interface UserProps extends BaseProps {
  id: Id;
  name: string;
  email: string;
  age: number;
  status: 'active' | 'inactive';
}

// Define o schema de validação (Zod, ArkType, Valibot, etc.)
const userSchema = z.object({
  id: z.custom<Id>((val) => val instanceof Id),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  age: z.number().min(0).max(150),
  status: z.enum(['active', 'inactive']),
});

// Cria o Aggregate
class User extends Aggregate<UserProps> {
  // Configuração de validação
  protected static validation: EntityValidation<UserProps> = {
    schema: userSchema,
    config: {
      onCreate: true,      // Validar na criação
      onUpdate: true,      // Validar em atualizações
      throwOnError: true,  // Lançar erro ou armazenar internamente
    },
  };

  // Hooks de ciclo de vida
  protected static hooks: EntityHooks<UserProps, User> = {
    // Valores padrão
    defaultValues: {
      age: 18,
      status: 'active',
    },
    
    // Executado após criação bem-sucedida
    onCreate: (entity) => {
      console.log(`Usuário criado: ${entity.name}`);
    },
    
    // Executado antes de cada atualização
    // Retorne false para bloquear a atualização
    onBeforeUpdate: (entity, snapshot) => {
      // Exemplo: bloquear mudança de email
      if (snapshot.email !== entity.email) {
        console.warn('Mudança de email bloqueada');
        return false;
      }
      return true;
    },
    
    // Regras de negócio customizadas
    rules: (entity) => {
      if (entity.name.toLowerCase() === 'admin') {
        throwValidationError('name', 'Nome não pode ser "admin"');
      }
    },
  };

  // Getters e Setters
  get name(): string {
    return this.properties.name;
  }

  set name(value: string) {
    this.properties.name = value;
  }

  get email(): string {
    return this.properties.email;
  }

  set email(value: string) {
    this.properties.email = value;
  }

  get age(): number {
    return this.properties.age;
  }

  set age(value: number) {
    this.properties.age = value;
  }

  get status(): 'active' | 'inactive' {
    return this.properties.status;
  }

  // Métodos de domínio
  deactivate(): void {
    this.properties.status = 'inactive';
  }

  activate(): void {
    this.properties.status = 'active';
  }
}
```

### 2. Uso Básico

```typescript
// Criar usuário (validação automática no constructor)
const user = new User({
  name: 'João Silva',
  email: 'joao@exemplo.com',
});

console.log(user.name);     // João Silva
console.log(user.age);      // 18 (valor padrão)
console.log(user.status);   // active (valor padrão)
console.log(user.isNew);    // true (ID foi gerado automaticamente)

// Atualizar propriedades (validação automática)
user.name = 'Maria Silva';  // OK
user.age = 25;              // OK

// Tentar atualização inválida
try {
  user.name = 'A';  // Erro: muito curto
} catch (error) {
  console.log(error.issues);
  // [{ path: ['name'], message: 'Nome deve ter pelo menos 2 caracteres' }]
}

// Serialização
const json = user.toJson();
// {
//   id: "550e8400-e29b-41d4-a716-446655440000",
//   name: "Maria Silva",
//   email: "joao@exemplo.com",
//   age: 25,
//   status: "active"
// }
```

### 3. Tratamento de Erros sem Throw

```typescript
class UserSafe extends Aggregate<UserProps> {
  protected static validation: EntityValidation<UserProps> = {
    schema: userSchema,
    config: {
      throwOnError: false,  // Não lança erro, armazena internamente
    },
  };

  protected static hooks: EntityHooks<UserProps, UserSafe> = {
    defaultValues: {
      age: 18,
      status: 'active',
    },
  };

  get name(): string {
    return this.properties.name;
  }
}

// Criar com dados inválidos
const user = new UserSafe({
  name: 'J',           // Muito curto
  email: 'invalido',   // Email inválido
});

// Verificar erros
if (user.hasValidationErrors) {
  console.log(user.validationErrors!.issues);
  // [
  //   { path: ['name'], message: 'Nome deve ter pelo menos 2 caracteres' },
  //   { path: ['email'], message: 'Email inválido' }
  // ]
  
  // Verificar erro específico
  if (user.validationErrors!.hasErrorsForPath('email')) {
    console.log('Email inválido!');
  }
}
```

## Value Objects

Value Objects são objetos imutáveis comparados por valor, não por referência.

```typescript
import { ValueObject } from 'rich-domain';

interface AddressProps {
  street: string;
  city: string;
  zipCode: string;
  country: string;
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

  get country(): string {
    return this.props.country;
  }

  get fullAddress(): string {
    return `${this.street}, ${this.city}, ${this.zipCode}, ${this.country}`;
  }

  // Criar nova instância com valores atualizados
  changeCity(newCity: string): Address {
    return this.clone({ city: newCity });
  }
}

// Uso
const addr1 = new Address({
  street: 'Av. Paulista, 1000',
  city: 'São Paulo',
  zipCode: '01310-100',
  country: 'Brasil',
});

const addr2 = new Address({
  street: 'Av. Paulista, 1000',
  city: 'São Paulo',
  zipCode: '01310-100',
  country: 'Brasil',
});

// Comparação por valor
addr1.equals(addr2);  // true

// Imutabilidade - retorna nova instância
const addr3 = addr1.changeCity('Rio de Janeiro');
addr1.city;  // São Paulo (não mudou)
addr3.city;  // Rio de Janeiro

// Serialização
addr1.toJson();
// {
//   street: 'Av. Paulista, 1000',
//   city: 'São Paulo',
//   zipCode: '01310-100',
//   country: 'Brasil'
// }
```

## Sistema de IDs

O `Id` sabe automaticamente se representa uma entidade nova ou existente.

```typescript
import { Id } from 'rich-domain';

// Nova entidade - gera UUID automaticamente
const newId = new Id();
console.log(newId.value);   // "550e8400-e29b-41d4-a716-446655440000"
console.log(newId.isNew);   // true

// Entidade existente - usa ID fornecido
const existingId = new Id('user-123');
console.log(existingId.value);  // "user-123"
console.log(existingId.isNew);  // false

// Comparação
newId.equals(existingId);           // false
existingId.equals('user-123');      // true
existingId.equals(new Id('user-123'));  // true

// Serialização
JSON.stringify({ id: newId });  // { "id": "550e8400..." }

// Static methods
const id1 = Id.create();        // Novo ID
const id2 = Id.from('abc-123'); // ID existente
```

## Rastreamento de Mudanças

Todas as mudanças são automaticamente registradas no histórico.

```typescript
const user = new User({
  name: 'João',
  email: 'joao@exemplo.com',
});

// Fazer algumas mudanças
user.name = 'Maria';
user.age = 25;
user.status = 'inactive';

// Ver histórico
const history = user.getHistory();
console.log(history);
// [
//   {
//     path: 'name',
//     previousValue: 'João',
//     currentValue: 'Maria',
//     timestamp: 1234567890
//   },
//   {
//     path: 'age',
//     previousValue: 18,
//     currentValue: 25,
//     timestamp: 1234567891
//   },
//   {
//     path: 'status',
//     previousValue: 'active',
//     currentValue: 'inactive',
//     timestamp: 1234567892
//   }
// ]

// Limpar histórico
user.clearHistory();
user.getHistory();  // []
```

## Subscriptions (Observadores)

Observe mudanças em propriedades específicas ou arrays.

### Propriedades Simples

```typescript
const user = new User({
  name: 'João',
  email: 'joao@exemplo.com',
});

user.subscribe({
  name: {
    onChange: ({ previous, current, path }) => {
      console.log(`Nome mudou de "${previous}" para "${current}"`);
    },
  },
  age: {
    onChange: ({ previous, current }) => {
      console.log(`Idade mudou de ${previous} para ${current}`);
    },
  },
});

user.name = 'Maria';  // Log: Nome mudou de "João" para "Maria"
user.age = 30;        // Log: Idade mudou de 18 para 30
```

### Arrays (Create, Update, Delete)

```typescript
interface BlogUserProps extends BaseProps {
  id: Id;
  name: string;
  posts: Post[];
}

class BlogUser extends Entity<BlogUserProps> {
  get posts(): Post[] {
    return this.properties.posts;
  }

  set posts(value: Post[]) {
    this.properties.posts = value;
  }
}

const user = new BlogUser({
  id: new Id('1'),
  name: 'João',
  posts: [
    new Post({ id: new Id('1'), title: 'Post 1' }),
    new Post({ id: new Id('2'), title: 'Post 2' }),
  ],
});

user.subscribe({
  posts: {
    onChange: ({ toCreate, toUpdate, toDelete, path }) => {
      console.log('Posts criados:', toCreate.length);
      console.log('Posts atualizados:', toUpdate.length);
      console.log('Posts deletados:', toDelete.length);
    },
  },
});

// Adicionar post
user.posts = [
  ...user.posts,
  new Post({ id: new Id('3'), title: 'Post 3' }),
];
// Log: Posts criados: 1, Posts atualizados: 0, Posts deletados: 0

// Atualizar post existente
user.posts[0].title = 'Post 1 Atualizado';
user.posts = [...user.posts];  // Trigger change detection
// Log: Posts criados: 0, Posts atualizados: 1, Posts deletados: 0

// Remover post
user.posts = user.posts.filter(p => p.id.value !== '2');
// Log: Posts criados: 0, Posts atualizados: 0, Posts deletados: 1
```

## Configuração de Validação

```typescript
interface ValidationConfig {
  onCreate?: boolean;     // Validar na criação (padrão: true)
  onUpdate?: boolean;     // Validar em atualizações (padrão: true)
  throwOnError?: boolean; // Lançar erro ou armazenar internamente (padrão: true)
}

// Exemplo: Validar apenas na criação
protected static validation = {
  schema: mySchema,
  config: {
    onCreate: true,
    onUpdate: false,  // Não valida em atualizações
    throwOnError: true,
  },
};
```

## Hooks

```typescript
interface EntityHooks<T, E> {
  // Valores padrão aplicados antes da validação
  defaultValues?: Partial<T>;

  // Executado após criação bem-sucedida
  onCreate?: (entity: E) => void;

  // Executado antes de cada update
  // Retorne false para bloquear o update
  onBeforeUpdate?: (entity: E, snapshot: T) => boolean;

  // Regras de negócio customizadas
  // Executado na criação e em cada update
  rules?: (entity: E) => void;
}
```

### Exemplo: Bloqueando Atualizações

```typescript
protected static hooks: EntityHooks<UserProps, User> = {
  onBeforeUpdate: (entity, snapshot) => {
    // Bloquear mudança de email após criação
    if (snapshot.email !== entity.email) {
      return false;  // Bloqueia a atualização
    }
    
    // Bloquear desativação se usuário tem posts
    if (entity.status === 'inactive' && entity.posts.length > 0) {
      return false;
    }
    
    return true;  // Permite a atualização
  },
};
```

### Exemplo: Regras de Negócio

```typescript
protected static hooks: EntityHooks<OrderProps, Order> = {
  rules: (entity) => {
    // Validações complexas de negócio
    if (entity.total < 0) {
      throwValidationError('total', 'Total não pode ser negativo');
    }
    
    if (entity.items.length === 0 && entity.status === 'confirmed') {
      throwValidationError('items', 'Pedido confirmado deve ter pelo menos um item');
    }
    
    if (entity.discount > entity.subtotal) {
      throwValidationError('discount', 'Desconto não pode ser maior que o subtotal');
    }
  },
};
```

## Compatibilidade com Standard Schema

A biblioteca é compatível com qualquer lib que implemente Standard Schema:

### Zod

```typescript
import { z } from 'zod';

const schema = z.object({
  id: z.custom<Id>((val) => val instanceof Id),
  name: z.string().min(2),
  email: z.string().email(),
});
```

### Valibot

```typescript
import * as v from 'valibot';

const schema = v.object({
  id: v.custom((val) => val instanceof Id),
  name: v.pipe(v.string(), v.minLength(2)),
  email: v.pipe(v.string(), v.email()),
});
```

### ArkType

```typescript
import { type } from 'arktype';

const schema = type({
  id: 'unknown', // Custom validation
  name: 'string>=2',
  email: 'email',
});
```

### Adapter Manual

Se sua lib de validação não tem suporte nativo a Standard Schema:

```typescript
import { fromZod, toStandardSchema } from 'rich-domain';

// Converter Zod manualmente
const standardSchema = fromZod(zodSchema);

// Auto-detectar e converter
const schema = toStandardSchema(anySchema);
```

## ValidationError

```typescript
import { ValidationError, createValidationIssue, throwValidationError } from 'rich-domain';

// Criar erro manualmente
const error = new ValidationError([
  { path: ['email'], message: 'Email inválido' },
  { path: ['name'], message: 'Nome muito curto' },
]);

// Métodos úteis
error.getMessages();                    // ['Email inválido', 'Nome muito curto']
error.hasErrorsForPath('email');        // true
error.getErrorsForPath('email');        // [{ path: ['email'], message: 'Email inválido' }]

// Verificar se é ValidationError (funciona entre módulos)
ValidationError.isValidationError(error);  // true

// Helper para criar issue
const issue = createValidationIssue('email', 'Email inválido');
// { path: ['email'], message: 'Email inválido' }

// Helper para lançar erro
throwValidationError('name', 'Nome inválido');  // throws ValidationError
```

## API Reference

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

### BaseEntity / Entity / Aggregate

```typescript
abstract class BaseEntity<T extends BaseProps> {
  constructor(props: Partial<Omit<T, 'id'>> & { id?: Id });
  
  get id(): Id;
  get isNew(): boolean;
  protected get properties(): T;
  
  get hasValidationErrors(): boolean;
  get validationErrors(): ValidationError | undefined;
  
  subscribe(config: SubscriptionConfig<T>): void;
  getHistory(): HistoryEntry[];
  clearHistory(): void;
  toJson(): DeepJsonResult<T>;
}
```

### ValueObject

```typescript
abstract class ValueObject<T> {
  constructor(props: T);
  
  protected get props(): T;
  
  equals(other: ValueObject<T>): boolean;
  toJson(): T;
  protected clone(updates: Partial<T>): this;
}
```

### ValidationError

```typescript
class ValidationError extends Error {
  readonly issues: ValidationIssue[];
  
  constructor(issues: ValidationIssue[], message?: string);
  
  static isValidationError(error: unknown): error is ValidationError;
  
  getMessages(): string[];
  getErrorsForPath(path: string): ValidationIssue[];
  hasErrorsForPath(path: string): boolean;
  toJSON(): object;
}
```

## Exemplos Completos

### Aggregate Completo

```typescript
import { z } from 'zod';
import { 
  Id, 
  Aggregate, 
  Entity,
  ValueObject,
  EntityValidation, 
  EntityHooks, 
  BaseProps,
  throwValidationError 
} from 'rich-domain';

// Value Object
interface MoneyProps {
  amount: number;
  currency: string;
}

class Money extends ValueObject<MoneyProps> {
  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot add different currencies');
    }
    return this.clone({ amount: this.amount + other.amount });
  }
}

// Entity
interface OrderItemProps extends BaseProps {
  id: Id;
  productId: string;
  quantity: number;
  price: Money;
}

class OrderItem extends Entity<OrderItemProps> {
  get productId(): string {
    return this.properties.productId;
  }

  get quantity(): number {
    return this.properties.quantity;
  }

  get price(): Money {
    return this.properties.price;
  }

  get total(): number {
    return this.price.amount * this.quantity;
  }
}

// Aggregate Root
interface OrderProps extends BaseProps {
  id: Id;
  customerId: string;
  items: OrderItem[];
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  createdAt: Date;
}

const orderSchema = z.object({
  id: z.custom<Id>((val) => val instanceof Id),
  customerId: z.string().min(1),
  items: z.array(z.custom<OrderItem>((val) => val instanceof OrderItem)),
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered']),
  createdAt: z.date(),
});

class Order extends Aggregate<OrderProps> {
  protected static validation: EntityValidation<OrderProps> = {
    schema: orderSchema,
  };

  protected static hooks: EntityHooks<OrderProps, Order> = {
    defaultValues: {
      items: [],
      status: 'pending',
      createdAt: new Date(),
    },
    rules: (entity) => {
      if (entity.status === 'confirmed' && entity.items.length === 0) {
        throwValidationError('items', 'Pedido confirmado deve ter itens');
      }
    },
  };

  get customerId(): string {
    return this.properties.customerId;
  }

  get items(): OrderItem[] {
    return this.properties.items;
  }

  get status(): string {
    return this.properties.status;
  }

  get total(): number {
    return this.items.reduce((sum, item) => sum + item.total, 0);
  }

  addItem(item: OrderItem): void {
    this.properties.items = [...this.items, item];
  }

  removeItem(itemId: Id): void {
    this.properties.items = this.items.filter(
      (item) => !item.id.equals(itemId)
    );
  }

  confirm(): void {
    if (this.items.length === 0) {
      throw new Error('Cannot confirm empty order');
    }
    this.properties.status = 'confirmed';
  }
}

// Uso
const order = new Order({
  customerId: 'customer-123',
});

order.addItem(
  new OrderItem({
    productId: 'product-1',
    quantity: 2,
    price: new Money({ amount: 50, currency: 'BRL' }),
  })
);

console.log(order.total);  // 100
order.confirm();
console.log(order.status); // confirmed
```

## Licença

MIT