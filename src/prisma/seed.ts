import {
  randEmail,
  randFullName,
  randLines,
  randParagraph,
  randPassword, randPhrase,
  randWord
} from '@ngneat/falso';
import { PrismaClient } from '@prisma/client';
import { RegisteredUser } from '../app/routes/auth/registered-user.model';
import { createUser } from '../app/routes/auth/auth.service';
import { addComment, createArticle } from '../app/routes/article/article.service';

const prisma = new PrismaClient();

export const generateUser = async (): Promise<RegisteredUser> =>
  createUser({
    username: randFullName(),
    email: randEmail(),
    password: randPassword(),
    image: 'https://api.realworld.io/images/demo-avatar.png',
    demo: true,
  });

export const generateArticle = async (id: number) =>
  createArticle(
    {
      title: randPhrase(),
      description: randParagraph(),
      body: randLines({ length: 10 }).join(' '),
      tagList: randWord({ length: 4 }),
    },
    id,
  );

export const generateComment = async (id: number, slug: string) =>
  addComment(randParagraph(), slug, id);

const pickBookmarks = (articles: { slug: string }[]) => {
  const shuffled = [...articles].sort(() => Math.random() - 0.5);
  const count = 2 + Math.floor(Math.random() * 3);

  return shuffled.slice(0, count).map(article => ({ slug: article.slug }));
};

const main = async () => {
  try {
    const users = await Promise.all(Array.from({length: 12}, () => generateUser()));
    users?.map(user => user);

    const allArticles: Awaited<ReturnType<typeof generateArticle>>[] = [];

    // eslint-disable-next-line no-restricted-syntax
    for await (const user of users) {
      const articles: Awaited<ReturnType<typeof generateArticle>>[] = [];

      for (let index = 0; index < 12; index += 1) {
        articles.push(await generateArticle(user.id));
      }

      allArticles.push(...articles);

      // eslint-disable-next-line no-restricted-syntax
      for await (const article of articles) {
        await Promise.all(users.map(userItem => generateComment(userItem.id, article.slug)));
      }
    }

    await Promise.all(
      users.map(user =>
        prisma.user.update({
          where: { id: user.id },
          data: {
            bookmarkedArticles: {
              connect: pickBookmarks(allArticles),
            },
          },
        }),
      ),
    );
  } catch (e) {
    console.error(e);

  }
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async () => {
    await prisma.$disconnect();
    process.exit(1);
  });
