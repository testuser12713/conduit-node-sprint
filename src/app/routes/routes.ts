import { Router } from 'express';
import tagsController from './tag/tag.controller';
import bookmarksListController from './article/bookmarks-list.controller';
import bookmarkController from './article/bookmark.controller';
import articlesController from './article/article.controller';
import authController from './auth/auth.controller';
import profileController from './profile/profile.controller';

const api = Router()
  .use(tagsController)
  .use(bookmarksListController)
  .use(bookmarkController)
  .use(articlesController)
  .use(profileController)
  .use(authController);

export default Router().use('/api', api);
