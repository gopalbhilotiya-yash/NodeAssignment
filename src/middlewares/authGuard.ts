import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../errors/AppError';
import { AuthRequest } from '../types/AuthRequest';
import { UserRole } from '../entities/User';

export const authGuard = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) return next(new UnauthorizedError('Access token is required'));

    const decoded    = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; role: UserRole };
    req.userId = decoded.userId;
    req.role   = decoded.role;
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired access token'));
  }
};
