import HttpException from '../../models/http-exception.model';
import { ArticleResponse } from './article.mapper';

export const getBookmarks = async (
  limit: string | undefined,
  offset: string | undefined,
  userId: number,
): Promise<{ articles: ArticleResponse[]; articlesCount: number }> => {
  void limit;
  void offset;
  void userId;
  throw new HttpException(501, { errors: { article: ['not implemented'] } });
};
