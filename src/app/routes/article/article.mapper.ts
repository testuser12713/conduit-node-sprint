import authorMapper from './author.mapper';

const articleMapper = (article: any, id?: number) => ({
  slug: article.slug,
  title: article.title,
  description: article.description,
  body: article.body,
  tagList: article.tagList.map((tag: any) => tag.name),
  createdAt: article.createdAt,
  updatedAt: article.updatedAt,
  favorited: article.favoritedBy.some((item: any) => item.id === id),
  favoritesCount: article.favoritedBy.length,
  author: authorMapper(article.author, id),
  bookmarked: (article.bookmarkedBy ?? []).some(
    (entry: { userId: number }) => entry.userId === id,
  ),
});

export const articleBookmarkInclude = (id?: number) =>
  id === undefined
    ? {}
    : { bookmarkedBy: { where: { userId: id }, select: { userId: true } } };

export default articleMapper;
