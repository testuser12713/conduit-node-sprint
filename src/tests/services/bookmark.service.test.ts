import { NextFunction, Request, Response } from 'express';
import prismaMock, { buildArticleFixture, buildUserFixture } from '../prisma-mock';
import HttpException from '../../app/models/http-exception.model';
import auth from '../../app/routes/auth/auth';
import bookmarksController from '../../app/routes/article/bookmark.controller';
import {
  bookmarkArticle,
  unbookmarkArticle,
} from '../../app/routes/article/bookmark.service';

const articleMock = prismaMock.article as unknown as {
  findUnique: jest.Mock;
  update: jest.Mock;
};

const slug = 'how-to-train-your-dragon';

interface RouteHandlerLayer {
  handle: (req: Request, res: Response, next: NextFunction) => unknown;
}

interface RouteLayer {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: RouteHandlerLayer[];
  };
}

const findRoute = (method: 'post' | 'delete'): RouteLayer | undefined =>
  (bookmarksController as unknown as { stack: RouteLayer[] }).stack.find(
    (layer) =>
      layer.route?.path === '/articles/:slug/bookmark' &&
      layer.route?.methods?.[method] === true,
  );

const getRoute = (method: 'post' | 'delete') => {
  const route = findRoute(method)?.route;
  if (!route) {
    throw new Error(`route not registered: ${method} /articles/:slug/bookmark`);
  }
  return route;
};

describe('BookmarkService', () => {
  describe('bookmarkArticle', () => {
    test('should return the article with bookmarked true', async () => {
      // Given
      const requester = buildUserFixture({ id: 123 });
      const article = buildArticleFixture({ bookmarkedBy: [{ id: requester.id }] });

      // When
      articleMock.findUnique.mockResolvedValue(article);
      articleMock.update.mockResolvedValue(article);

      // Then
      const result = await bookmarkArticle(slug, requester.id);

      expect(result.bookmarked).toBe(true);
      expect(articleMock.update).toHaveBeenCalledWith({
        where: { slug },
        data: { bookmarkedBy: { connect: { id: requester.id } } },
        include: expect.objectContaining({
          bookmarkedBy: { select: { id: true } },
        }),
      });
    });

    test('should stay successful and unchanged when called twice', async () => {
      // Given
      const requester = buildUserFixture({ id: 123 });
      const article = buildArticleFixture({ bookmarkedBy: [{ id: requester.id }] });

      // When
      articleMock.findUnique.mockResolvedValue(article);
      articleMock.update.mockResolvedValue(article);

      // Then
      const first = await bookmarkArticle(slug, requester.id);
      const second = await bookmarkArticle(slug, requester.id);

      expect(first.bookmarked).toBe(true);
      expect(second.bookmarked).toBe(true);
      expect(articleMock.update).toHaveBeenCalledTimes(2);
      expect(articleMock.update).toHaveBeenNthCalledWith(2, {
        where: { slug },
        data: { bookmarkedBy: { connect: { id: requester.id } } },
        include: expect.any(Object),
      });
    });

    test('should not change the favorites of the article', async () => {
      // Given
      const requester = buildUserFixture({ id: 123 });
      const otherUser = buildUserFixture({ id: 999, username: 'SomeoneElse' });
      const article = buildArticleFixture({
        favoritedBy: [{ id: otherUser.id }],
        bookmarkedBy: [{ id: requester.id }],
      });

      // When
      articleMock.findUnique.mockResolvedValue(article);
      articleMock.update.mockResolvedValue(article);

      // Then
      const result = await bookmarkArticle(slug, requester.id);

      expect(result.favorited).toBe(false);
      expect(result.favoritesCount).toBe(1);
      expect(articleMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { bookmarkedBy: { connect: { id: requester.id } } },
        }),
      );
    });

    test('should throw a 404 for an unknown slug', async () => {
      // Given
      articleMock.findUnique.mockResolvedValue(null);

      // When / Then
      await expect(bookmarkArticle('unknown-slug', 123)).rejects.toMatchObject({
        errorCode: 404,
        message: { errors: { article: ['not found'] } },
      });
      expect(articleMock.update).not.toHaveBeenCalled();
    });
  });

  describe('unbookmarkArticle', () => {
    test('should return the article with bookmarked false', async () => {
      // Given
      const requester = buildUserFixture({ id: 123 });
      const article = buildArticleFixture({ bookmarkedBy: [] });

      // When
      articleMock.findUnique.mockResolvedValue(article);
      articleMock.update.mockResolvedValue(article);

      // Then
      const result = await unbookmarkArticle(slug, requester.id);

      expect(result.bookmarked).toBe(false);
      expect(articleMock.update).toHaveBeenCalledWith({
        where: { slug },
        data: { bookmarkedBy: { disconnect: { id: requester.id } } },
        include: expect.objectContaining({
          bookmarkedBy: { select: { id: true } },
        }),
      });
    });

    test('should stay successful and unchanged when called twice without a bookmark', async () => {
      // Given
      const requester = buildUserFixture({ id: 123 });
      const article = buildArticleFixture({ bookmarkedBy: [] });

      // When
      articleMock.findUnique.mockResolvedValue(article);
      articleMock.update.mockResolvedValue(article);

      // Then
      const first = await unbookmarkArticle(slug, requester.id);
      const second = await unbookmarkArticle(slug, requester.id);

      expect(first.bookmarked).toBe(false);
      expect(second.bookmarked).toBe(false);
      expect(articleMock.update).toHaveBeenCalledTimes(2);
    });

    test('should not change the favorites of the article', async () => {
      // Given
      const requester = buildUserFixture({ id: 123 });
      const article = buildArticleFixture({
        favoritedBy: [{ id: requester.id }],
        bookmarkedBy: [],
      });

      // When
      articleMock.findUnique.mockResolvedValue(article);
      articleMock.update.mockResolvedValue(article);

      // Then
      const result = await unbookmarkArticle(slug, requester.id);

      expect(result.favorited).toBe(true);
      expect(result.favoritesCount).toBe(1);
    });

    test('should throw a 404 for an unknown slug', async () => {
      // Given
      articleMock.findUnique.mockResolvedValue(null);

      // When / Then
      await expect(unbookmarkArticle('unknown-slug', 123)).rejects.toMatchObject({
        errorCode: 404,
        message: { errors: { article: ['not found'] } },
      });
      expect(articleMock.update).not.toHaveBeenCalled();
    });
  });
});

