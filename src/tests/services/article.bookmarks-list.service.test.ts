import prismaMock from '../prisma-mock';
import { getBookmarkedArticles } from '../../app/routes/article/bookmarks-list.service';

const articleMock = prismaMock.article as unknown as {
  count: jest.Mock;
  findMany: jest.Mock;
};
const countMock = articleMock.count;
const findManyMock = articleMock.findMany;

const buildArticle = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  slug: 'how-to-train-your-dragon',
  title: 'How to train your dragon',
  description: '',
  body: '',
  createdAt: new Date('2024-01-02T00:00:00.000Z'),
  updatedAt: new Date('2024-01-02T00:00:00.000Z'),
  authorId: 456,
  tagList: [],
  favoritedBy: [],
  bookmarkedBy: [{ id: 123 }],
  author: {
    username: 'RealWorld',
    bio: null,
    image: null,
    followedBy: [],
  },
  ...overrides,
});

describe('getBookmarkedArticles', () => {
  test('uses limit 10 and offset 0 by default', async () => {
    countMock.mockResolvedValue(0);
    findManyMock.mockResolvedValue([]);

    await getBookmarkedArticles({}, 123);

    expect(findManyMock).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 10 }));
  });

  test('reads limit and offset from the query', async () => {
    countMock.mockResolvedValue(0);
    findManyMock.mockResolvedValue([]);

    await getBookmarkedArticles({ limit: '1', offset: '5' }, 123);

    expect(findManyMock).toHaveBeenCalledWith(expect.objectContaining({ skip: 5, take: 1 }));
  });

  test('clamps limit to 100', async () => {
    countMock.mockResolvedValue(0);
    findManyMock.mockResolvedValue([]);

    await getBookmarkedArticles({ limit: '500' }, 123);

    expect(findManyMock).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
  });

  test('rejects a non-numeric limit before querying Prisma', async () => {
    await expect(getBookmarkedArticles({ limit: 'abc' }, 123)).rejects.toMatchObject({
      errorCode: 400,
      message: { errors: { limit: ['must be a number'] } },
    });

    expect(countMock).not.toHaveBeenCalled();
    expect(findManyMock).not.toHaveBeenCalled();
  });

  test('rejects a non-numeric offset before querying Prisma', async () => {
    await expect(getBookmarkedArticles({ offset: 'abc' }, 123)).rejects.toMatchObject({
      errorCode: 400,
      message: { errors: { offset: ['must be a number'] } },
    });

    expect(countMock).not.toHaveBeenCalled();
    expect(findManyMock).not.toHaveBeenCalled();
  });

  test('rejects a negative limit', async () => {
    await expect(getBookmarkedArticles({ limit: '-1' }, 123)).rejects.toMatchObject({
      errorCode: 400,
      message: { errors: { limit: ['must be a number'] } },
    });

    expect(findManyMock).not.toHaveBeenCalled();
  });

  test('rejects a negative offset', async () => {
    await expect(getBookmarkedArticles({ offset: '-3' }, 123)).rejects.toMatchObject({
      errorCode: 400,
      message: { errors: { offset: ['must be a number'] } },
    });

    expect(findManyMock).not.toHaveBeenCalled();
  });

  test('returns the total number of bookmarks, not the page size', async () => {
    countMock.mockResolvedValue(25);
    findManyMock.mockResolvedValue([
      buildArticle({ id: 1 }),
      buildArticle({ id: 2, slug: 'second-article' }),
    ]);

    const result = await getBookmarkedArticles({ limit: '2' }, 123);

    expect(result.articlesCount).toBe(25);
    expect(result.articles).toHaveLength(2);
  });

  test('queries only the bookmarks of the requesting user', async () => {
    countMock.mockResolvedValue(1);
    findManyMock.mockResolvedValue([buildArticle()]);

    await getBookmarkedArticles({}, 123);

    const where = { bookmarkedBy: { some: { id: 123 } } };
    expect(countMock).toHaveBeenCalledWith({ where });
    expect(findManyMock).toHaveBeenCalledWith(expect.objectContaining({ where }));
  });

  test('orders the bookmarked articles by createdAt descending', async () => {
    countMock.mockResolvedValue(0);
    findManyMock.mockResolvedValue([]);

    await getBookmarkedArticles({}, 123);

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    );
  });

  test('includes the relation needed to mark every article as bookmarked', async () => {
    countMock.mockResolvedValue(1);
    findManyMock.mockResolvedValue([buildArticle()]);

    const result = await getBookmarkedArticles({}, 123);

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({ bookmarkedBy: true }),
      }),
    );
    expect(result.articles[0]).toHaveProperty('bookmarked', true);
  });

  test('never serializes the bookmarkedBy relation', async () => {
    countMock.mockResolvedValue(2);
    findManyMock.mockResolvedValue([
      buildArticle({
        bookmarkedBy: [{ id: 123, email: 'other@example.com', username: 'other' }],
      }),
      buildArticle({
        id: 2,
        slug: 'second-article',
        bookmarkedBy: [{ id: 123, email: 'other@example.com', username: 'other' }],
      }),
    ]);

    const result = await getBookmarkedArticles({}, 123);

    result.articles.forEach((article) => {
      expect(article.bookmarked).toBe(true);
      expect(article).not.toHaveProperty('bookmarkedBy');
    });
    expect(JSON.stringify(result)).not.toContain('other@example.com');
    expect(JSON.stringify(result)).not.toContain('other');
  });
});
