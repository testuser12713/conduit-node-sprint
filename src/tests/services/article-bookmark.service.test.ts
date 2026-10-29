import prismaMock from '../prisma-mock';
import {
  bookmarkArticle,
  getBookmarkedArticles,
  unbookmarkArticle,
} from '../../app/routes/article/article.service';

const makeArticle = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  slug: 'how-to-train-your-dragon',
  title: 'How to train your dragon',
  description: 'Ever wonder how?',
  body: 'You have to believe',
  createdAt: new Date('2022-01-01T00:00:00.000Z'),
  updatedAt: new Date('2022-01-01T00:00:00.000Z'),
  authorId: 99,
  tagList: [],
  favoritedBy: [],
  bookmarkedBy: [],
  author: {
    username: 'RealWorld',
    bio: null,
    image: null,
    followedBy: [],
  },
  ...overrides,
});

const articleMock = prismaMock.article as unknown as {
  findUnique: jest.Mock;
  update: jest.Mock;
  count: jest.Mock;
  findMany: jest.Mock;
};

describe('ArticleService bookmarking', () => {
  describe('bookmarkArticle', () => {
    test('should set the bookmarked flag for the acting user', async () => {
      const id = 123;
      const slug = 'how-to-train-your-dragon';

      articleMock.findUnique.mockResolvedValue(makeArticle({ slug }));
      articleMock.update.mockResolvedValue(
        makeArticle({ slug, bookmarkedBy: [{ id }] }),
      );

      const article = await bookmarkArticle(slug, id);

      expect(article.bookmarked).toBe(true);
      expect(articleMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug },
          data: { bookmarkedBy: { connect: { id } } },
        }),
      );
    });

    test('should stay idempotent when the article is already bookmarked', async () => {
      const id = 123;
      const slug = 'how-to-train-your-dragon';

      articleMock.findUnique.mockResolvedValue(
        makeArticle({ slug, bookmarkedBy: [{ id }] }),
      );

      const first = await bookmarkArticle(slug, id);
      const second = await bookmarkArticle(slug, id);

      expect(first.bookmarked).toBe(true);
      expect(second.bookmarked).toBe(true);
      expect(articleMock.update).not.toHaveBeenCalled();
    });

    test('should throw a 404 for an unknown slug', async () => {
      articleMock.findUnique.mockResolvedValue(null);

      await expect(bookmarkArticle('unknown-slug', 123)).rejects.toMatchObject({
        errorCode: 404,
        message: { errors: { article: ['not found'] } },
      });
      expect(articleMock.update).not.toHaveBeenCalled();
    });
  });

  describe('unbookmarkArticle', () => {
    test('should clear the bookmarked flag for the acting user', async () => {
      const id = 123;
      const slug = 'how-to-train-your-dragon';

      articleMock.findUnique.mockResolvedValue(
        makeArticle({ slug, bookmarkedBy: [{ id }] }),
      );
      articleMock.update.mockResolvedValue(makeArticle({ slug }));

      const article = await unbookmarkArticle(slug, id);

      expect(article.bookmarked).toBe(false);
      expect(articleMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug },
          data: { bookmarkedBy: { disconnect: { id } } },
        }),
      );
    });

    test('should stay idempotent when the article is not bookmarked', async () => {
      const id = 123;
      const slug = 'how-to-train-your-dragon';

      articleMock.findUnique.mockResolvedValue(makeArticle({ slug }));

      const first = await unbookmarkArticle(slug, id);
      const second = await unbookmarkArticle(slug, id);

      expect(first.bookmarked).toBe(false);
      expect(second.bookmarked).toBe(false);
      expect(articleMock.update).not.toHaveBeenCalled();
    });

    test('should throw a 404 for an unknown slug', async () => {
      articleMock.findUnique.mockResolvedValue(null);

      await expect(unbookmarkArticle('unknown-slug', 123)).rejects.toMatchObject({
        errorCode: 404,
        message: { errors: { article: ['not found'] } },
      });
      expect(articleMock.update).not.toHaveBeenCalled();
    });
  });

  describe('getBookmarkedArticles', () => {
    test('should return the caller bookmarks with paging and an independent total', async () => {
      const id = 123;

      articleMock.count.mockResolvedValue(7);
      articleMock.findMany.mockResolvedValue([
        makeArticle({ id: 2, slug: 'second', bookmarkedBy: [{ id }] }),
        makeArticle({ id: 1, slug: 'first', bookmarkedBy: [{ id }] }),
      ]);

      const result = await getBookmarkedArticles({ offset: '1', limit: '2' }, id);

      expect(result.articlesCount).toBe(7);
      expect(result.articles).toHaveLength(2);
      expect(result.articles.map((article) => article.slug)).toEqual(['second', 'first']);
      expect(result.articles.every((article) => article.bookmarked)).toBe(true);

      const userFilter = { bookmarkedBy: { some: { id } } };

      expect(articleMock.count).toHaveBeenCalledWith({ where: userFilter });
      expect(articleMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: userFilter,
          orderBy: { createdAt: 'desc' },
          skip: 1,
          take: 2,
        }),
      );
    });

    test('should default to the first ten bookmarks', async () => {
      const id = 123;

      articleMock.count.mockResolvedValue(0);
      articleMock.findMany.mockResolvedValue([]);

      const result = await getBookmarkedArticles({}, id);

      expect(result.articles).toEqual([]);
      expect(result.articlesCount).toBe(0);
      expect(articleMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        }),
      );
    });
  });
});
