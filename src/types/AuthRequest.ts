import { Request } from 'express';
import { UserRole } from '../entities/User';

export interface AuthRequest extends Request {
  userId?: string;
  role?:   UserRole;
}
