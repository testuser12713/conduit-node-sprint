import { NextFunction, Request, Response } from 'express';
import HttpException from '../models/http-exception.model';

const errorHandler = (
  err: Error | HttpException,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err && err.name === 'UnauthorizedError') {
    res.status(401).json({
      status: 'error',
      message: 'missing authorization credentials',
    });
    return;
  }

  const httpException = err as HttpException;
  if (err && httpException.errorCode) {
    res.status(httpException.errorCode).json(httpException.message);
    return;
  }

  res.status(500).json({ errors: { body: ['internal server error'] } });
};

export default errorHandler;
