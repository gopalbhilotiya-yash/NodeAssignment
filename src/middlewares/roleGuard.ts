import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/AuthRequest';
import { UserRole } from '../entities/User';
import { ForbiddenError } from '../errors/AppError';

export const roleGuard = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.role || !allowedRoles.includes(req.role)) {
      return next(new ForbiddenError('You do not have permission to perform this action'));
    }
    next();
  };
};
