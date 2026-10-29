import articleMapper from '../../app/routes/article/article.mapper';

const buildArticle = (bookmarkedBy?: Array<{ id: number }>) => ({
  slug: 'how-to-train-your-dragon',
  title: 'How to train your dragon',
  description: 'Ever wonder how?',
  body: 'You have to believe',
  tagList: [{ name: 'dragons' }, { name: 'training' }],
  createdAt: new Date('2022-01-01T00:00:00.000Z'),
  updatedAt: new Date('2022-01-02T00:00:00.000Z'),
  favoritedBy: [],
  author: {
    username: 'RealWorld',
    bio: null,
    image: null,
    followedBy: [],
  },
  ...(bookmarkedBy !== undefined ? { bookmarkedBy } : {}),
});

describe('articleMapper', () => {
  test('should mark the article as bookmarked for the matching user', () => {
    // Given
    const article = buildArticle([{ id: 123 }, { id: 456 }]);

    // When
    const mapped = articleMapper(article, 456);

    // Then
    expect(mapped.bookmarked).toBe(true);
  });

  test('should not mark the article as bookmarked for another user', () => {
    // Given
    const article = buildArticle([{ id: 456 }]);

    // When
    const mapped = articleMapper(article, 123);

    // Then
    expect(mapped.bookmarked).toBe(false);
  });

  test('should not mark the article as bookmarked without an id', () => {
    // Given
    const article = buildArticle([{ id: 123 }]);

    // When
    const mapped = articleMapper(article);

    // Then
    expect(mapped.bookmarked).toBe(false);
  });

  test('should not mark the article as bookmarked when bookmarkedBy is absent', () => {
    // Given
    const article = buildArticle();

    // When
    const mapped = articleMapper(article, 123);

    // Then
    expect(mapped.bookmarked).toBe(false);
  });

  test('should not expose any user data from bookmarkedBy', () => {
    // Given
    const article = buildArticle([{ id: 123 }]);

    // When
    const mapped = articleMapper(article, 123);

    // Then
    expect(mapped).not.toHaveProperty('bookmarkedBy');
    expect(mapped).not.toHaveProperty('bookmarkedUsers');
  });

  test('should keep the existing article fields unchanged', () => {
    // Given
    const article = buildArticle([{ id: 123 }]);

    // When
    const mapped = articleMapper(article, 123);

    // Then
    expect(mapped).toEqual({
      slug: article.slug,
      title: article.title,
      description: article.description,
      body: article.body,
      tagList: ['dragons', 'training'],
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      favorited: false,
      favoritesCount: 0,
      author: {
        username: 'RealWorld',
        bio: null,
        image: null,
        following: false,
      },
      bookmarked: true,
    });
  });
});
