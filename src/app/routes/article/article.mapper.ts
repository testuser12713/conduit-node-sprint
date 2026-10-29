import authorMapper from './author.mapper';
import { ArticleResponse } from './article.model';
import { calculateReadingTime } from './reading-time.utils';

interface ArticleMapperTag {
  name: string;
}

interface ArticleMapperFavorite {
  id?: number;
}

interface ArticleMapperFollowing {
  id?: number;
}

interface ArticleMapperAuthor {
  username: string;
  bio: string | null;
  image: string | null;
  followedBy: ArticleMapperFollowing[];
}

interface ArticleMapperInput {
  slug: string;
  title: string;
  description: string;
  body: string;
  tagList: ArticleMapperTag[];
  createdAt: Date;
  updatedAt: Date;
  favoritedBy: ArticleMapperFavorite[];
  author: ArticleMapperAuthor;
}

const articleMapper = (article: ArticleMapperInput, id?: number): ArticleResponse => ({
  slug: article.slug,
  title: article.title,
  description: article.description,
  body: article.body,
  tagList: article.tagList.map((tag: ArticleMapperTag) => tag.name),
  createdAt: article.createdAt,
  updatedAt: article.updatedAt,
  favorited: article.favoritedBy.some((item: ArticleMapperFavorite) => item.id === id),
  favoritesCount: article.favoritedBy.length,
  author: authorMapper(article.author, id),
  readingTime: calculateReadingTime(article.body),
});

export default articleMapper;
