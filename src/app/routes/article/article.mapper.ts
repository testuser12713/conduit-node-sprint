import authorMapper from './author.mapper';

interface ArticleAuthorInput {
  username: string;
  bio: string | null;
  image: string | null;
  followedBy: { id: number }[];
}

interface ArticleMapperInput {
  slug: string;
  title: string;
  description: string;
  body: string;
  tagList: { name: string }[];
  createdAt: Date;
  updatedAt: Date;
  favoritedBy: { id: number }[];
  bookmarkedBy?: { id: number }[];
  author: ArticleAuthorInput;
}

export interface ArticleAuthorResponse {
  username: string;
  bio: string | null;
  image: string | null;
  following: boolean;
}

export interface ArticleResponse {
  slug: string;
  title: string;
  description: string;
  body: string;
  tagList: string[];
  createdAt: Date;
  updatedAt: Date;
  favorited: boolean;
  favoritesCount: number;
  bookmarked: boolean;
  author: ArticleAuthorResponse;
}

const articleMapper = (article: ArticleMapperInput, id?: number): ArticleResponse => ({
  slug: article.slug,
  title: article.title,
  description: article.description,
  body: article.body,
  tagList: article.tagList.map((tag) => tag.name),
  createdAt: article.createdAt,
  updatedAt: article.updatedAt,
  favorited: article.favoritedBy.some((item) => item.id === id),
  favoritesCount: article.favoritedBy.length,
  bookmarked: article.bookmarkedBy?.some((item) => item.id === id) ?? false,
  author: authorMapper(article.author, id),
});

export default articleMapper;
