import articleMapper from '../../app/routes/article/article.mapper';

const buildWords = (count: number): string =>
  Array.from({ length: count }, (_, index) => `word${index}`).join(' ');

const buildArticle = (body: string) => {
  const createdAt = new Date('2021-12-21T10:00:00.000Z');
  const updatedAt = new Date('2021-12-22T11:30:00.000Z');

  return {
    slug: 'how-to-train-your-dragon',
    title: 'How to train your dragon',
    description: 'Ever wonder how?',
    body,
    tagList: [{ name: 'dragons' }, { name: 'training' }],
    createdAt,
    updatedAt,
    favoritedBy: [{ id: 7 }, { id: 9 }],
    author: {
      username: 'jake',
      bio: 'I work at statefarm',
      image: 'https://api.realworld.io/images/smiley-cyrus.jpg',
      followedBy: [{ id: 9 }],
    },
  };
};

describe('ArticleMapper', () => {
  test('should map a whole-number reading time from the body word count', () => {
    // Given
    const body = buildWords(450);
    const article = buildArticle(body);
    const userId = 9;

    // When
    const mapped = articleMapper(article, userId);

    // Then
    expect(Number.isInteger(mapped.readingTime)).toBe(true);
    expect(mapped.readingTime).toBe(Math.ceil(450 / 200));
  });

  test('should keep mapping every other article field unchanged', () => {
    // Given
    const body = buildWords(120);
    const article = buildArticle(body);
    const userId = 9;

    // When
    const mapped = articleMapper(article, userId);

    // Then
    expect(mapped).toEqual({
      slug: 'how-to-train-your-dragon',
      title: 'How to train your dragon',
      description: 'Ever wonder how?',
      body,
      readingTime: 1,
      tagList: ['dragons', 'training'],
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      favorited: true,
      favoritesCount: 2,
      author: {
        username: 'jake',
        bio: 'I work at statefarm',
        image: 'https://api.realworld.io/images/smiley-cyrus.jpg',
        following: true,
      },
    });
  });

  test('should mark the article as not favorited for another user', () => {
    // Given
    const article = buildArticle(buildWords(10));
    const userId = 99;

    // When
    const mapped = articleMapper(article, userId);

    // Then
    expect(mapped.favorited).toBe(false);
    expect(mapped.favoritesCount).toBe(2);
    expect(mapped.author.following).toBe(false);
  });

  test('should return reading time 1 for an empty body', () => {
    // Given
    const article = buildArticle('');

    // When
    const mapped = articleMapper(article);

    // Then
    expect(mapped.readingTime).toBe(1);
    expect(mapped.body).toBe('');
  });
});
