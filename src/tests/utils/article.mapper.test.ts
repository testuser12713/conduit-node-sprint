import articleMapper from '../../app/routes/article/article.mapper';

describe('ArticleMapper', () => {
  const baseArticle = {
    slug: 'how-to-train-your-dragon',
    title: 'How to train your dragon',
    description: 'Ever wondered how?',
    body: 'You have to believe',
    tagList: [{ name: 'dragons' }, { name: 'training' }],
    createdAt: new Date('2024-01-15T12:00:00.000Z'),
    updatedAt: new Date('2024-01-15T12:00:00.000Z'),
    favoritedBy: [{ id: 1 }],
    bookmarkedBy: [{ id: 123 }],
    author: {
      username: 'RealWorld',
      bio: 'My happy life',
      image: null,
      followedBy: [],
    },
  };

  test('should mark the article as bookmarked for the acting user', () => {
    const id = 123;

    const expected = {
      slug: 'how-to-train-your-dragon',
      title: 'How to train your dragon',
      description: 'Ever wondered how?',
      body: 'You have to believe',
      tagList: ['dragons', 'training'],
      createdAt: new Date('2024-01-15T12:00:00.000Z'),
      updatedAt: new Date('2024-01-15T12:00:00.000Z'),
      favorited: false,
      favoritesCount: 1,
      bookmarked: true,
      author: {
        username: 'RealWorld',
        bio: 'My happy life',
        image: null,
        following: false,
      },
    };

    expect(articleMapper(baseArticle, id)).toEqual(expected);
  });

  test('should not mark the article as bookmarked for another user', () => {
    const id = 999;

    const result = articleMapper(baseArticle, id);

    expect(result.bookmarked).toBe(false);
  });

  test('should not mark the article as bookmarked when the include is absent', () => {
    const articleWithoutBookmarks = { ...baseArticle, bookmarkedBy: undefined };
    const id = 123;

    const result = articleMapper(articleWithoutBookmarks, id);

    expect(result.bookmarked).toBe(false);
  });

  test('should keep the existing fields unchanged', () => {
    const articleWithoutBookmarks = { ...baseArticle, bookmarkedBy: undefined };
    const id = 999;

    const result = articleMapper(articleWithoutBookmarks, id);

    expect(result).toEqual({
      slug: baseArticle.slug,
      title: baseArticle.title,
      description: baseArticle.description,
      body: baseArticle.body,
      tagList: ['dragons', 'training'],
      createdAt: baseArticle.createdAt,
      updatedAt: baseArticle.updatedAt,
      favorited: false,
      favoritesCount: 1,
      bookmarked: false,
      author: {
        username: 'RealWorld',
        bio: 'My happy life',
        image: null,
        following: false,
      },
    });
  });
});
