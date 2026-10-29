jest.mock('../../app/routes/auth/jwt-secret', () => ({
  __esModule: true,
  default: () => 'test-secret',
}));

import { NextFunction, Request, Response } from 'express';
import prismaMock from '../prisma-mock';
import HttpException from '../../app/models/http-exception.model';
import {
  addBookmark,
  removeBookmark,
} from '../../app/routes/article/article.service';
import router from '../../app/routes/article/article.controller';

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

  describe('bookmark routes', () => {
    const buildRequest = () =>
      ({
        params: { slug: 'how-to-train-your-dragon' },
        auth: { user: { id: USER_ID } },
        body: {},
        query: {},
      } as unknown as Request);

    const buildResponse = () => {
      const response = {
        status: jest.fn(),
        json: jest.fn(),
      };
      response.status.mockReturnValue(response);
      return response;
    };

    const getRouteHandler = (path: string, method: 'post' | 'delete') => {
      const stack = (
        router as unknown as {
          stack: {
            route?: {
              path: string;
              methods: Record<string, boolean>;
              stack: { handle: (...args: unknown[]) => Promise<void> }[];
            };
          }[];
        }
      ).stack;

      const routeLayer = stack.find(
        (layer) => layer.route?.path === path && layer.route.methods[method]
      );

      if (!routeLayer?.route) {
        throw new Error(
          `Route ${method.toUpperCase()} ${path} is not registered`
        );
      }

      const handlers = routeLayer.route.stack;
      return handlers[handlers.length - 1].handle as unknown as (
        req: Request,
        res: Response,
        next: NextFunction
      ) => Promise<void>;
    };

    test('POST should map an unexpected failure to the errors.body shape', async () => {
      // Given
      const handler = getRouteHandler('/articles/:slug/bookmark', 'post');
      const res = buildResponse();
      const next = jest.fn();
      articleMock.findUnique.mockRejectedValue(
        new Error('prisma: unique constraint on userId_articleId')
      );

      // When
      await handler(buildRequest(), res as unknown as Response, next);

      // Then
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        errors: { body: ['internal server error'] },
      });
      expect(JSON.stringify(res.json.mock.calls)).not.toContain('prisma');
    });

    test('DELETE should map an unexpected failure to the errors.body shape', async () => {
      // Given
      const handler = getRouteHandler('/articles/:slug/bookmark', 'delete');
      const res = buildResponse();
      const next = jest.fn();
      articleMock.findUnique.mockResolvedValue(
        buildMockedArticle({ bookmarkedBy: [{ userId: USER_ID }] })
      );
      userBookmarksMock.delete.mockRejectedValue(
        new Error('prisma: record to delete does not exist')
      );

      // When
      await handler(buildRequest(), res as unknown as Response, next);

      // Then
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        errors: { body: ['internal server error'] },
      });
      expect(JSON.stringify(res.json.mock.calls)).not.toContain('prisma');
    });

    test('should forward the 404 HttpException to the shared error handler', async () => {
      // Given
      const handler = getRouteHandler('/articles/:slug/bookmark', 'post');
      const res = buildResponse();
      const next = jest.fn();
      articleMock.findUnique.mockResolvedValue(null);

      // When
      await handler(buildRequest(), res as unknown as Response, next);

      // Then
      expect(res.status).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(HttpException);
      expect(error).toMatchObject({
        errorCode: 404,
        message: { errors: { article: ['not found'] } },
      });
    });
  });
});
