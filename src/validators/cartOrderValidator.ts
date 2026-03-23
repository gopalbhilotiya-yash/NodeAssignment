import { z } from 'zod';
import { OrderStatus } from '../entities/Order';

export const addToCartSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity:  z.number().int().min(1, 'Quantity must be at least 1'),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

export const createOrderSchema = z.object({
  shippingAddress: z.string().min(10, 'Shipping address must be at least 10 characters'),
});

export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus, { errorMap: () => ({ message: 'Invalid order status' }) }),
});

export type AddToCartDTO         = z.infer<typeof addToCartSchema>;
export type UpdateCartItemDTO    = z.infer<typeof updateCartItemSchema>;
export type CreateOrderDTO       = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusDTO = z.infer<typeof updateOrderStatusSchema>;
