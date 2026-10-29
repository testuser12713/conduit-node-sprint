import slugify from 'slugify';
import prisma from '../../../prisma/prisma-client';
import HttpException from '../../models/http-exception.model';
import profileMapper from '../profile/profile.utils';
import articleMapper, { articleBookmarkInclude } from './article.mapper';
import { Tag } from '../tag/tag.model';

const buildFindAllQuery = (query: any, id: number | undefined) => {
  const queries: any = [];
  const orAuthorQuery = [];
  const andAuthorQuery = [];

  orAuthorQuery.push({
    demo: {
      equals: true,
    },
  });

  if (id) {
    orAuthorQuery.push({
      id: {
        equals: id,
      },
    });
  }

  if ('author' in query) {
    andAuthorQuery.push({
      username: {
        equals: query.author,
      },
    });
  }

  const authorQuery = {
    author: {
      OR: orAuthorQuery,
      AND: andAuthorQuery,
    },
  };

  queries.push(authorQuery);

  if ('tag' in query) {
    queries.push({
      tagList: {
        some: {
          name: query.tag,
        },
      },
    });
  }

  if ('favorited' in query) {
    queries.push({
      favoritedBy: {
        some: {
          username: {
            equals: query.favorited,
          },
        },
      },
    });
  }

  return queries;
};

const buildArticleInclude = (id?: number) => ({
  ...articleBookmarkInclude(id),
  tagList: {
    select: {
      name: true,
    },
  },
  author: {
    select: {
      username: true,
      bio: true,
      image: true,
      followedBy: true,
    },
  },
  favoritedBy: true,
  _count: {
    select: {
      favoritedBy: true,
    },
  },
});

export const getArticles = async (query: any, id?: number) => {
  const andQueries = buildFindAllQuery(query, id);
  const articlesCount = await prisma.article.count({
    where: {
      AND: andQueries,
    },
  });

  const articles = await prisma.article.findMany({
    where: { AND: andQueries },
    orderBy: {
      createdAt: 'desc',
    },
    skip: Number(query.offset) || 0,
    take: Number(query.limit) || 10,
    include: buildArticleInclude(id),
  });

  return {
    articles: articles.map((article: any) => articleMapper(article, id)),
    articlesCount,
  };
};

