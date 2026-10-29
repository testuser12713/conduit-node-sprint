import articleMapper from '../../app/routes/article/article.mapper';

describe('ArticleMapper', () => {
  describe('articleMapper', () => {
    const createdAt = new Date('2021-10-01T12:00:00.000Z');
    const updatedAt = new Date('2021-10-02T12:00:00.000Z');

    const buildArticle = () => ({
      slug: 'my-happy-life-123',
      title: 'My happy life',
      description: 'A short description',
      body: 'The story of my happy life.',
      tagList: [{ name: 'life' }, { name: 'happiness' }],
      createdAt,
      updatedAt,
      favoritedBy: [{ id: 123 }],
      author: {
        username: 'RealWorld',
        bio: 'My happy life',
        image: null,
        followedBy: [],
      },
    });

    test('should keep every article field', () => {
      // Given
      const article = buildArticle();
      const id = 123;

      // When
      const result = articleMapper(article, id);

      // Then
      expect(result.slug).toBe(article.slug);
      expect(result.title).toBe(article.title);
      expect(result.description).toBe(article.description);
      expect(result.body).toBe(article.body);
      expect(result.tagList).toEqual(['life', 'happiness']);
      expect(result.createdAt).toBe(createdAt);
      expect(result.updatedAt).toBe(updatedAt);
      expect(result.favorited).toBe(true);
      expect(result.favoritesCount).toBe(1);
      expect(result.author).toEqual({
        username: 'RealWorld',
        bio: 'My happy life',
        image: null,
        following: false,
      });
    });

    test('should return an integer reading time of at least one minute', () => {
      // Given
      const article = buildArticle();

      // When
      const result = articleMapper(article);

      // Then
      expect(Number.isInteger(result.readingTime)).toBe(true);
      expect(result.readingTime).toBeGreaterThanOrEqual(1);
    });

    test('should return a reading time of at least one minute for an empty body', () => {
      // Given
      const article = { ...buildArticle(), body: '' };

      // When
      const result = articleMapper(article);

      // Then
      expect(Number.isInteger(result.readingTime)).toBe(true);
      expect(result.readingTime).toBeGreaterThanOrEqual(1);
    });
  });
});
