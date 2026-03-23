import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: error.errors.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }
  };
};
