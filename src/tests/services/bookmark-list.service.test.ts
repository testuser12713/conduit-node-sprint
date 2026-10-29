import { NextFunction, Request, Response } from 'express';
import prismaMock, {
  ArticleFixture,
  buildArticleFixture,
  buildUserFixture,
} from '../prisma-mock';
import auth from '../../app/routes/auth/auth';
import articlesController from '../../app/routes/article/article.controller';
import { getBookmarkedArticles } from '../../app/routes/article/article.service';

const articleMock = prismaMock.article as unknown as {
  findMany: jest.Mock;
  count: jest.Mock;
};

interface BookmarkWhere {
  bookmarkedBy: {
    some: {
      id: number;
    };
  };
}

interface FindManyArgs {
  where: BookmarkWhere;
  orderBy?: { createdAt?: 'asc' | 'desc' };
  skip?: number;
  take?: number;
}

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

const routerStack = (articlesController as unknown as { stack: RouteLayer[] }).stack;

const findGetRouteIndex = (path: string) =>
  routerStack.findIndex(
    (layer) => layer.route?.path === path && layer.route?.methods?.get === true,
  );

const getGetRoute = (path: string): RouteLayer => {
  const route = routerStack[findGetRouteIndex(path)]?.route;
  if (!route) {
    throw new Error(`route not registered: GET ${path}`);
  }
  return { route };
};

const isBookmarkedBy = (article: ArticleFixture, where: BookmarkWhere) =>
  article.bookmarkedBy.some((bookmark) => bookmark.id === where.bookmarkedBy.some.id);

const installArticleStore = (fixtures: ArticleFixture[]) => {
  articleMock.count.mockImplementation(({ where }: { where: BookmarkWhere }) =>
    Promise.resolve(fixtures.filter((article) => isBookmarkedBy(article, where)).length),
  );

  articleMock.findMany.mockImplementation(({ where, skip, take }: FindManyArgs) => {
    const rows = fixtures
      .filter((article) => isBookmarkedBy(article, where))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const start = skip ?? 0;
    const end = start + (take ?? 20);
    return Promise.resolve(rows.slice(start, end));
  });
};

const requester = buildUserFixture({ id: 123 });
const anotherUser = buildUserFixture({ id: 999, username: 'SomeoneElse' });

const articleA = buildArticleFixture({
  id: 1,
  slug: 'article-a',
  title: 'Article A',
  createdAt: new Date('2024-03-03T00:00:00.000Z'),
  updatedAt: new Date('2024-03-03T00:00:00.000Z'),
  tagList: [{ name: 'dragons' }],
  bookmarkedBy: [{ id: requester.id }],
});

const articleB = buildArticleFixture({
  id: 2,
  slug: 'article-b',
  title: 'Article B',
  createdAt: new Date('2024-03-02T00:00:00.000Z'),
  updatedAt: new Date('2024-03-02T00:00:00.000Z'),
  bookmarkedBy: [{ id: requester.id }, { id: anotherUser.id }],
});

const articleOfAnotherUser = buildArticleFixture({
  id: 3,
  slug: 'article-of-another-user',
  title: 'Article of another user',
  createdAt: new Date('2024-03-01T00:00:00.000Z'),
  updatedAt: new Date('2024-03-01T00:00:00.000Z'),
  bookmarkedBy: [{ id: anotherUser.id }],
});

