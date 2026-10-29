import prismaMock, { buildArticleFixture, buildUserFixture } from '../prisma-mock';
import articleMapper from '../../app/routes/article/article.mapper';
import {
  deleteComment,
  favoriteArticle,
  getArticle,
  getArticles,
  unfavoriteArticle,
} from '../../app/routes/article/article.service';

const articleMock = prismaMock.article as unknown as {
  findUnique: jest.Mock;
  findMany: jest.Mock;
  count: jest.Mock;
  update: jest.Mock;
};
const userMock = prismaMock.user as unknown as { findUnique: jest.Mock };
const commentMock = prismaMock.comment as unknown as { findFirst: jest.Mock };

const slug = 'how-to-train-your-dragon';

describe('ArticleService', () => {
  describe('articleMapper', () => {
    test('should set bookmarked when the requester bookmarked the article', () => {
      // Given
      const requester = buildUserFixture({ id: 123 });
      const article = buildArticleFixture({ bookmarkedBy: [{ id: requester.id }] });

      // When
      const result = articleMapper(article, requester.id);

      // Then
      expect(result.bookmarked).toBe(true);
    });

    test('should not set bookmarked for another user', () => {
      // Given
      const requester = buildUserFixture({ id: 123 });
      const article = buildArticleFixture({ bookmarkedBy: [{ id: 999 }] });

      // When
      const result = articleMapper(article, requester.id);

      // Then
      expect(result.bookmarked).toBe(false);
    });

    test('should not set bookmarked without a requester id', () => {
      // Given
      const article = buildArticleFixture({ bookmarkedBy: [{ id: 123 }] });

      // When
      const result = articleMapper(article);

      // Then
      expect(result.bookmarked).toBe(false);
    });

    test('should not set bookmarked when the relation is missing', () => {
      // Given
      const requester = buildUserFixture({ id: 123 });
      const article = buildArticleFixture({ bookmarkedBy: undefined });

      // When
      const result = articleMapper(article, requester.id);

      // Then
      expect(result.bookmarked).toBe(false);
    });
  });

  describe('getArticle', () => {
    test('should return bookmarked true for the requester of the bookmark', async () => {
      // Given
      const requester = buildUserFixture({ id: 123 });
      const article = buildArticleFixture({
        bookmarkedBy: [{ id: requester.id }],
        favoritedBy: [{ id: requester.id }],
      });

      // When
      articleMock.findUnique.mockResolvedValue(article);

      // Then
      const result = await getArticle(slug, requester.id);

      expect(result.bookmarked).toBe(true);
      expect(result.favorited).toBe(true);
      expect(result.favoritesCount).toBe(1);
    });

    test('should return bookmarked false for another user', async () => {
      // Given
      const requester = buildUserFixture({ id: 123 });
      const article = buildArticleFixture({ bookmarkedBy: [{ id: 999 }] });

      // When
      articleMock.findUnique.mockResolvedValue(article);

      // Then
      const result = await getArticle(slug, requester.id);

      expect(result.bookmarked).toBe(false);
      expect(result.favorited).toBe(false);
      expect(result.favoritesCount).toBe(0);
    });

    test('should return bookmarked false without a requester id', async () => {
      // Given
      const article = buildArticleFixture({ bookmarkedBy: [{ id: 123 }] });

      // When
      articleMock.findUnique.mockResolvedValue(article);

      // Then
      const result = await getArticle(slug);

      expect(result.bookmarked).toBe(false);
    });

    test('should only load the ids of the users who bookmarked the article', async () => {
      // Given
      const article = buildArticleFixture();

      // When
      articleMock.findUnique.mockResolvedValue(article);

      // Then
      await getArticle(slug);

      expect(articleMock.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            bookmarkedBy: { select: { id: true } },
          }),
        }),
      );
    });
  });

  describe('getArticles', () => {
    test('should return bookmarked true for the requester in the article list', async () => {
      // Given
      const requester = buildUserFixture({ id: 123 });
      const article = buildArticleFixture({ bookmarkedBy: [{ id: requester.id }] });

      // When
      articleMock.count.mockResolvedValue(1);
      articleMock.findMany.mockResolvedValue([article]);

      // Then
      const result = await getArticles({}, requester.id);

      expect(result.articlesCount).toBe(1);
      expect(result.articles[0].bookmarked).toBe(true);
    });
  });

  describe('deleteComment', () => {
    test('should throw an error ', () => {
      // Given
      const id = 123;
      const idUser = 456;

      // When
      commentMock.findFirst.mockResolvedValue(null);

      // Then
      expect(deleteComment(id, idUser)).rejects.toThrowError();
    });
  });

  describe('favoriteArticle', () => {
    test('should return the favorited article', async () => {
      // Given
      const requester = buildUserFixture({ id: 123 });
      const article = buildArticleFixture({
        favoritedBy: [{ id: requester.id }],
        bookmarkedBy: [{ id: requester.id }],
      });

      // When
      userMock.findUnique.mockResolvedValue(requester);
      articleMock.update.mockResolvedValue({ ...article, _count: { favoritedBy: 1 } });

      // Then
      const result = await favoriteArticle(article.slug, requester.id);

      expect(result).toMatchObject({
        id: article.id,
        slug: article.slug,
        title: article.title,
        description: article.description,
        body: article.body,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
        authorId: article.authorId,
        tagList: [],
        favorited: true,
        favoritesCount: 1,
        bookmarked: true,
      });
      expect(result).not.toHaveProperty('bookmarkedBy');
    });

    test('should not set bookmarked for a user who did not bookmark the article', async () => {
      // Given
      const requester = buildUserFixture({ id: 123 });
      const article = buildArticleFixture({ bookmarkedBy: [{ id: 999 }] });

      // When
      userMock.findUnique.mockResolvedValue(requester);
      articleMock.update.mockResolvedValue({ ...article, _count: { favoritedBy: 0 } });

      // Then
      const result = await favoriteArticle(article.slug, requester.id);

      expect(result.bookmarked).toBe(false);
      expect(result.favorited).toBe(false);
      expect(result.favoritesCount).toBe(0);
    });

    test('should throw an error if no user is found', async () => {
      // Given
      const id = 123;

      // When
      userMock.findUnique.mockResolvedValue(null);

      // Then
      await expect(favoriteArticle(slug, id)).rejects.toThrowError();
    });
  });
  describe('unfavoriteArticle', () => {
    test('should return the unfavorited article', async () => {
      // Given
      const requester = buildUserFixture({ id: 123 });
      const article = buildArticleFixture({ bookmarkedBy: [{ id: requester.id }] });

      // When
      userMock.findUnique.mockResolvedValue(requester);
      articleMock.update.mockResolvedValue({ ...article, _count: { favoritedBy: 0 } });

      // Then
      const result = await unfavoriteArticle(article.slug, requester.id);

      expect(result).toMatchObject({
        id: article.id,
        slug: article.slug,
        title: article.title,
        description: article.description,
        body: article.body,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
        authorId: article.authorId,
        tagList: [],
        favorited: false,
        favoritesCount: 0,
        bookmarked: true,
      });
      expect(result).not.toHaveProperty('bookmarkedBy');
    });

    test('should throw an error if no user is found', async () => {
      // Given
      const id = 123;

      // When
      userMock.findUnique.mockResolvedValue(null);

      // Then
      await expect(unfavoriteArticle(slug, id)).rejects.toThrowError();
    });
  });

  describe('favorite response privacy', () => {
    const otherUser = buildUserFixture({
      id: 999,
      username: 'OtherUser',
      email: 'other-user@example.com',
      password: 'hashed-secret',
    });

    test('should not expose the users who favorited the article', async () => {
      // Given
      const requester = buildUserFixture({ id: 123 });
      const article = buildArticleFixture({ favoritedBy: [otherUser] });

      // When
      userMock.findUnique.mockResolvedValue(requester);
      articleMock.update.mockResolvedValue({ ...article, _count: { favoritedBy: 1 } });

      // Then
      const result = await favoriteArticle(article.slug, requester.id);
      const payload = JSON.stringify(result);

      expect(result).not.toHaveProperty('favoritedBy');
      expect(payload).not.toContain(otherUser.email);
      expect(payload).not.toContain(otherUser.password);
      expect(result.favorited).toBe(false);
      expect(result.favoritesCount).toBe(1);
    });

    test('should not expose the users who favorited the article on unfavorite', async () => {
      // Given
      const requester = buildUserFixture({ id: 123 });
      const article = buildArticleFixture({ favoritedBy: [otherUser] });

      // When
      userMock.findUnique.mockResolvedValue(requester);
      articleMock.update.mockResolvedValue({ ...article, _count: { favoritedBy: 1 } });

      // Then
      const result = await unfavoriteArticle(article.slug, requester.id);
      const payload = JSON.stringify(result);

      expect(result).not.toHaveProperty('favoritedBy');
      expect(payload).not.toContain(otherUser.email);
      expect(payload).not.toContain(otherUser.password);
      expect(result.favoritesCount).toBe(1);
    });
  });
});