export const getFeed = async (offset: number, limit: number, id: number) => {
  const articlesCount = await prisma.article.count({
    where: {
      author: {
        followedBy: { some: { id: id } },
      },
    },
  });

  const articles = await prisma.article.findMany({
    where: {
      author: {
        followedBy: { some: { id: id } },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    skip: offset || 0,
    take: limit || 10,
    include: buildArticleInclude(id),
  });

  return {
    articles: articles.map((article: any) => articleMapper(article, id)),
    articlesCount,
  };
};

export const createArticle = async (article: any, id: number) => {
  const { title, description, body, tagList } = article;
  const tags = Array.isArray(tagList) ? tagList : [];

  if (!title) {
    throw new HttpException(422, { errors: { title: ["can't be blank"] } });
  }

  if (!description) {
    throw new HttpException(422, { errors: { description: ["can't be blank"] } });
  }

  if (!body) {
    throw new HttpException(422, { errors: { body: ["can't be blank"] } });
  }

  const slug = `${slugify(title)}-${id}`;

  const existingTitle = await prisma.article.findUnique({
    where: {
      slug,
    },
    select: {
      slug: true,
    },
  });

  if (existingTitle) {
    throw new HttpException(422, { errors: { title: ['must be unique'] } });
  }

  const {
    authorId,
    id: articleId,
    ...createdArticle
  } = await prisma.article.create({
    data: {
      title,
      description,
      body,
      slug,
      tagList: {
        connectOrCreate: tags.map((tag: string) => ({
          create: { name: tag },
          where: { name: tag },
        })),
      },
      author: {
        connect: {
          id: id,
        },
      },
    },
    include: buildArticleInclude(id),
  });

  return articleMapper(createdArticle, id);
};

export const getArticle = async (slug: string, id?: number) => {
  const article = await prisma.article.findUnique({
    where: {
      slug,
    },
    include: buildArticleInclude(id),
  });

  if (!article) {
    throw new HttpException(404, { errors: { article: ['not found'] } });
  }

  return articleMapper(article, id);
};

const disconnectArticlesTags = async (slug: string) => {
  await prisma.article.update({
    where: {
      slug,
    },
    data: {
      tagList: {
        set: [],
      },
    },
  });
};

export const updateArticle = async (article: any, slug: string, id: number) => {
  let newSlug = null;

  const existingArticle = await await prisma.article.findFirst({
    where: {
      slug,
    },
    select: {
      author: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  if (!existingArticle) {
    throw new HttpException(404, {});
  }

  if (existingArticle.author.id !== id) {
    throw new HttpException(403, {
      message: 'You are not authorized to update this article',
    });
  }

  if (article.title) {
    newSlug = `${slugify(article.title)}-${id}`;

    if (newSlug !== slug) {
      const existingTitle = await prisma.article.findFirst({
        where: {
          slug: newSlug,
        },
        select: {
          slug: true,
        },
      });

      if (existingTitle) {
        throw new HttpException(422, { errors: { title: ['must be unique'] } });
      }
    }
  }

  const tagList =
    Array.isArray(article.tagList) && article.tagList?.length
      ? article.tagList.map((tag: string) => ({
          create: { name: tag },
          where: { name: tag },
        }))
      : [];

  await disconnectArticlesTags(slug);

  const updatedArticle = await prisma.article.update({
    where: {
      slug,
    },
    data: {
      ...(article.title ? { title: article.title } : {}),
      ...(article.body ? { body: article.body } : {}),
      ...(article.description ? { description: article.description } : {}),
      ...(newSlug ? { slug: newSlug } : {}),
      updatedAt: new Date(),
      tagList: {
        connectOrCreate: tagList,
      },
    },
    include: buildArticleInclude(id),
  });

  return articleMapper(updatedArticle, id);
};

export const deleteArticle = async (slug: string, id: number) => {
  const existingArticle = await await prisma.article.findFirst({
    where: {
      slug,
    },
    select: {
      author: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  if (!existingArticle) {
    throw new HttpException(404, {});
  }

  if (existingArticle.author.id !== id) {
    throw new HttpException(403, {
      message: 'You are not authorized to delete this article',
    });
  }
  await prisma.article.delete({
    where: {
      slug,
    },
  });
};

export const getCommentsByArticle = async (slug: string, id?: number) => {
  const queries = [];

  queries.push({
    author: {
      demo: true,
    },
  });

  if (id) {
    queries.push({
      author: {
        id,
      },
    });
  }

  const comments = await prisma.article.findUnique({
    where: {
      slug,
    },
    include: {
      comments: {
        where: {
          OR: queries,
        },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          body: true,
          author: {
            select: {
              username: true,
              bio: true,
              image: true,
              followedBy: true,
            },
          },
        },
      },
    },
  });

  const result = comments?.comments.map((comment: any) => ({
    ...comment,
    author: {
      username: comment.author.username,
      bio: comment.author.bio,
      image: comment.author.image,
      following: comment.author.followedBy.some((follow: any) => follow.id === id),
    },
  }));

  return result;
};

export const addComment = async (body: string, slug: string, id: number) => {
  if (!body) {
    throw new HttpException(422, { errors: { body: ["can't be blank"] } });
  }

  const article = await prisma.article.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
    },
  });

  const comment = await prisma.comment.create({
    data: {
      body,
      article: {
        connect: {
          id: article?.id,
        },
      },
      author: {
        connect: {
          id: id,
        },
      },
    },
    include: {
      author: {
        select: {
          username: true,
          bio: true,
          image: true,
          followedBy: true,
        },
      },
    },
  });

  return {
    id: comment.id,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    body: comment.body,
    author: {
      username: comment.author.username,
      bio: comment.author.bio,
      image: comment.author.image,
      following: comment.author.followedBy.some((follow: any) => follow.id === id),
    },
  };
};

export const deleteComment = async (id: number, userId: number) => {
  const comment = await prisma.comment.findFirst({
    where: {
      id,
      author: {
        id: userId,
      },
    },
    select: {
      author: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  if (!comment) {
    throw new HttpException(404, {});
  }

  if (comment.author.id !== userId) {
    throw new HttpException(403, {
      message: 'You are not authorized to delete this comment',
    });
  }

  await prisma.comment.delete({
    where: {
      id,
    },
  });
};

type FavoritedArticle = {
  tagList: { name: string }[];
  author: {
    username: string;
    bio: string | null;
    image: string | null;
    followedBy: { id: number }[];
  };
  favoritedBy: { id: number }[];
  bookmarkedBy?: { userId: number }[];
  _count?: { favoritedBy: number } | null;
  [key: string]: unknown;
};

const buildFavoritedArticle = (updatedArticle: FavoritedArticle, id: number) => {
  const { _count, bookmarkedBy, ...article } = updatedArticle;

  return {
    ...article,
    author: profileMapper(article.author, id),
    tagList: article?.tagList.map((tag: Tag) => tag.name),
    favorited: article.favoritedBy.some(
      (favorited: { id: number }) => favorited.id === id,
    ),
    favoritesCount: _count?.favoritedBy,
    bookmarked: (bookmarkedBy ?? []).some((entry) => entry.userId === id),
  };
};

export const favoriteArticle = async (slugPayload: string, id: number) => {
  const updatedArticle = await prisma.article.update({
    where: {
      slug: slugPayload,
    },
    data: {
      favoritedBy: {
        connect: {
          id: id,
        },
      },
    },
    include: buildArticleInclude(id),
  });

  return buildFavoritedArticle(updatedArticle as unknown as FavoritedArticle, id);
};

export const unfavoriteArticle = async (slugPayload: string, id: number) => {
  const updatedArticle = await prisma.article.update({
    where: {
      slug: slugPayload,
    },
    data: {
      favoritedBy: {
        disconnect: {
          id: id,
        },
      },
    },
    include: buildArticleInclude(id),
  });

  return buildFavoritedArticle(updatedArticle as unknown as FavoritedArticle, id);
};

type BookmarkedArticle = {
  id: number;
  bookmarkedBy?: { userId: number }[];
  [key: string]: unknown;
};

const findArticleForBookmark = async (slug: string, userId: number) => {
  const article = await prisma.article.findUnique({
    where: {
      slug,
    },
    include: buildArticleInclude(userId),
  });

  if (!article) {
    throw new HttpException(404, { errors: { article: ['not found'] } });
  }

  return article as unknown as BookmarkedArticle;
};

const isBookmarked = (
  article: { bookmarkedBy?: { userId: number }[] },
  userId: number,
) => (article.bookmarkedBy ?? []).some((entry) => entry.userId === userId);

export const addBookmark = async (slug: string, userId: number) => {
  const article = await findArticleForBookmark(slug, userId);

  if (!isBookmarked(article, userId)) {
    await prisma.userBookmarks.create({
      data: {
        userId,
        articleId: article.id,
      },
    });

    const bookmarkedArticle = await findArticleForBookmark(slug, userId);

    return articleMapper(bookmarkedArticle, userId);
  }

  return articleMapper(article, userId);
};

type BookmarkedArticlesQuery = {
  offset?: unknown;
  limit?: unknown;
};

export const getBookmarkedArticles = async (
  userId: number,
  query: BookmarkedArticlesQuery,
) => {
  try {
    const bookmarks = await prisma.userBookmarks.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: Number(query.offset) || 0,
      take: Number(query.limit) || 10,
      include: {
        article: {
          include: {
            tagList: { select: { name: true } },
            author: {
              select: {
                username: true,
                bio: true,
                image: true,
                followedBy: true,
              },
            },
            favoritedBy: true,
            _count: { select: { favoritedBy: true } },
            ...articleBookmarkInclude(userId),
          },
        },
      },
    });

    const articlesCount = await prisma.userBookmarks.count({ where: { userId } });

    return {
      articles: bookmarks.map((row) => articleMapper(row.article, userId)),
      articlesCount,
    };
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new HttpException(500, { errors: { body: ['could not load bookmarks'] } });
  }
};

export const removeBookmark = async (slug: string, userId: number) => {
  const article = await findArticleForBookmark(slug, userId);

  if (isBookmarked(article, userId)) {
    await prisma.userBookmarks.delete({
      where: {
        userId_articleId: {
          userId,
          articleId: article.id,
        },
      },
    });

    const unbookmarkedArticle = await findArticleForBookmark(slug, userId);

    return articleMapper(unbookmarkedArticle, userId);
  }

  return articleMapper(article, userId);
};
