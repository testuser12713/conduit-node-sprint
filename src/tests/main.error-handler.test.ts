/**
 * The error handler lives in the API entry point, which also applies the
 * migrations and binds the port when it is loaded. Both are stubbed here so the
 * handler can be exercised without touching a database or opening a port.
 */
jest.mock('child_process', () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test/test';
  return {
    ...jest.requireActual('child_process'),
    spawnSync: jest.fn(() => ({ status: 0 })),
  };
});

jest.mock('express', () => {
  const chainable = () => {
    const proxy = new Proxy(
      function () {
        return proxy;
      } as (...args: unknown[]) => unknown,
      {
        get: () => jest.fn(() => proxy),
        apply: () => proxy,
      },
    );
    return proxy;
  };
  const express = chainable();
  return { __esModule: true, default: express, Router: express };
});

import HttpException from '../app/models/http-exception.model';
import { errorHandler } from '../main';

const createResponse = () => {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
};

const handle = (err: Error | HttpException) => {
  const res = createResponse();
  errorHandler(err, {} as never, res as never, jest.fn());
  return res;
};

describe('generic error handler', () => {
  it('answers an unexpected failure with a fixed generic message, never the raw error', () => {
    const err = new Error(
      'PrismaClientKnownRequestError: Invalid value for DATABASE_URL for user eve@example.com',
    );

    const res = handle(err);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      errors: { body: ['internal server error'] },
    });
    const body = JSON.stringify(res.json.mock.calls[0][0]);
    expect(body).not.toContain('Prisma');
    expect(body).not.toContain('eve@example.com');
    expect(body).not.toContain('Invalid value');
  });

  it('answers an HttpException exactly as before', () => {
    const message = { errors: { article: ['not found'] } };

    const res = handle(new HttpException(404, message));

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(message);
  });

  it('keeps an HttpException 500 body untouched instead of replacing it', () => {
    const message = { errors: { article: ['could not be processed'] } };

    const res = handle(new HttpException(500, message));

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(message);
  });

  it('keeps the existing unauthorized answer', () => {
    const err = Object.assign(new Error('jwt malformed'), { name: 'UnauthorizedError' });

    const res = handle(err);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'missing authorization credentials',
    });
  });
});
