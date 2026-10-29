import { NextFunction, Request, Response, Router } from 'express';
import auth from '../auth/auth';
import { bookmarkArticle, unbookmarkArticle } from './bookmark.service';

const router = Router();

/**
 * Bookmark article
 * @auth required
 * @route {POST} /articles/:slug/bookmark
 * @param slug slug of the article (based on the title)
 * @returns article bookmarked article
 */
router.post(
  '/articles/:slug/bookmark',
  auth.required,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const article = await bookmarkArticle(req.params.slug, req.auth?.user?.id);
      res.json({ article });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * Unbookmark article
 * @auth required
 * @route {DELETE} /articles/:slug/bookmark
 * @param slug slug of the article (based on the title)
 * @returns article unbookmarked article
 */
router.delete(
  '/articles/:slug/bookmark',
  auth.required,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const article = await unbookmarkArticle(req.params.slug, req.auth?.user?.id);
      res.json({ article });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
