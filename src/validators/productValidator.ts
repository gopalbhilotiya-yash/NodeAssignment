import { z } from 'zod';

export const createProductSchema = z.object({
  name:        z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price:       z.number().positive('Price must be a positive number'),
  stock:       z.number().int().min(0, 'Stock cannot be negative'),
  category:    z.string().min(2, 'Category must be at least 2 characters'),
  imageUrl:    z.string().url('Invalid image URL').optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const paginationSchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(10),
  sortBy:   z.enum(['name', 'price', 'stock', 'createdAt']).default('createdAt'),
  order:    z.enum(['ASC', 'DESC']).default('DESC'),
});

export const searchSchema = paginationSchema.extend({
  q:        z.string().min(1, 'Search query is required'),
  category: z.string().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
});

export const exportSchema = z.object({
  format:   z.enum(['xlsx', 'pdf'], { errorMap: () => ({ message: 'format must be xlsx or pdf' }) }),
  category: z.string().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
});

export type ExportDTO        = z.infer<typeof exportSchema>;
export type CreateProductDTO  = z.infer<typeof createProductSchema>;
export type UpdateProductDTO  = z.infer<typeof updateProductSchema>;
export type PaginationDTO     = z.infer<typeof paginationSchema>;
export type SearchDTO         = z.infer<typeof searchSchema>;
