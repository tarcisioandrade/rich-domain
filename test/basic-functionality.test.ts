// ==========================================================================
// Basic Entity Tests
// ==========================================================================

import { Id } from './core/id';
import { Post } from './utils';

describe('Entity Basic Functionality', () => {
  it('should create an entity with id', () => {
    const id = new Id('1');
    const post = new Post({
      id,
      title: 'First Post',
      content: 'Hello World',
      likes: 0,
    });

    expect(post.id.value).toBe('1');
    expect(post.title).toBe('First Post');
  });

  it('should allow property modification', () => {
    const post = new Post({
      id: new Id('1'),
      title: 'First Post',
      content: 'Hello World',
      likes: 0,
    });

    post.title = 'Updated Title';
    expect(post.title).toBe('Updated Title');
  });
});
