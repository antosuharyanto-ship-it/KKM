import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

/**
 * Validation middleware factory
 * Validates request params, query, or body against a Zod schema
 */
export const validate = (schema: z.ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = req[source];
            const validated = await schema.parseAsync(data);

            // Replace request data with validated data
            req[source] = validated;

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.issues.map((issue) => ({
                        field: issue.path.join('.'),
                        message: issue.message,
                    })),
                });
            }

            // Pass other errors to error handler
            next(error);
        }
    };
};

/**
 * Helper to get validated UUID from params
 * Returns the UUID as a string (already validated)
 */
export const getValidatedId = (req: Request, paramName: string = 'id'): string => {
    return req.params[paramName] as string;
};