describe('BookmarkService unexpected database errors', () => {
  const rawMessage =
    'PrismaClientKnownRequestError: Foreign key constraint failed on users.email realworld@me';
  const rawError = new Error(rawMessage);

  const run = (operation: 'bookmark' | 'unbookmark') =>
    operation === 'bookmark' ? bookmarkArticle(slug, 123) : unbookmarkArticle(slug, 123);

  test.each(['bookmark', 'unbookmark'] as const)(
    'should answer %s sanitized when the article lookup fails',
    async (operation) => {
      // Given
      articleMock.findUnique.mockRejectedValue(rawError);

      // When
      const error = await run(operation).catch((thrown) => thrown);

      // Then
      expect(error).toMatchObject({
        errorCode: 500,
        message: { errors: { article: ['could not be processed'] } },
      });
      expect(JSON.stringify(error.message)).not.toContain('Prisma');
      expect(JSON.stringify(error.message)).not.toContain('realworld@me');
    },
  );

  test.each(['bookmark', 'unbookmark'] as const)(
    'should answer %s sanitized when the article update fails',
    async (operation) => {
      // Given
      articleMock.findUnique.mockResolvedValue(buildArticleFixture());
      articleMock.update.mockRejectedValue(rawError);

      // When
      const error = await run(operation).catch((thrown) => thrown);

      // Then
      expect(error).toMatchObject({
        errorCode: 500,
        message: { errors: { article: ['could not be processed'] } },
      });
      expect(JSON.stringify(error.message)).not.toContain('Prisma');
      expect(JSON.stringify(error.message)).not.toContain('realworld@me');
    },
  );
});

describe('BookmarkController', () => {
  test.each(['post', 'delete'] as const)(
    'should guard %s /articles/:slug/bookmark with auth.required',
    (method) => {
      // Given
      const route = findRoute(method);

      // Then
      expect(route).toBeDefined();
      const handlers = getRoute(method).stack.map((layer) => layer.handle);
      expect(handlers).toContain(auth.required);
    },
  );

  test.each(['post', 'delete'] as const)(
    'should answer %s with the acting user id from the token, not from the request data',
    async (method) => {
      // Given
      const requester = buildUserFixture({ id: 123 });
      const article = buildArticleFixture({ bookmarkedBy: [{ id: requester.id }] });
      const handler = getRoute(method).stack[1].handle;
      const req = {
        params: { slug },
        auth: { user: { id: requester.id } },
        body: { userId: 999, article: { userId: 999 } },
        query: { userId: '999', username: 'SomeoneElse' },
      } as unknown as Request;
      const res = { json: jest.fn() } as unknown as Response;
      const next = jest.fn();

      // When
      articleMock.findUnique.mockResolvedValue(article);
      articleMock.update.mockResolvedValue(article);
      await handler(req, res, next);

      // Then
      expect(next).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ article: expect.any(Object) });
      expect(articleMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            bookmarkedBy: expect.objectContaining({
              [method === 'post' ? 'connect' : 'disconnect']: { id: requester.id },
            }),
          },
        }),
      );
    },
  );

  test('should pass a missing article to the error handler instead of answering it', async () => {
    // Given
    const handler = getRoute('post').stack[1].handle;
    const req = {
      params: { slug: 'unknown-slug' },
      auth: { user: { id: 123 } },
    } as unknown as Request;
    const res = { json: jest.fn() } as unknown as Response;
    const next = jest.fn();

    // When
    articleMock.findUnique.mockResolvedValue(null);
    await handler(req, res, next);

    // Then
    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(HttpException));
    expect(next.mock.calls[0][0]).toMatchObject({
      errorCode: 404,
      message: { errors: { article: ['not found'] } },
    });
  });

  test('should pass a sanitized error to the handler instead of raw prisma text', async () => {
    // Given
    const handler = getRoute('post').stack[1].handle;
    const req = {
      params: { slug },
      auth: { user: { id: 123 } },
    } as unknown as Request;
    const res = { json: jest.fn() } as unknown as Response;
    const next = jest.fn();

    // When
    articleMock.findUnique.mockRejectedValue(new Error('PrismaClient error for realworld@me'));
    await handler(req, res, next);

    // Then
    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(HttpException));
    const forwarded = next.mock.calls[0][0];
    expect(forwarded).toMatchObject({
      errorCode: 500,
      message: { errors: { article: ['could not be processed'] } },
    });
    expect(JSON.stringify(forwarded.message)).not.toContain('Prisma');
    expect(JSON.stringify(forwarded.message)).not.toContain('realworld@me');
  });
});
