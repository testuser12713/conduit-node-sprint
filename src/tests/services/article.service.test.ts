import prismaMock from '../prisma-mock';
import {
  deleteComment,
  favoriteArticle,
  getArticles,
  unfavoriteArticle,
} from '../../app/routes/article/article.service';
import { calculateReadingTime } from '../../app/routes/article/reading-time.utils';

const words = (count: number): string =>
  Array.from({ length: count }, (_, index) => `word${index + 1}`).join(' ');

const buildArticle = (overrides: Record<string, unknown> = {}) => ({
  id: 123,
  slug: 'How-to-train-your-dragon',
  title: 'How to train your dragon',
  description: '',
  body: '',
  createdAt: new Date(),
  updatedAt: new Date(),
  authorId: 456,
  tagList: [],
  favoritedBy: [],
  author: {
    username: 'RealWorld',
    bio: null,
    image: null,
    followedBy: [],
  },
  ...overrides,
});

describe('ArticleService', () => {
  describe('deleteComment', () => {
    test('should throw an error ', () => {
      // Given
      const id = 123;
      const idUser = 456;

      // When
      // @ts-ignore
      prismaMock.comment.findFirst.mockResolvedValue(null);

      // Then
      expect(deleteComment(id, idUser)).rejects.toThrowError();
    });
  });

  describe('favoriteArticle', () => {
    test('should return the favorited article', async () => {
      // Given
      const slug = 'How-to-train-your-dragon';
      const username = 'RealWorld';

      const mockedUserResponse = {
        id: 123,
        username: 'RealWorld',
        email: 'realworld@me',
        password: '1234',
        bio: null,
        image: null,
        token: '',
        demo: false,
      };

      const body = words(201);
      const mockedArticleResponse = {
        id: 123,
        slug: 'How-to-train-your-dragon',
        title: 'How to train your dragon',
        description: '',
        body,
        createdAt: new Date(),
        updatedAt: new Date(),
        authorId: 456,
        tagList: [],
        favoritedBy: [],
        author: {
          username: 'RealWorld',
          bio: null,
          image: null,
          followedBy: [],
        },
      };

      // When
      // @ts-ignore
      prismaMock.user.findUnique.mockResolvedValue(mockedUserResponse);
      // @ts-ignore
      prismaMock.article.update.mockResolvedValue(mockedArticleResponse);

      // Then
      await expect(favoriteArticle(slug, mockedUserResponse.id)).resolves.toHaveProperty(
        'favoritesCount',
      );
      const result = await favoriteArticle(slug, mockedUserResponse.id);
      expect(result).toHaveProperty('id', 123);
      expect(result).toHaveProperty('authorId', 456);
      expect(result).toHaveProperty('favoritedBy');
      expect(result.readingTime).toBe(2);
      expect(result.readingTime).toBe(calculateReadingTime(body));
    });

    test('should throw an error if no user is found', async () => {
      // Given
      const id = 123;
      const slug = 'how-to-train-your-dragon';
      const username = 'RealWorld';

      // When
      prismaMock.user.findUnique.mockResolvedValue(null);

      // Then
      await expect(favoriteArticle(slug, id)).rejects.toThrowError();
    });
  });
  describe('getArticles', () => {
    test('should return every article with its readingTime', async () => {
      // Given
      const shortBody = words(20);
      const longBody = words(450);

      // When
      // @ts-ignore
      prismaMock.article.count.mockResolvedValue(2);
      // @ts-ignore
      prismaMock.article.findMany.mockResolvedValue([
        buildArticle({ id: 1, slug: 'short-article', body: shortBody }),
        buildArticle({ id: 2, slug: 'long-article', body: longBody }),
      ]);

      // Then
      const result = await getArticles({});

      expect(result.articlesCount).toBe(2);
      expect(result.articles).toHaveLength(2);
      expect(result.articles[0]).toMatchObject({
        slug: 'short-article',
        body: shortBody,
        readingTime: calculateReadingTime(shortBody),
      });
      expect(result.articles[0].readingTime).toBe(1);
      expect(result.articles[1]).toMatchObject({
        slug: 'long-article',
        body: longBody,
        readingTime: calculateReadingTime(longBody),
      });
      expect(result.articles[1].readingTime).toBe(3);
      result.articles.forEach((article) => {
        expect(Number.isInteger(article.readingTime)).toBe(true);
        expect(article.readingTime).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('unfavoriteArticle', () => {
    test('should return the unfavorited article', async () => {
      // Given
      const slug = 'How-to-train-your-dragon';
      const username = 'RealWorld';

      const mockedUserResponse = {
        id: 123,
        username: 'RealWorld',
        email: 'realworld@me',
        password: '1234',
        bio: null,
        image: null,
        token: '',
        demo: false,
      };

      const body = words(400);
      const mockedArticleResponse = {
        id: 123,
        slug: 'How-to-train-your-dragon',
        title: 'How to train your dragon',
        description: '',
        body,
        createdAt: new Date(),
        updatedAt: new Date(),
        authorId: 456,
        tagList: [],
        favoritedBy: [],
        author: {
          username: 'RealWorld',
          bio: null,
          image: null,
          followedBy: [],
        },
      };

      // When
      prismaMock.user.findUnique.mockResolvedValue(mockedUserResponse);
      prismaMock.article.update.mockResolvedValue(mockedArticleResponse);

      // Then
      await expect(unfavoriteArticle(slug, mockedUserResponse.id)).resolves.toHaveProperty(
        'favoritesCount',
      );
      const result = await unfavoriteArticle(slug, mockedUserResponse.id);
      expect(result.readingTime).toBe(2);
      expect(result.readingTime).toBe(calculateReadingTime(body));
    });

    test('should throw an error if no user is found', async () => {
      // Given
      const id = 123;
      const slug = 'how-to-train-your-dragon';
      const username = 'RealWorld';

      // When
      prismaMock.user.findUnique.mockResolvedValue(null);

      // Then
      await expect(unfavoriteArticle(slug, id)).rejects.toThrowError();
    });
  });
});
