import prismaMock from '../prisma-mock';
import {
  addBookmark,
  removeBookmark,
} from '../../app/routes/article/article.service';

const slug = 'how-to-train-your-dragon';
const userId = 7;

const buildArticle = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  slug,
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
  bookmarkedBy: [],
  _count: { favoritedBy: 0 },
  ...overrides,
});

const articleMock = prismaMock as unknown as {
  article: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

const findUniqueMock = () => articleMock.article.findUnique;
const updateMock = () => articleMock.article.update;

describe('BookmarkService', () => {
  describe('addBookmark', () => {
    test('should return the article with bookmarked true', async () => {
      findUniqueMock().mockResolvedValue({ id: 1 });
      updateMock().mockResolvedValue(buildArticle({ bookmarkedBy: [{ id: userId }] }));

      const article = await addBookmark(slug, userId);

      expect(article).toMatchObject({
        slug,
        title: 'How to train your dragon',
        description: 'Ever wonder how?',
        body: 'You have to believe',
        tagList: ['dragons'],
        favorited: false,
        favoritesCount: 0,
        bookmarked: true,
        author: {
          username: 'RealWorld',
          bio: null,
          image: null,
          following: false,
        },
      });
    });

    test('should connect the bookmark for the acting user only', async () => {
      findUniqueMock().mockResolvedValue({ id: 1 });
      updateMock().mockResolvedValue(buildArticle({ bookmarkedBy: [{ id: userId }] }));

      await addBookmark(slug, userId);

      expect(updateMock()).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug },
          data: {
            bookmarkedBy: {
              connect: { id: userId },
            },
          },
        }),
      );
    });

    test('should throw a 404 for an unknown slug', async () => {
      findUniqueMock().mockResolvedValue(null);
      updateMock().mockResolvedValue(buildArticle());

      await expect(addBookmark('unknown-slug', userId)).rejects.toMatchObject({
        errorCode: 404,
        message: { errors: { article: ['not found'] } },
      });
      expect(updateMock()).not.toHaveBeenCalled();
    });

    test('should be idempotent on a second bookmark', async () => {
      findUniqueMock().mockResolvedValue({ id: 1 });
      updateMock().mockResolvedValue(buildArticle({ bookmarkedBy: [{ id: userId }] }));

      const first = await addBookmark(slug, userId);
      const second = await addBookmark(slug, userId);

      expect(first.bookmarked).toBe(true);
      expect(second.bookmarked).toBe(true);
      expect(updateMock()).toHaveBeenCalledTimes(2);
      expect(
        updateMock().mock.calls.every(
          (call) => call[0].data.bookmarkedBy.connect.id === userId,
        ),
      ).toBe(true);
    });
  });

  describe('removeBookmark', () => {
    test('should return the article with bookmarked false', async () => {
      findUniqueMock().mockResolvedValue({ id: 1 });
      updateMock().mockResolvedValue(buildArticle({ bookmarkedBy: [] }));

      const article = await removeBookmark(slug, userId);

      expect(article.bookmarked).toBe(false);
      expect(article).toMatchObject({
        slug,
        title: 'How to train your dragon',
        description: 'Ever wonder how?',
        body: 'You have to believe',
        tagList: ['dragons'],
        favorited: false,
        favoritesCount: 0,
      });
    });

    test('should disconnect the bookmark for the acting user only', async () => {
      findUniqueMock().mockResolvedValue({ id: 1 });
      updateMock().mockResolvedValue(buildArticle({ bookmarkedBy: [] }));

      await removeBookmark(slug, userId);

      expect(updateMock()).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug },
          data: {
            bookmarkedBy: {
              disconnect: { id: userId },
            },
          },
        }),
      );
    });

    test('should throw a 404 for an unknown slug', async () => {
      findUniqueMock().mockResolvedValue(null);
      updateMock().mockResolvedValue(buildArticle());

      await expect(removeBookmark('unknown-slug', userId)).rejects.toMatchObject({
        errorCode: 404,
        message: { errors: { article: ['not found'] } },
      });
      expect(updateMock()).not.toHaveBeenCalled();
    });

    test('should be idempotent when the article was not bookmarked', async () => {
      findUniqueMock().mockResolvedValue({ id: 1 });
      updateMock().mockResolvedValue(buildArticle({ bookmarkedBy: [] }));

      const first = await removeBookmark(slug, userId);
      const second = await removeBookmark(slug, userId);

      expect(first.bookmarked).toBe(false);
      expect(second.bookmarked).toBe(false);
      expect(updateMock()).toHaveBeenCalledTimes(2);
      expect(
        updateMock().mock.calls.every(
          (call) => call[0].data.bookmarkedBy.disconnect.id === userId,
        ),
      ).toBe(true);
    });
  });
});
