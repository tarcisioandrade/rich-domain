import { Entity, Aggregate, ValueObject } from './core';

// ============================================================================
// Test Entities & Value Objects
// ============================================================================

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
  id: string;
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
  id: string;
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
  id: string;
  name: string;
  email: string;
  posts: Post[];
  address: Address;
  comments: Comment[];
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

  set email(value: string) {
    this.properties.email = value;
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
      post => post.id !== id
    );
  }
}

// ============================================================================
// Test Suite
// ============================================================================

describe('DDD Library Tests', () => {
  // ==========================================================================
  // Basic Entity Tests
  // ==========================================================================

  describe('Entity Basic Functionality', () => {
    it('should create an entity with id', () => {
      const post = new Post({
        id: '1',
        title: 'First Post',
        content: 'Hello World',
        likes: 0,
      });

      expect(post.id).toBe('1');
      expect(post.title).toBe('First Post');
    });

    it('should allow property modification', () => {
      const post = new Post({
        id: '1',
        title: 'First Post',
        content: 'Hello World',
        likes: 0,
      });

      post.title = 'Updated Title';
      expect(post.title).toBe('Updated Title');
    });
  });

  // ==========================================================================
  // Simple Property Change Tests
  // ==========================================================================

  describe('Simple Property Changes', () => {
    it('should track simple property changes', done => {
      const post = new Post({
        id: '1',
        title: 'First Post',
        content: 'Hello World',
        likes: 0,
      });

      let changeCount = 0;

      post.subscribe({
        title: {
          onChange: ({ previous, current, path }) => {
            changeCount++;
            expect(previous).toBe('First Post');
            expect(current).toBe('Updated Title');
            expect(path).toBe('title');
            done();
          },
        },
      });

      post.title = 'Updated Title';
    });

    it('should track multiple property changes', () => {
      const post = new Post({
        id: '1',
        title: 'First Post',
        content: 'Hello World',
        likes: 0,
      });

      const changes: any[] = [];

      post.subscribe({
        title: {
          onChange: event => changes.push({ property: 'title', ...event }),
        },
        likes: {
          onChange: event => changes.push({ property: 'likes', ...event }),
        },
      });

      post.title = 'New Title';
      post.likes = 10;

      expect(changes).toHaveLength(2);
      expect(changes[0].property).toBe('title');
      expect(changes[1].property).toBe('likes');
    });
  });

  // ==========================================================================
  // Array Changes - Create Tests
  // ==========================================================================

  describe('Array Changes - Create', () => {
    it('should detect new items added to array', done => {
      const user = new User({
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        posts: [],
        address: new Address({
          street: 'Main St',
          city: 'NYC',
          zipCode: '10001',
        }),
        comments: [],
      });

      user.subscribe({
        posts: {
          onChange: ({ toCreate, toUpdate, toDelete }) => {
            expect(toCreate).toHaveLength(2);
            expect(toUpdate).toHaveLength(0);
            expect(toDelete).toHaveLength(0);
            expect(toCreate[0].title).toBe('Post 1');
            done();
          },
        },
      });

      user.addManyPosts([
        new Post({ id: '1', title: 'Post 1', content: 'Content 1', likes: 0 }),
        new Post({ id: '2', title: 'Post 2', content: 'Content 2', likes: 0 }),
      ]);
    });

    it('should detect items pushed to array', done => {
      const user = new User({
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        posts: [
          new Post({
            id: '1',
            title: 'Post 1',
            content: 'Content 1',
            likes: 0,
          }),
        ],
        address: new Address({
          street: 'Main St',
          city: 'NYC',
          zipCode: '10001',
        }),
        comments: [],
      });

      user.subscribe({
        posts: {
          onChange: ({ toCreate }) => {
            expect(toCreate).toHaveLength(1);
            expect(toCreate[0].title).toBe('Post 2');
            done();
          },
        },
      });

      user.posts.push(
        new Post({ id: '2', title: 'Post 2', content: 'Content 2', likes: 0 })
      );
    });
  });

  // ==========================================================================
  // Array Changes - Update Tests
  // ==========================================================================

  describe('Array Changes - Update', () => {
    it.only('should detect updated items in array', done => {
      const post1 = new Post({
        id: '1',
        title: 'Post 1',
        content: 'Content 1',
        likes: 0,
      });
      const post2 = new Post({
        id: '2',
        title: 'Post 2',
        content: 'Content 2',
        likes: 0,
      });

      const user = new User({
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        posts: [post1, post2],
        address: new Address({
          street: 'Main St',
          city: 'NYC',
          zipCode: '10001',
        }),
        comments: [],
      });

      user.subscribe({
        posts: {
          onChange: ({ toCreate, toUpdate, toDelete }) => {
            console.log('toCreate', toCreate);
            console.log('toUpdate', toUpdate);
            console.log('toDelete', toDelete);
            expect(toCreate).toHaveLength(0);
            expect(toUpdate).toHaveLength(1);
            expect(toDelete).toHaveLength(0);
            expect(toUpdate[0].id).toBe('1');
            done();
          },
        },
      });

      // Modify existing post
      post1.title = 'Updated Post 1';
      user.email = 'new@example.com';
      user.posts = [...user.posts]; // Trigger change detection
    });

    it('should detect multiple updates in array', done => {
      const post1 = new Post({
        id: '1',
        title: 'Post 1',
        content: 'Content 1',
        likes: 0,
      });
      const post2 = new Post({
        id: '2',
        title: 'Post 2',
        content: 'Content 2',
        likes: 0,
      });

      const user = new User({
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        posts: [post1, post2],
        address: new Address({
          street: 'Main St',
          city: 'NYC',
          zipCode: '10001',
        }),
        comments: [],
      });

      user.subscribe({
        posts: {
          onChange: ({ toUpdate }) => {
            console.log('toUpdate', toUpdate);
            expect(toUpdate).toHaveLength(2);
            done();
          },
        },
      });

      post1.title = 'Updated Post 1';
      post2.likes = 100;
      user.posts = [...user.posts];
    });
  });

  // ==========================================================================
  // Array Changes - Delete Tests
  // ==========================================================================

  describe('Array Changes - Delete', () => {
    it('should detect deleted items from array', done => {
      const post1 = new Post({
        id: '1',
        title: 'Post 1',
        content: 'Content 1',
        likes: 0,
      });
      const post2 = new Post({
        id: '2',
        title: 'Post 2',
        content: 'Content 2',
        likes: 0,
      });

      const user = new User({
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        posts: [post1, post2],
        address: new Address({
          street: 'Main St',
          city: 'NYC',
          zipCode: '10001',
        }),
        comments: [],
      });

      user.subscribe({
        posts: {
          onChange: ({ toCreate, toUpdate, toDelete }) => {
            expect(toCreate).toHaveLength(0);
            expect(toUpdate).toHaveLength(0);
            expect(toDelete).toHaveLength(1);
            expect(toDelete[0].id).toBe('1');
            done();
          },
        },
      });

      user.posts = [post2];
    });

    it('should detect items removed with splice', done => {
      const user = new User({
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        posts: [
          new Post({
            id: '1',
            title: 'Post 1',
            content: 'Content 1',
            likes: 0,
          }),
          new Post({
            id: '2',
            title: 'Post 2',
            content: 'Content 2',
            likes: 0,
          }),
        ],
        address: new Address({
          street: 'Main St',
          city: 'NYC',
          zipCode: '10001',
        }),
        comments: [],
      });

      user.subscribe({
        posts: {
          onChange: ({ toDelete }) => {
            expect(toDelete).toHaveLength(1);
            expect(toDelete[0].id).toBe('1');
            done();
          },
        },
      });

      user.posts.splice(0, 1);
    });
  });

  // ==========================================================================
  // Array Changes - Mixed Operations Tests
  // ==========================================================================

  describe('Array Changes - Mixed Operations', () => {
    it('should detect mixed create and update operations', done => {
      const post1 = new Post({
        id: '1',
        title: 'Post 1',
        content: 'Content 1',
        likes: 0,
      });

      const user = new User({
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        posts: [post1],
        address: new Address({
          street: 'Main St',
          city: 'NYC',
          zipCode: '10001',
        }),
        comments: [],
      });

      user.subscribe({
        posts: {
          onChange: ({ toCreate, toUpdate, toDelete }) => {
            expect(toCreate).toHaveLength(2);
            expect(toUpdate).toHaveLength(1);
            expect(toDelete).toHaveLength(0);
            done();
          },
        },
      });

      post1.title = 'Updated Post 1';
      user.posts = [
        post1,
        new Post({ id: '2', title: 'Post 2', content: 'Content 2', likes: 0 }),
        new Post({ id: '3', title: 'Post 3', content: 'Content 3', likes: 0 }),
      ];
    });

    it('should detect mixed create, update, and delete operations', done => {
      const post1 = new Post({
        id: '1',
        title: 'Post 1',
        content: 'Content 1',
        likes: 0,
      });
      const post2 = new Post({
        id: '2',
        title: 'Post 2',
        content: 'Content 2',
        likes: 0,
      });
      const post3 = new Post({
        id: '3',
        title: 'Post 3',
        content: 'Content 3',
        likes: 0,
      });

      const user = new User({
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        posts: [post1, post2, post3],
        address: new Address({
          street: 'Main St',
          city: 'NYC',
          zipCode: '10001',
        }),
        comments: [],
      });

      user.subscribe({
        posts: {
          onChange: ({ toCreate, toUpdate, toDelete }) => {
            expect(toCreate).toHaveLength(1); // post4
            expect(toUpdate).toHaveLength(1); // post2 modified
            expect(toDelete).toHaveLength(2); // post1 and post3 removed
            done();
          },
        },
      });

      post2.likes = 50;
      user.posts = [
        post2,
        new Post({ id: '4', title: 'Post 4', content: 'Content 4', likes: 0 }),
      ];
    });
  });

  // ==========================================================================
  // Nested Entity Tests
  // ==========================================================================

  describe('Nested Entity Changes', () => {
    it('should track changes in nested value objects', done => {
      const user = new User({
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        posts: [],
        address: new Address({
          street: 'Main St',
          city: 'NYC',
          zipCode: '10001',
        }),
        comments: [],
      });

      user.subscribe({
        address: {
          onChange: ({ previous, current }) => {
            expect(previous).toBeInstanceOf(Address);
            expect(current).toBeInstanceOf(Address);
            expect(current.city).toBe('LA');
            done();
          },
        },
      });

      user.address = new Address({
        street: 'Broadway',
        city: 'LA',
        zipCode: '90001',
      });
    });
  });

  // ==========================================================================
  // History Tracking Tests
  // ==========================================================================

  describe('History Tracking', () => {
    it('should record history of changes', () => {
      const post = new Post({
        id: '1',
        title: 'First Post',
        content: 'Hello World',
        likes: 0,
      });

      post.title = 'Second Title';
      post.likes = 10;
      post.content = 'Updated Content';

      const history = post.getHistory();
      expect(history).toHaveLength(3);
      expect(history[0].path).toBe('title');
      expect(history[1].path).toBe('likes');
      expect(history[2].path).toBe('content');
    });

    it('should clear history', () => {
      const post = new Post({
        id: '1',
        title: 'First Post',
        content: 'Hello World',
        likes: 0,
      });

      post.title = 'Second Title';
      expect(post.getHistory()).toHaveLength(1);

      post.clearHistory();
      expect(post.getHistory()).toHaveLength(0);
    });
  });

  // ==========================================================================
  // toJson Tests
  // ==========================================================================

  describe('toJson Functionality', () => {
    it('should convert simple entity to JSON', () => {
      const post = new Post({
        id: '1',
        title: 'First Post',
        content: 'Hello World',
        likes: 5,
      });

      const json = post.toJson();
      expect(json).toEqual({
        id: '1',
        title: 'First Post',
        content: 'Hello World',
        likes: 5,
      });
    });

    it('should convert nested entities to JSON', () => {
      const user = new User({
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        posts: [
          new Post({
            id: '1',
            title: 'Post 1',
            content: 'Content 1',
            likes: 0,
          }),
          new Post({
            id: '2',
            title: 'Post 2',
            content: 'Content 2',
            likes: 5,
          }),
        ],
        address: new Address({
          street: 'Main St',
          city: 'NYC',
          zipCode: '10001',
        }),
        comments: [
          new Comment({ id: '1', text: 'Great post!', author: 'Alice' }),
        ],
      });

      const json = user.toJson();

      expect(json.id).toBe('1');
      expect(json.name).toBe('John Doe');
      expect(json.posts).toHaveLength(2);
      expect(json.posts[0].title).toBe('Post 1');
      expect(json.address.city).toBe('NYC');
      expect(json.comments[0].text).toBe('Great post!');
    });

    it('should handle deeply nested structures', () => {
      const user = new User({
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        posts: [
          new Post({
            id: '1',
            title: 'Post 1',
            content: 'Content 1',
            likes: 0,
          }),
        ],
        address: new Address({
          street: 'Main St',
          city: 'NYC',
          zipCode: '10001',
        }),
        comments: [],
      });

      const json = user.toJson();
      expect(typeof json).toBe('object');
      expect(Array.isArray(json.posts)).toBe(true);
      expect(json.posts[0].id).toBe('1');
    });
  });

  // ==========================================================================
  // Value Object Tests
  // ==========================================================================

  describe('Value Object', () => {
    it('should create immutable value object', () => {
      const address = new Address({
        street: 'Main St',
        city: 'NYC',
        zipCode: '10001',
      });

      expect(address.street).toBe('Main St');
      expect(address.city).toBe('NYC');
    });

    it('should compare value objects by value', () => {
      const address1 = new Address({
        street: 'Main St',
        city: 'NYC',
        zipCode: '10001',
      });

      const address2 = new Address({
        street: 'Main St',
        city: 'NYC',
        zipCode: '10001',
      });

      const address3 = new Address({
        street: 'Broadway',
        city: 'NYC',
        zipCode: '10001',
      });

      expect(address1.equals(address2)).toBe(true);
      expect(address1.equals(address3)).toBe(false);
    });

    it('should convert value object to JSON', () => {
      const address = new Address({
        street: 'Main St',
        city: 'NYC',
        zipCode: '10001',
      });

      const json = address.toJson();
      expect(json).toEqual({
        street: 'Main St',
        city: 'NYC',
        zipCode: '10001',
      });
    });
  });

  // ==========================================================================
  // Multiple Subscribers Test
  // ==========================================================================

  describe('Multiple Subscribers', () => {
    it('should notify all subscribers on change', () => {
      const post = new Post({
        id: '1',
        title: 'First Post',
        content: 'Hello World',
        likes: 0,
      });

      let subscriber1Called = false;
      let subscriber2Called = false;

      post.subscribe({
        title: {
          onChange: () => {
            subscriber1Called = true;
          },
        },
      });

      post.subscribe({
        title: {
          onChange: () => {
            subscriber2Called = true;
          },
        },
      });

      post.title = 'Updated Title';

      expect(subscriber1Called).toBe(true);
      expect(subscriber2Called).toBe(true);
    });
  });
});
