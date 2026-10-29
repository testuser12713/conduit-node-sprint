import prisma from '../../../prisma/prisma-client';
import HttpException from '../../models/http-exception.model';
import articleMapper from './article.mapper';

const articleInclude = {
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
};

interface BookmarkUser {
  id: number;
}

const findArticle = async (slug: string) => {
  const article = await prisma.article.findUnique({
    where: {
      slug,
    },
    include: articleInclude,
  });

  if (!article) {
    throw new HttpException(404, { errors: { article: ['not found'] } });
  }

  return article;
};

const isBookmarkedBy = (
  bookmarkedBy: BookmarkUser[] | null | undefined,
  id: number
) => (bookmarkedBy ?? []).some((user: BookmarkUser) => user.id === id);

export const bookmarkArticle = async (slug: string, id: number) => {
  const article = await findArticle(slug);

  if (isBookmarkedBy(article.bookmarkedBy, id)) {
    return articleMapper(article, id);
  }

  const updatedArticle = await prisma.article.update({
    where: {
      slug,
    },
    data: {
      bookmarkedBy: {
        connect: {
          id: id,
        },
      },
    },
    include: articleInclude,
  });

  return articleMapper(updatedArticle, id);
};

export const unbookmarkArticle = async (slug: string, id: number) => {
  const article = await findArticle(slug);

  if (!isBookmarkedBy(article.bookmarkedBy, id)) {
    return articleMapper(article, id);
  }

  const updatedArticle = await prisma.article.update({
    where: {
      slug,
    },
    data: {
      bookmarkedBy: {
        disconnect: {
          id: id,
        },
      },
    },
    include: articleInclude,
  });

  return articleMapper(updatedArticle, id);
};
