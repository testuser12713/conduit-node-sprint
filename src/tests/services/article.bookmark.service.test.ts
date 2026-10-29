import prismaMock from '../prisma-mock';
import {
  bookmarkArticle,
  unbookmarkArticle,
} from '../../app/routes/article/bookmark.service';

const slug = 'how-to-train-your-dragon';
const id = 123;

const articleMock = (prismaMock as any).article;
const findUniqueMock = articleMock.findUnique as jest.Mock;
const updateMock = articleMock.update as jest.Mock;

const buildArticle = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  slug,
  title: 'How to train your dragon',
  description: '',
  body: '',
  createdAt: new Date(),
  updatedAt: new Date(),
  authorId: 456,
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

describe('BookmarkService', () => {
  describe('bookmarkArticle', () => {
    test('returns the article with bookmarked true', async () => {
      findUniqueMock.mockResolvedValue(buildArticle() as any);
      updateMock.mockResolvedValue(
        buildArticle({ bookmarkedBy: [{ id }] }) as any
      );

      const result = await bookmarkArticle(slug, id);

      expect(result).toHaveProperty('bookmarked', true);
      expect(result).not.toHaveProperty('bookmarkedBy');
      expect(updateMock).toHaveBeenCalledTimes(1);
    });

    test('a repeated call creates no second relation', async () => {
      findUniqueMock.mockResolvedValue(
        buildArticle({ bookmarkedBy: [{ id }] }) as any
      );

      const result = await bookmarkArticle(slug, id);

      expect(result).toHaveProperty('bookmarked', true);
      expect(updateMock).not.toHaveBeenCalled();
    });

    test('throws a 404 with the article not found body for an unknown slug', async () => {
      findUniqueMock.mockResolvedValue(null);

      await expect(bookmarkArticle('unknown-slug', id)).rejects.toMatchObject({
        errorCode: 404,
        message: { errors: { article: ['not found'] } },
      });
      expect(updateMock).not.toHaveBeenCalled();
    });
  });

  describe('unbookmarkArticle', () => {
    test('returns the article with bookmarked false', async () => {
      findUniqueMock.mockResolvedValue(
        buildArticle({ bookmarkedBy: [{ id }] }) as any
      );
      updateMock.mockResolvedValue(buildArticle() as any);

      const result = await unbookmarkArticle(slug, id);

      expect(result).toHaveProperty('bookmarked', false);
      expect(updateMock).toHaveBeenCalledTimes(1);
    });

    test('is a no-op when there is no existing bookmark', async () => {
      findUniqueMock.mockResolvedValue(buildArticle() as any);

      const result = await unbookmarkArticle(slug, id);

      expect(result).toHaveProperty('bookmarked', false);
      expect(updateMock).not.toHaveBeenCalled();
    });

    test('throws a 404 with the article not found body for an unknown slug', async () => {
      findUniqueMock.mockResolvedValue(null);

      await expect(unbookmarkArticle('unknown-slug', id)).rejects.toMatchObject(
        {
          errorCode: 404,
          message: { errors: { article: ['not found'] } },
        }
      );
      expect(updateMock).not.toHaveBeenCalled();
    });
  });
});
