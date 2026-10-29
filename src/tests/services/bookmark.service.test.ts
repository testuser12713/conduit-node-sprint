import prismaMock from '../prisma-mock';
import {
  addBookmark,
  removeBookmark,
} from '../../app/routes/article/article.service';

type ArticleField = jest.Mock;

const articleMock = prismaMock.article as unknown as {
  findUnique: ArticleField;
};

const userBookmarksMock = prismaMock.userBookmarks as unknown as {
  create: ArticleField;
  delete: ArticleField;
};

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
  bookmarkedBy: [],
  author: {
    username: 'RealWorld',
    bio: null,
    image: null,
    followedBy: [],
  },
  ...overrides,
});

const USER_ID = 123;

describe('BookmarkService', () => {
  describe('addBookmark', () => {
    test('should bookmark the article and answer with bookmarked true', async () => {
      // Given
      const article = buildMockedArticle();
      const bookmarkedArticle = buildMockedArticle({
        bookmarkedBy: [{ userId: USER_ID }],
      });

      // When
      articleMock.findUnique
        .mockResolvedValueOnce(article)
        .mockResolvedValueOnce(bookmarkedArticle);
      userBookmarksMock.create.mockResolvedValue({});

      // Then
      const result = await addBookmark(article.slug, USER_ID);

      expect(result).toMatchObject({ slug: article.slug, bookmarked: true });
      expect(userBookmarksMock.create).toHaveBeenCalledWith({
        data: { userId: USER_ID, articleId: article.id },
      });
    });

    test('should not create a second row when the article is already bookmarked', async () => {
      // Given
      const article = buildMockedArticle({
        bookmarkedBy: [{ userId: USER_ID }],
      });

      // When
      articleMock.findUnique.mockResolvedValue(article);

      // Then
      const result = await addBookmark(article.slug, USER_ID);

      expect(result).toMatchObject({ slug: article.slug, bookmarked: true });
      expect(userBookmarksMock.create).not.toHaveBeenCalled();
      expect(userBookmarksMock.delete).not.toHaveBeenCalled();
    });

    test('should answer 404 when the article does not exist', async () => {
      // Given
      articleMock.findUnique.mockResolvedValue(null);

      // Then
      await expect(addBookmark('unknown-slug', USER_ID)).rejects.toMatchObject({
        errorCode: 404,
        message: { errors: { article: ['not found'] } },
      });
      expect(userBookmarksMock.create).not.toHaveBeenCalled();
    });
  });

  describe('removeBookmark', () => {
    test('should remove the bookmark and answer with bookmarked false', async () => {
      // Given
      const article = buildMockedArticle({
        bookmarkedBy: [{ userId: USER_ID }],
      });
      const unbookmarkedArticle = buildMockedArticle();

      // When
      articleMock.findUnique
        .mockResolvedValueOnce(article)
        .mockResolvedValueOnce(unbookmarkedArticle);
      userBookmarksMock.delete.mockResolvedValue({});

      // Then
      const result = await removeBookmark(article.slug, USER_ID);

      expect(result).toMatchObject({ slug: article.slug, bookmarked: false });
      expect(userBookmarksMock.delete).toHaveBeenCalledWith({
        where: { userId_articleId: { userId: USER_ID, articleId: article.id } },
      });
    });

    test('should succeed without writing when no bookmark exists', async () => {
      // Given
      const article = buildMockedArticle();

      // When
      articleMock.findUnique.mockResolvedValue(article);

      // Then
      const result = await removeBookmark(article.slug, USER_ID);

      expect(result).toMatchObject({ slug: article.slug, bookmarked: false });
      expect(userBookmarksMock.delete).not.toHaveBeenCalled();
    });

    test('should answer 404 when the article does not exist', async () => {
      // Given
      articleMock.findUnique.mockResolvedValue(null);

      // Then
      await expect(
        removeBookmark('unknown-slug', USER_ID)
      ).rejects.toMatchObject({
        errorCode: 404,
        message: { errors: { article: ['not found'] } },
      });
      expect(userBookmarksMock.delete).not.toHaveBeenCalled();
    });
  });
});
