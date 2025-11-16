import { Id } from '../src';
import { Post, User, Address, Comment } from './utils';

describe('History Tracker Tests', () => {
  // ==========================================================================
  // Simple Property Change Tests
  // ==========================================================================

  describe('Simple Property Changes', () => {
    it('should track simple property changes', done => {
      const post = new Post({
        id: new Id('1'),
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
        id: new Id('1'),
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
        id: new Id('1'),
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
        new Post({
          id: new Id('1'),
          title: 'Post 1',
          content: 'Content 1',
          likes: 0,
        }),
        new Post({
          id: new Id('2'),
          title: 'Post 2',
          content: 'Content 2',
          likes: 0,
        }),
      ]);
    });

    it('should detect items pushed to array', done => {
      const user = new User({
        id: new Id('1'),
        name: 'John Doe',
        email: 'john@example.com',
        posts: [
          new Post({
            id: new Id('1'),
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
        new Post({
          id: new Id('2'),
          title: 'Post 2',
          content: 'Content 2',
          likes: 0,
        })
      );
    });
  });

  // ==========================================================================
  // Array Changes - Update Tests
  // ==========================================================================

  describe('Array Changes - Update', () => {
    it('should detect updated items in array', done => {
      const id1 = new Id('1');
      const post1 = new Post({
        id: id1,
        title: 'Post 1',
        content: 'Content 1',
        likes: 0,
      });
      const post2 = new Post({
        id: new Id('2'),
        title: 'Post 2',
        content: 'Content 2',
        likes: 0,
      });

      const user = new User({
        id: new Id('1'),
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
            expect(toUpdate).toHaveLength(1);
            expect(toDelete).toHaveLength(0);
            expect(toUpdate[0].id).toBe(id1);
            done();
          },
        },
      });

      // Modify existing post
      post1.title = 'Updated Post 1';
      user.changeEmail('new@example.com');
      user.posts = [...user.posts]; // Trigger change detection
    });

    it('should detect multiple updates in array', done => {
      const post1 = new Post({
        id: new Id('1'),
        title: 'Post 1',
        content: 'Content 1',
        likes: 0,
      });
      const post2 = new Post({
        id: new Id('2'),
        title: 'Post 2',
        content: 'Content 2',
        likes: 0,
      });

      const user = new User({
        id: new Id('1'),
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
        id: new Id('1'),
        title: 'Post 1',
        content: 'Content 1',
        likes: 0,
      });
      const post2 = new Post({
        id: new Id('2'),
        title: 'Post 2',
        content: 'Content 2',
        likes: 0,
      });

      const user = new User({
        id: new Id('1'),
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
            done();
          },
        },
      });

      user.posts = [post2];
    });

    it('should detect items removed with splice', done => {
      const id1 = new Id('1');
      const user = new User({
        id: new Id('1'),
        name: 'John Doe',
        email: 'john@example.com',
        posts: [
          new Post({
            id: id1,
            title: 'Post 1',
            content: 'Content 1',
            likes: 0,
          }),
          new Post({
            id: new Id('2'),
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
            expect(toDelete[0].id.value).toBe(id1.value);
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
        id: new Id('1'),
        title: 'Post 1',
        content: 'Content 1',
        likes: 0,
      });

      const user = new User({
        id: new Id('1'),
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
        new Post({
          id: new Id('2'),
          title: 'Post 2',
          content: 'Content 2',
          likes: 0,
        }),
        new Post({
          id: new Id('3'),
          title: 'Post 3',
          content: 'Content 3',
          likes: 0,
        }),
      ];
    });

    it('should detect mixed create, update, and delete operations', done => {
      const post1 = new Post({
        id: new Id('1'),
        title: 'Post 1',
        content: 'Content 1',
        likes: 0,
      });
      const post2 = new Post({
        id: new Id('2'),
        title: 'Post 2',
        content: 'Content 2',
        likes: 0,
      });
      const post3 = new Post({
        id: new Id('3'),
        title: 'Post 3',
        content: 'Content 3',
        likes: 0,
      });

      const user = new User({
        id: new Id('1'),
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
        new Post({
          id: new Id('4'),
          title: 'Post 4',
          content: 'Content 4',
          likes: 0,
        }),
      ];
    });
  });

  // ==========================================================================
  // Nested Entity Tests
  // ==========================================================================

  describe('Nested Entity Changes', () => {
    it('should track changes in nested value objects', done => {
      const user = new User({
        id: new Id('1'),
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
        id: new Id('1'),
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
        id: new Id('1'),
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
        id: new Id('1'),
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
        id: new Id('1'),
        name: 'John Doe',
        email: 'john@example.com',
        posts: [
          new Post({
            id: new Id('1'),
            title: 'Post 1',
            content: 'Content 1',
            likes: 0,
          }),
          new Post({
            id: new Id('2'),
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
          new Comment({
            id: new Id('1'),
            text: 'Great post!',
            author: 'Alice',
          }),
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
        id: new Id('1'),
        name: 'John Doe',
        email: 'john@example.com',
        posts: [
          new Post({
            id: new Id('1'),
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
        id: new Id('1'),
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

  // ==========================================================================
  // Plain Object Tests
  // ==========================================================================

  describe('Plain Object', () => {
    it('should create a plain object', () => {
      const user = new User({
        id: new Id('1'),
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
        email: {
          onChange: ({ previous, current }) => {
            expect(previous).toBe('john@example.com');
            expect(current).toBe('new@example.com');
          },
        },
        extra: {
          onChange: ({ previous, current }) => {
            expect(previous).toBe(undefined);
            expect(current).toEqual({
              age: 20,
              height: 180,
            });
          },
        },
        address: {
          onChange: ({ previous, current }) => {
            expect(previous).toBeInstanceOf(Address);
            expect(current).toBeInstanceOf(Address);
          },
        },
      });

      user.changeExtra({
        age: 20,
        height: 180,
      });
    });
  });
});
