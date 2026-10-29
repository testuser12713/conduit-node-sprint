import { Comment } from './comment.model';

export interface Article {
  id: number;
  title: string;
  slug: string;
  description: string;
  readingTime: number;
  comments: Comment[];
  favorited: boolean;
}
