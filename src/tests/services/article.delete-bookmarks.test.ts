import prismaMock from '../prisma-mock';
import { deleteArticle } from '../../app/routes/article/article.service';
import HttpException from '../../app/models/http-exception.model';

const slug = 'how-to-train-your-dragon';
const authorId = 456;

const articleMock = prismaMock.article as unknown as {
  findFirst: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};

const findFirstMock = articleMock.findFirst;
const updateMock = articleMock.update;
const deleteMock = articleMock.delete;

const existingArticle = (author = authorId) => ({
  author: {
    id: author,
    username: 'RealWorld',
  },
});

describe('ArticleService deleteArticle bookmarks', () => {
  test('clears the bookmarkedBy relation before deleting the article', async () => {
    findFirstMock.mockResolvedValue(existingArticle());
    updateMock.mockResolvedValue({});
    deleteMock.mockResolvedValue({});

    await deleteArticle(slug, authorId);

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith({
      where: { slug },
      data: { bookmarkedBy: { set: [] } },
    });
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(deleteMock).toHaveBeenCalledWith({ where: { slug } });
    expect(updateMock.mock.invocationCallOrder[0]).toBeLessThan(
      deleteMock.mock.invocationCallOrder[0]
    );
  });

  test('throws a 404 for an unknown slug without touching bookmarks', async () => {
    findFirstMock.mockResolvedValue(null);

    const error = await deleteArticle('unknown-slug', authorId).catch((e) => e);

    expect(error).toBeInstanceOf(HttpException);
    expect(error).toMatchObject({ errorCode: 404 });
    expect(updateMock).not.toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
  });

  test('throws a 403 for a non-author without disconnecting bookmarks', async () => {
    findFirstMock.mockResolvedValue(existingArticle(authorId));

    const error = await deleteArticle(slug, authorId + 1).catch((e) => e);

    expect(error).toBeInstanceOf(HttpException);
    expect(error).toMatchObject({ errorCode: 403 });
    expect(updateMock).not.toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
