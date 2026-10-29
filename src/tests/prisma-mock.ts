import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

import prisma from '../prisma/prisma-client';
import { PrismaClient } from '@prisma/client';

jest.mock('../prisma/prisma-client', () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>(),
}));

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prismaMock);
});

export interface UserFixture {
  id: number;
  username: string;
  email: string;
  password: string;
  bio: string | null;
  image: string | null;
  token: string;
  demo: boolean;
}

export const buildUserFixture = (overrides: Partial<UserFixture> = {}): UserFixture => ({
  id: 123,
  username: 'RealWorld',
  email: 'realworld@me',
  password: '1234',
  bio: null,
  image: null,
  token: '',
  demo: false,
  ...overrides,
});

export interface ArticleFixture {
  id: number;
  slug: string;
  title: string;
  description: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  authorId: number;
  tagList: { name: string }[];
  favoritedBy: { id: number }[];
  bookmarkedBy: { id: number }[];
  author: {
    username: string;
    bio: string | null;
    image: string | null;
    followedBy: { id: number }[];
  };
}

export const buildArticleFixture = (overrides: Partial<ArticleFixture> = {}): ArticleFixture => ({
  id: 1,
  slug: 'how-to-train-your-dragon',
  title: 'How to train your dragon',
  description: '',
  body: '',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  authorId: 456,
  tagList: [],
  favoritedBy: [],
  bookmarkedBy: [],
  author: {
    username: 'RealWorld',
    bio: null,
    image: null,
    followedBy: [],
  },
  ...overrides,
});

export default prismaMock;
