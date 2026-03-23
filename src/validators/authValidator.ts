import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').optional(),
  lastName:  z.string().min(2, 'Last name must be at least 2 characters').optional(),
}).refine((data) => data.firstName || data.lastName, {
  message: 'At least one field (firstName or lastName) is required',
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword:     z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Confirm password is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type RegisterDTO        = z.infer<typeof registerSchema>;
export type LoginDTO           = z.infer<typeof loginSchema>;
export type UpdateProfileDTO   = z.infer<typeof updateProfileSchema>;
export type ChangePasswordDTO  = z.infer<typeof changePasswordSchema>;
