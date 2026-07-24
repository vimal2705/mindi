import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodSchema } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: error.errors.map((e) => e.message).join(', '),
        });
        return;
      }
      next(error);
    }
  };
}

export function validateSocket<T>(schema: ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}
