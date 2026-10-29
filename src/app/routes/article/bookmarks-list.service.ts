import prisma from '../../../prisma/prisma-client';
import HttpException from '../../models/http-exception.model';
import articleMapper from './article.mapper';

const bookmarkedArticleInclude = {
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
  bookmarkedBy: true,
  _count: {
    select: {
      favoritedBy: true,
    },
  },
};

const parsePaginationValue = (
  value: unknown,
  field: 'limit' | 'offset',
  fallback: number,
): number => {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value;
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value);
  }

  throw new HttpException(400, { errors: { [field]: ['must be a number'] } });
};

export const getBookmarkedArticles = async (query: Record<string, unknown>, id: number) => {
  const limit = Math.min(parsePaginationValue(query?.limit, 'limit', 10), 100);
  const offset = parsePaginationValue(query?.offset, 'offset', 0);
  const where = { bookmarkedBy: { some: { id } } };

  const articlesCount = await prisma.article.count({ where });

  const articles = await prisma.article.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
    skip: offset,
    take: limit,
    include: bookmarkedArticleInclude,
  });

  return {
    articles: articles.map((article) => articleMapper(article, id)),
    articlesCount,
  };
};
