import prismaMock from '../prisma-mock';
import articleMapper from '../../app/routes/article/article.mapper';
import calculateReadingTime from '../../app/routes/article/article.utils';
import {
  favoriteArticle,
  unfavoriteArticle,
} from '../../app/routes/article/article.service';

const buildArticle = (body: string) => ({
  slug: 'how-to-train-your-dragon',
  title: 'How to train your dragon',
  description: 'Ever wonder how?',
  body,
  tagList: [{ name: 'training' }, { name: 'dragons' }],
  createdAt: new Date('2021-01-01T00:00:00.000Z'),
  updatedAt: new Date('2021-01-02T00:00:00.000Z'),
  favoritedBy: [],
  author: {
    username: 'RealWorld',
    bio: null,
    image: null,
    followedBy: [],
  },
});

const buildFavoriteRecord = (body: string) => ({
  id: 123,
  slug: 'how-to-train-your-dragon',
  title: 'How to train your dragon',
  description: 'Ever wonder how?',
  body,
  createdAt: new Date('2021-01-01T00:00:00.000Z'),
  updatedAt: new Date('2021-01-02T00:00:00.000Z'),
  authorId: 456,
  tagList: [{ name: 'training' }, { name: 'dragons' }],
  favoritedBy: [],
  author: {
    username: 'RealWorld',
    bio: null,
    image: null,
    followedBy: [],
  },
  _count: { favoritedBy: 0 },
});

describe('articleMapper', () => {
  it('adds a readingTime matching the shared helper', () => {
    const body = Array.from({ length: 450 }, () => 'word').join(' ');

    const result = articleMapper(buildArticle(body));

    expect(result.readingTime).toBe(calculateReadingTime(body));
    expect(result.readingTime).toBe(3);
    expect(Number.isInteger(result.readingTime)).toBe(true);
  });

  it('keeps readingTime at least 1 for an empty body', () => {
    const result = articleMapper(buildArticle(''));

    expect(result.readingTime).toBe(1);
  });

  it('keeps every pre-existing mapped field', () => {
    const result = articleMapper(buildArticle('hello world'), 42);

    expect(result.slug).toBe('how-to-train-your-dragon');
    expect(result.title).toBe('How to train your dragon');
    expect(result.description).toBe('Ever wonder how?');
    expect(result.body).toBe('hello world');
    expect(result.tagList).toEqual(['training', 'dragons']);
    expect(result.favorited).toBe(false);
    expect(result.favoritesCount).toBe(0);
    expect(result.author.username).toBe('RealWorld');
  });
});

describe('favorite responses', () => {
  const body = Array.from({ length: 450 }, () => 'word').join(' ');

  beforeEach(() => {
    const client = prismaMock as unknown as {
      article: { update: { mockResolvedValue: (value: unknown) => void } };
    };
    client.article.update.mockResolvedValue(buildFavoriteRecord(body));
  });

  it('adds readingTime to the favorite response', async () => {
    const result = await favoriteArticle('how-to-train-your-dragon', 42);

    expect(result.readingTime).toBe(calculateReadingTime(body));
  });

  it('adds readingTime to the unfavorite response', async () => {
    const result = await unfavoriteArticle('how-to-train-your-dragon', 42);

    expect(result.readingTime).toBe(calculateReadingTime(body));
  });
});
