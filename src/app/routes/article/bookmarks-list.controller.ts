import { NextFunction, Request, Response, Router } from 'express';
import auth from '../auth/auth';
import HttpException from '../../models/http-exception.model';
import { getBookmarkedArticles } from './bookmarks-list.service';

// Carries GET /articles/bookmarks.
const router = Router();

/**
 * Get paginated bookmarked articles
 * @auth required
 * @route {GET} /articles/bookmarks
 * @queryparam offset number of bookmarks dismissed from the first one
 * @queryparam limit number of bookmarks returned
 * @returns articles: list of the caller's bookmarked articles
 * @returns articlesCount: total number of the caller's bookmarks
 */
router.get(
  '/articles/bookmarks',
  auth.required,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await getBookmarkedArticles(req.query, req.auth?.user?.id as number);
      res.json(result);
    } catch (error) {
      next(
        error instanceof HttpException
          ? error
          : new HttpException(500, { errors: { article: ['internal server error'] } }),
      );
    }
  },
);

export default router;
