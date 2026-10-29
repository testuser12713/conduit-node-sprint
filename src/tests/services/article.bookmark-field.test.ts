import prismaMock from '../prisma-mock';
import articleMapper from '../../app/routes/article/article.mapper';
import {
  favoriteArticle,
  unfavoriteArticle,
} from '../../app/routes/article/article.service';

const buildArticle = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  slug: 'how-to-train-your-dragon',
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

describe('bookmarked article field', () => {
  describe('articleMapper', () => {
    test('is true for the requesting user who bookmarked the article', () => {
      const article = buildArticle({ bookmarkedBy: [{ id: 123 }] });

      expect(articleMapper(article, 123).bookmarked).toBe(true);
    });

    test('is false for a different user', () => {
      const article = buildArticle({ bookmarkedBy: [{ id: 123 }] });

      expect(articleMapper(article, 456).bookmarked).toBe(false);
    });

    test('is false for an anonymous caller', () => {
      const article = buildArticle({ bookmarkedBy: [{ id: 123 }] });

      expect(articleMapper(article).bookmarked).toBe(false);
    });

    test('is false when there are no bookmarks', () => {
      const article = buildArticle();

      expect(articleMapper(article, 123).bookmarked).toBe(false);
    });
  });

  describe('favoriteArticle', () => {
    test('returns a boolean bookmarked and never serializes bookmarkedBy', async () => {
      const id = 123;
      // @ts-ignore
      prismaMock.article.update.mockResolvedValue(
        buildArticle({
          bookmarkedBy: [{ id: 123, email: 'other@example.com' }],
          favoritedBy: [{ id: 123 }],
        })
      );

      const result = await favoriteArticle('how-to-train-your-dragon', id);

      expect(result).toHaveProperty('bookmarked', true);
      expect(typeof result.bookmarked).toBe('boolean');
      expect(result).not.toHaveProperty('bookmarkedBy');
      expect(JSON.stringify(result)).not.toContain('other@example.com');
    });
  });

  describe('unfavoriteArticle', () => {
    test('returns a boolean bookmarked and never serializes bookmarkedBy', async () => {
      const id = 123;
      // @ts-ignore
      prismaMock.article.update.mockResolvedValue(
        buildArticle({
          bookmarkedBy: [{ id: 123, email: 'other@example.com' }],
          favoritedBy: [{ id: 123 }],
        })
      );

      const result = await unfavoriteArticle('how-to-train-your-dragon', id);

      expect(result).toHaveProperty('bookmarked', true);
      expect(typeof result.bookmarked).toBe('boolean');
      expect(result).not.toHaveProperty('bookmarkedBy');
      expect(JSON.stringify(result)).not.toContain('other@example.com');
    });
  });
});
