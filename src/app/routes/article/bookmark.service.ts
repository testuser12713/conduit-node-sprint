import prisma from '../../../prisma/prisma-client';
import HttpException from '../../models/http-exception.model';
import articleMapper from './article.mapper';

const bookmarkInclude = {
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
  bookmarkedBy: {
    select: {
      id: true,
    },
  },
  _count: {
    select: {
      favoritedBy: true,
    },
  },
} as const;

const updateBookmark = async (slug: string, id: number, connect: boolean) => {
  const existingArticle = await prisma.article.findUnique({
    where: {
      slug,
    },
  });

  if (!existingArticle) {
    throw new HttpException(404, { errors: { article: ['not found'] } });
  }

  const article = await prisma.article.update({
    where: {
      slug,
    },
    data: {
      bookmarkedBy: connect
        ? {
            connect: {
              id,
            },
          }
        : {
            disconnect: {
              id,
            },
          },
    },
    include: bookmarkInclude,
  });

  return articleMapper(article, id);
};

export const bookmarkArticle = async (slug: string, id: number) =>
  updateBookmark(slug, id, true);

export const unbookmarkArticle = async (slug: string, id: number) =>
  updateBookmark(slug, id, false);
