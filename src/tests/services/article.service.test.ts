import prismaMock from '../prisma-mock';
import {
  deleteComment,
  favoriteArticle,
  getArticle,
  getArticles,
  getFeed,
  unfavoriteArticle,
} from '../../app/routes/article/article.service';

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
  favoritedBy: [{ id: 123 }],
  bookmarkedBy: [{ userId: 123 }],
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

      const mockedArticleResponse = {
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
  describe('bookmarked flag', () => {
    test('should be true for the user who bookmarked the article', async () => {
      // Given
      const article = buildMockedArticle();
      const userId = 123;

      // When
      prismaMock.article.count.mockResolvedValue(1);
      prismaMock.article.findMany.mockResolvedValue([article]);

      // Then
      const result = await getArticles({}, userId);

      expect(result.articles[0]).toMatchObject({
        bookmarked: true,
        favorited: true,
        favoritesCount: 1,
      });
      expect(prismaMock.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            bookmarkedBy: { where: { userId }, select: { userId: true } },
          }),
        }),
      );
    });

    test('should be false for another user', async () => {
      // Given
      const article = buildMockedArticle();

      // When
      prismaMock.article.count.mockResolvedValue(1);
      prismaMock.article.findMany.mockResolvedValue([article]);

      // Then
      const result = await getArticles({}, 999);

      expect(result.articles[0]).toMatchObject({
        bookmarked: false,
        favorited: false,
        favoritesCount: 1,
      });
      expect(prismaMock.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            bookmarkedBy: { where: { userId: 999 }, select: { userId: true } },
          }),
        }),
      );
    });

    test('should be false for an anonymous caller even when others bookmarked it', async () => {
      // Given
      const article = buildMockedArticle();

      // When
      prismaMock.article.count.mockResolvedValue(1);
      prismaMock.article.findMany.mockResolvedValue([article]);

      // Then
      const result = await getArticles({});

      expect(result.articles[0]).toMatchObject({
        bookmarked: false,
        favorited: false,
        favoritesCount: 1,
      });
      expect(prismaMock.article.findMany.mock.calls[0][0]).not.toHaveProperty(
        'include.bookmarkedBy',
      );
    });

    test('should be set on a single article for its bookmark owner', async () => {
      // Given
      const article = buildMockedArticle();
      const userId = 123;

      // When
      prismaMock.article.findUnique.mockResolvedValue(article);

      // Then
      const result = await getArticle(article.slug, userId);

      expect(result).toMatchObject({
        bookmarked: true,
        favorited: true,
        favoritesCount: 1,
      });
      expect(prismaMock.article.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            bookmarkedBy: { where: { userId }, select: { userId: true } },
          }),
        }),
      );
    });

    test('should be false on a single article for an anonymous caller', async () => {
      // Given
      const article = buildMockedArticle();

      // When
      prismaMock.article.findUnique.mockResolvedValue(article);

      // Then
      const result = await getArticle(article.slug);

      expect(result).toMatchObject({
        bookmarked: false,
        favorited: false,
        favoritesCount: 1,
      });
    });

    test('should be set on the feed for the user who bookmarked the article', async () => {
      // Given
      const article = buildMockedArticle();
      const userId = 123;

      // When
      prismaMock.article.count.mockResolvedValue(1);
      prismaMock.article.findMany.mockResolvedValue([article]);

      // Then
      const result = await getFeed(0, 10, userId);

      expect(result.articles[0]).toMatchObject({
        bookmarked: true,
        favorited: true,
        favoritesCount: 1,
      });
      expect(prismaMock.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            bookmarkedBy: { where: { userId }, select: { userId: true } },
          }),
        }),
      );
    });

    test('should be set on the favorited article without leaking the relation', async () => {
      // Given
      const article = buildMockedArticle({ _count: { favoritedBy: 1 } });
      const userId = 123;

      // When
      prismaMock.article.update.mockResolvedValue(article);

      // Then
      const result = await favoriteArticle(article.slug, userId);

      expect(result).toMatchObject({
        bookmarked: true,
        favorited: true,
        favoritesCount: 1,
      });
      expect(result).not.toHaveProperty('bookmarkedBy');
      expect(prismaMock.article.update).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            bookmarkedBy: { where: { userId }, select: { userId: true } },
          }),
        }),
      );
    });

    test('should be false on the unfavorited article for another user without leaking the relation', async () => {
      // Given
      const article = buildMockedArticle({ _count: { favoritedBy: 1 } });

      // When
      prismaMock.article.update.mockResolvedValue(article);

      // Then
      const result = await unfavoriteArticle(article.slug, 999);

      expect(result).toMatchObject({
        bookmarked: false,
        favorited: false,
        favoritesCount: 1,
      });
      expect(result).not.toHaveProperty('bookmarkedBy');
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

      const mockedArticleResponse = {
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
      };

      // When
      prismaMock.user.findUnique.mockResolvedValue(mockedUserResponse);
      prismaMock.article.update.mockResolvedValue(mockedArticleResponse);

      // Then
      await expect(unfavoriteArticle(slug, mockedUserResponse.id)).resolves.toHaveProperty(
        'favoritesCount',
      );
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
