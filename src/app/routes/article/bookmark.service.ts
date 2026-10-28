import HttpException from '../../models/http-exception.model';
import { ArticleResponse } from './article.mapper';

export const bookmarkArticle = async (
  slug: string,
  userId: number,
): Promise<ArticleResponse> => {
  void slug;
  void userId;
  throw new HttpException(501, { errors: { article: ['not implemented'] } });
};

export const unbookmarkArticle = async (
  slug: string,
  userId: number,
): Promise<ArticleResponse> => {
  void slug;
  void userId;
  throw new HttpException(501, { errors: { article: ['not implemented'] } });
};