describe('BookmarkListService', () => {
  describe('getBookmarkedArticles', () => {
    test('should only list the bookmarks of the caller', async () => {
      // Given
      installArticleStore([articleA, articleB, articleOfAnotherUser]);

      // When
      const result = await getBookmarkedArticles(undefined, undefined, requester.id);

      // Then
      expect(result.articles.map((article) => article.slug)).toEqual([
        articleA.slug,
        articleB.slug,
      ]);
      expect(result.articles.map((article) => article.slug)).not.toContain(
        articleOfAnotherUser.slug,
      );
      expect(result.articlesCount).toBe(2);
      expect(articleMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { bookmarkedBy: { some: { id: requester.id } } },
        }),
      );
    });

    test('should default to limit 20 and offset 0', async () => {
      // Given
      installArticleStore([articleA, articleB]);

      // When
      await getBookmarkedArticles(undefined, undefined, requester.id);

      // Then
      expect(articleMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: 20,
        }),
      );
    });

    test('should apply an explicit limit and offset', async () => {
      // Given
      installArticleStore([articleA, articleB]);

      // When
      const result = await getBookmarkedArticles(1, 1, requester.id);

      // Then
      expect(articleMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 1,
          take: 1,
        }),
      );
      expect(result.articles.map((article) => article.slug)).toEqual([articleB.slug]);
    });

    test('should report the total number of bookmarks independent of the page size', async () => {
      // Given
      installArticleStore([articleA, articleB]);

      // When
      const result = await getBookmarkedArticles(1, 0, requester.id);

      // Then
      expect(result.articles).toHaveLength(1);
      expect(result.articlesCount).toBe(2);
      expect(articleMock.count).toHaveBeenCalledWith({
        where: { bookmarkedBy: { some: { id: requester.id } } },
      });
    });

    test('should order the bookmarked articles by createdAt descending', async () => {
      // Given
      installArticleStore([articleOfAnotherUser, articleB, articleA]);

      // When
      const result = await getBookmarkedArticles(undefined, undefined, requester.id);

      // Then
      expect(result.articles.map((article) => article.createdAt)).toEqual([
        articleA.createdAt,
        articleB.createdAt,
      ]);
    });

    test('should mark every listed article as bookmarked with author and tagList intact', async () => {
      // Given
      installArticleStore([articleA]);

      // When
      const result = await getBookmarkedArticles(undefined, undefined, requester.id);

      // Then
      expect(result.articles[0]).toMatchObject({
        slug: articleA.slug,
        bookmarked: true,
        tagList: ['dragons'],
        author: { username: articleA.author.username, following: false },
      });
    });

    test('should drop an article that was deleted together with its bookmark rows', async () => {
      // Given
      installArticleStore([articleA, articleB]);
      const beforeDelete = await getBookmarkedArticles(undefined, undefined, requester.id);
      expect(beforeDelete.articles.map((article) => article.slug)).toContain(articleA.slug);

      // When the article and its bookmark rows are gone from the store
      installArticleStore([articleB]);
      const afterDelete = await getBookmarkedArticles(undefined, undefined, requester.id);

      // Then
      expect(afterDelete.articles.map((article) => article.slug)).toEqual([articleB.slug]);
      expect(afterDelete.articlesCount).toBe(1);
    });
  });
});

describe('BookmarkListController', () => {
  test('should register GET /articles/bookmarks before GET /articles/:slug', () => {
    // Given
    const bookmarksIndex = findGetRouteIndex('/articles/bookmarks');
    const slugIndex = findGetRouteIndex('/articles/:slug');

    // Then
    expect(bookmarksIndex).toBeGreaterThanOrEqual(0);
    expect(slugIndex).toBeGreaterThanOrEqual(0);
    expect(bookmarksIndex).toBeLessThan(slugIndex);
  });

  test('should guard GET /articles/bookmarks with auth.required', () => {
    // Given
    const route = getGetRoute('/articles/bookmarks');

    // Then
    expect(route.route?.stack.map((layer) => layer.handle)).toContain(auth.required);
  });

  test('should take the caller id from the token and ignore ids from query and body', async () => {
    // Given
    installArticleStore([articleA]);
    const handler = getGetRoute('/articles/bookmarks').route?.stack[1].handle;
    const req = {
      query: { userId: '999', username: 'SomeoneElse', limit: '20', offset: '0' },
      body: { userId: 999 },
      auth: { user: { id: requester.id } },
    } as unknown as Request;
    const res = { json: jest.fn() } as unknown as Response;
    const next = jest.fn();

    // When
    await handler?.(req, res, next);

    // Then
    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      articles: [expect.objectContaining({ slug: articleA.slug, bookmarked: true })],
      articlesCount: 1,
    });
    expect(articleMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { bookmarkedBy: { some: { id: requester.id } } },
      }),
    );
  });

  test('should pass an error to the error handler instead of answering it', async () => {
    // Given
    const handler = getGetRoute('/articles/bookmarks').route?.stack[1].handle;
    const req = {
      query: {},
      auth: { user: { id: requester.id } },
    } as unknown as Request;
    const res = { json: jest.fn() } as unknown as Response;
    const next = jest.fn();

    // When
    articleMock.count.mockRejectedValue(new Error('database unavailable'));
    await handler?.(req, res, next);

    // Then
    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
