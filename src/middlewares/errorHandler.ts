import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import logger from '../config/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) => {
  // Known operational error (our custom AppError)
  if (err instanceof AppError) {
    logger.warn(`[AppError] ${err.message}`, {
      statusCode: err.statusCode,
      path: req.originalUrl,
      method: req.method,
    });

    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Unknown / programmer error — log full stack
  logger.error(`[UnhandledError] ${err.message}`, {
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};
