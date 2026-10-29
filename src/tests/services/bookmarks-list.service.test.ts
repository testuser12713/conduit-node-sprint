import prismaMock from '../prisma-mock';
import { getBookmarkedArticles } from '../../app/routes/article/article.service';

type MockFn = jest.Mock;

const userBookmarksMock = prismaMock.userBookmarks as unknown as {
  findMany: MockFn;
  count: MockFn;
};

const USER_ID = 123;
const OTHER_USER_ID = 999;

const buildMockedArticle = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  slug: 'how-to-train-your-dragon',
  title: 'How to train your dragon',
  description: '',
  body: '',
  createdAt: new Date(),
  updatedAt: new Date(),
  authorId: 456,
  tagList: [{ name: 'dragons' }],
  favoritedBy: [],
  bookmarkedBy: [{ userId: USER_ID }],
  author: {
    username: 'RealWorld',
    bio: null,
    image: null,
    followedBy: [],
  },
  ...overrides,
});

describe('BookmarkListService', () => {
  test('should return only the requesting user\u2019s bookmarks', async () => {
    // Given
    const article = buildMockedArticle();
    userBookmarksMock.findMany.mockResolvedValue([{ article }]);
    userBookmarksMock.count.mockResolvedValue(1);

    // When
    const result = await getBookmarkedArticles(USER_ID, {});

    // Then
    expect(result.articles).toHaveLength(1);
    expect(userBookmarksMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER_ID },
      }),
    );
    expect(userBookmarksMock.findMany).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: OTHER_USER_ID },
      }),
    );
    expect(userBookmarksMock.count).toHaveBeenCalledWith({
      where: { userId: USER_ID },
    });
  });

  test('should order the newest bookmark first', async () => {
    // Given
    userBookmarksMock.findMany.mockResolvedValue([]);
    userBookmarksMock.count.mockResolvedValue(0);

    // When
    await getBookmarkedArticles(USER_ID, {});

    // Then
    expect(userBookmarksMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  test('should apply limit and offset with the getArticles defaults', async () => {
    // Given
    userBookmarksMock.findMany.mockResolvedValue([]);
    userBookmarksMock.count.mockResolvedValue(25);

    // When
    await getBookmarkedArticles(USER_ID, { limit: '5', offset: '10' });

    // Then
    expect(userBookmarksMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 5,
      }),
    );
  });

  test('should default to the first ten bookmarks without pagination parameters', async () => {
    // Given
    userBookmarksMock.findMany.mockResolvedValue([]);
    userBookmarksMock.count.mockResolvedValue(0);

    // When
    await getBookmarkedArticles(USER_ID, {});

    // Then
    expect(userBookmarksMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 10,
      }),
    );
  });

  test('should report articlesCount independent of limit and offset', async () => {
    // Given
    const article = buildMockedArticle();
    userBookmarksMock.findMany.mockResolvedValue([{ article }]);
    userBookmarksMock.count.mockResolvedValue(25);

    // When
    const result = await getBookmarkedArticles(USER_ID, { limit: '1', offset: '4' });

    // Then
    expect(result.articles).toHaveLength(1);
    expect(result.articlesCount).toBe(25);
  });

  test('should set the bookmarked flag for the caller', async () => {
    // Given
    const article = buildMockedArticle();
    userBookmarksMock.findMany.mockResolvedValue([{ article }]);
    userBookmarksMock.count.mockResolvedValue(1);

    // When
    const result = await getBookmarkedArticles(USER_ID, {});

    // Then
    expect(result.articles[0]).toMatchObject({
      slug: article.slug,
      bookmarked: true,
    });
    expect(userBookmarksMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          article: expect.objectContaining({
            include: expect.objectContaining({
              bookmarkedBy: {
                where: { userId: USER_ID },
                select: { userId: true },
              },
            }),
          }),
        }),
      }),
    );
  });

  test('should answer with the errors.body envelope when loading the bookmarks fails', async () => {
    // Given
    const databaseMessage =
      'Raw query failed. Code: 42703. Message: column "secret" does not exist';
    userBookmarksMock.findMany.mockRejectedValue(new Error(databaseMessage));

    // Then
    await expect(getBookmarkedArticles(USER_ID, { offset: '-1' })).rejects.toMatchObject({
      errorCode: 500,
      message: { errors: { body: ['could not load bookmarks'] } },
    });
  });

  test('should not leak the database message when counting the bookmarks fails', async () => {
    // Given
    const databaseMessage =
      'Raw query failed. Code: 42703. Message: column "secret" does not exist';
    userBookmarksMock.findMany.mockResolvedValue([]);
    userBookmarksMock.count.mockRejectedValue(new Error(databaseMessage));

    // Then
    expect.assertions(2);
    try {
      await getBookmarkedArticles(USER_ID, {});
    } catch (error) {
      const message = (error as { message: { errors: { body: string[] } } }).message;
      expect(message).toEqual({ errors: { body: ['could not load bookmarks'] } });
      expect(JSON.stringify(message)).not.toContain(databaseMessage);
    }
  });

  test('should not list a deleted article whose bookmark rows are gone', async () => {
    // Given
    const deletedSlug = 'deleted-article';
    const remainingArticle = buildMockedArticle({
      id: 2,
      slug: 'remaining-article',
      title: 'Remaining article',
    });
    // The cascade removed the deleted article's UserBookmarks row, so the join
    // only yields the remaining bookmark.
    userBookmarksMock.findMany.mockResolvedValue([{ article: remainingArticle }]);
    userBookmarksMock.count.mockResolvedValue(1);

    // When
    const result = await getBookmarkedArticles(USER_ID, {});

    // Then
    expect(result.articles.map((article) => article.slug)).toEqual([
      'remaining-article',
    ]);
    expect(result.articles.map((article) => article.slug)).not.toContain(deletedSlug);
    expect(result.articlesCount).toBe(1);
  });
});
