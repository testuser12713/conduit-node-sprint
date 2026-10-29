import prismaMock from '../prisma-mock';
import { getBookmarkedArticles } from '../../app/routes/article/article.service';

const userId = 7;

const buildArticle = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  slug: 'how-to-train-your-dragon',
  title: 'How to train your dragon',
  description: 'Ever wonder how?',
  body: 'You have to believe',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  tagList: [{ name: 'dragons' }],
  author: {
    username: 'RealWorld',
    bio: null,
    image: null,
    followedBy: [],
  },
  favoritedBy: [],
  bookmarkedBy: [{ id: userId }],
  _count: { favoritedBy: 0 },
  ...overrides,
});

const articleMock = prismaMock as unknown as {
  article: {
    count: jest.Mock;
    findMany: jest.Mock;
  };
};

const countMock = () => articleMock.article.count;
const findManyMock = () => articleMock.article.findMany;

describe('getBookmarkedArticles', () => {
  test("should query only the acting user's bookmarks", async () => {
    countMock().mockResolvedValue(1);
    findManyMock().mockResolvedValue([buildArticle()]);

    await getBookmarkedArticles(0, 10, userId);

    const expectedWhere = { bookmarkedBy: { some: { id: userId } } };

    expect(countMock()).toHaveBeenCalledWith({ where: expectedWhere });
    expect(findManyMock()).toHaveBeenCalledWith(
      expect.objectContaining({ where: expectedWhere }),
    );
  });

  test('should order by createdAt descending', async () => {
    countMock().mockResolvedValue(2);
    findManyMock().mockResolvedValue([
      buildArticle({
        id: 2,
        slug: 'newer',
        createdAt: new Date('2024-02-01T00:00:00.000Z'),
      }),
      buildArticle({
        id: 1,
        slug: 'older',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
      }),
    ]);

    const result = await getBookmarkedArticles(0, 10, userId);

    expect(findManyMock()).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    );
    expect(result.articles.map((article) => article.slug)).toEqual(['newer', 'older']);
  });

  test('should apply limit and offset to the query', async () => {
    countMock().mockResolvedValue(1);
    findManyMock().mockResolvedValue([buildArticle()]);

    await getBookmarkedArticles(20, 5, userId);

    expect(findManyMock()).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 5 }),
    );
  });

  test('should report articlesCount independent of paging', async () => {
    countMock().mockResolvedValue(25);
    findManyMock().mockResolvedValue([buildArticle()]);

    const result = await getBookmarkedArticles(10, 5, userId);

    expect(result.articlesCount).toBe(25);
    expect(result.articles).toHaveLength(1);
  });

  test('should return bookmarked true on every article', async () => {
    countMock().mockResolvedValue(2);
    findManyMock().mockResolvedValue([
      buildArticle({ id: 1, slug: 'first' }),
      buildArticle({ id: 2, slug: 'second' }),
    ]);

    const result = await getBookmarkedArticles(0, 10, userId);

    expect(result.articles).toHaveLength(2);
    expect(result.articles.every((article) => article.bookmarked === true)).toBe(true);
  });

  test('should include the bookmarkedBy relation and map the bookmarked flag', async () => {
    countMock().mockResolvedValue(1);
    findManyMock().mockResolvedValue([buildArticle()]);

    await getBookmarkedArticles(0, 10, userId);

    expect(findManyMock()).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          bookmarkedBy: { select: { id: true } },
        }),
      }),
    );
  });

  test.each([0, -1, 101, 1.5, NaN])('should reject an invalid limit (%p) with 422', async (limit) => {
    await expect(getBookmarkedArticles(0, limit, userId)).rejects.toMatchObject({
      errorCode: 422,
      message: { errors: { limit: expect.any(Array) } },
    });
    expect(countMock()).not.toHaveBeenCalled();
    expect(findManyMock()).not.toHaveBeenCalled();
  });

  test.each([-1, 1.5, NaN])('should reject an invalid offset (%p) with 422', async (offset) => {
    await expect(getBookmarkedArticles(offset, 10, userId)).rejects.toMatchObject({
      errorCode: 422,
      message: { errors: { offset: expect.any(Array) } },
    });
    expect(countMock()).not.toHaveBeenCalled();
    expect(findManyMock()).not.toHaveBeenCalled();
  });

  test('should default an absent limit to 10 and an absent offset to 0', async () => {
    countMock().mockResolvedValue(0);
    findManyMock().mockResolvedValue([]);

    await getBookmarkedArticles(undefined as unknown as number, undefined as unknown as number, userId);

    expect(findManyMock()).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 10 }),
    );
  });
});
