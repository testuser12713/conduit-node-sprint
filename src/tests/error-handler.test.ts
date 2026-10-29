import { NextFunction, Request, Response } from 'express';
import errorHandler from '../app/middleware/error-handler';
import HttpException from '../app/models/http-exception.model';

const createResponse = () => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res as unknown as Response;
};

describe('errorHandler', () => {
  const req = {} as Request;
  const next = jest.fn() as unknown as NextFunction;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('answers an HttpException with its status and body', () => {
    const res = createResponse();
    const body = { errors: { article: ['not found'] } };

    errorHandler(new HttpException(404, body), req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(body);
  });

  it('answers an UnauthorizedError with 401', () => {
    const res = createResponse();
    const unauthorized = Object.assign(new Error('unauthorized'), {
      name: 'UnauthorizedError',
    });

    errorHandler(unauthorized, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'missing authorization credentials',
    });
  });

  it('answers a generic error with only the generic 500 body', () => {
    const res = createResponse();

    errorHandler(new Error('boom: secret internals'), req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      errors: { body: ['internal server error'] },
    });
    const payload = JSON.stringify((res.json as jest.Mock).mock.calls[0][0]);
    expect(payload).not.toContain('boom');
  });

  it('answers a Prisma-like error without leaking its details', () => {
    const res = createResponse();
    const prismaError = {
      code: 'P2025',
      message: 'Invalid `prisma.article.findUnique()` invocation: SELECT ... SQL ...',
    };

    errorHandler(prismaError as unknown as Error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      errors: { body: ['internal server error'] },
    });
    const payload = JSON.stringify((res.json as jest.Mock).mock.calls[0][0]);
    expect(payload).not.toContain('P2025');
    expect(payload).not.toContain('SQL');
    expect(payload).not.toContain('prisma');
  });
});
