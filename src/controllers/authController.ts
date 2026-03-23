import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entities/User';
import { RegisterDTO, LoginDTO, UpdateProfileDTO, ChangePasswordDTO } from '../validators/authValidator';
import { AuthRequest } from '../types/AuthRequest';
import { ConflictError, UnauthorizedError, ForbiddenError, NotFoundError } from '../errors/AppError';
import logger from '../config/logger';

type AppSession = Request['session'] & { userId?: string };

const userRepository = AppDataSource.getRepository(User);

// ─── Token Helpers ────────────────────────────────────────────────────────────
const generateAccessToken  = (userId: string, role: UserRole) =>
  jwt.sign({ userId, role }, process.env.JWT_SECRET!, { expiresIn: (process.env.ACCESS_TOKEN_EXPIRY || '15m') as SignOptions['expiresIn'] });

const generateRefreshToken = (userId: string, role: UserRole) =>
  jwt.sign({ userId, role }, process.env.JWT_REFRESH_SECRET!, { expiresIn: (process.env.REFRESH_TOKEN_EXPIRY || '7d') as SignOptions['expiresIn'] });

const setRefreshTokenCookie = (res: Response, token: string) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export class AuthController {

  async register(req: Request<{}, {}, RegisterDTO>, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName } = req.body;

      const existing = await userRepository.findOne({ where: { email } });
      if (existing) return next(new ConflictError('Email already registered'));

      const hashed = await bcrypt.hash(password, 10);
      const user   = userRepository.create({ email, password: hashed, firstName, lastName });
      await userRepository.save(user);

      const accessToken  = generateAccessToken(user.id, user.role);
      const refreshToken = generateRefreshToken(user.id, user.role);

      // store hashed refresh token in DB
      user.refreshToken = await bcrypt.hash(refreshToken, 10);
      await userRepository.save(user);

      (req.session as AppSession).userId = user.id;
      setRefreshTokenCookie(res, refreshToken);

      logger.info(`User registered: ${user.email}`);

      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
          accessToken,
        },
      });
    } catch (err) { next(err); }
  }

  async login(req: Request<{}, {}, LoginDTO>, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      const user = await userRepository.findOne({ where: { email } });
      if (!user) return next(new UnauthorizedError('Invalid email or password'));

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return next(new UnauthorizedError('Invalid email or password'));

      if (!user.isActive) return next(new ForbiddenError('Account is deactivated'));

      const accessToken  = generateAccessToken(user.id, user.role);
      const refreshToken = generateRefreshToken(user.id, user.role);

      // store hashed refresh token in DB
      user.refreshToken = await bcrypt.hash(refreshToken, 10);
      await userRepository.save(user);

      (req.session as AppSession).userId = user.id;
      setRefreshTokenCookie(res, refreshToken);

      logger.info(`User logged in: ${user.email}`);

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
          accessToken,
        },
      });
    } catch (err) { next(err); }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.refreshToken;
      if (!token) return next(new UnauthorizedError('Refresh token not found'));

      // verify refresh token signature
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { userId: string };

      const user = await userRepository.findOne({ where: { id: decoded.userId } });
      if (!user || !user.refreshToken) return next(new UnauthorizedError('Invalid refresh token'));

      // compare with hashed token in DB
      const isValid = await bcrypt.compare(token, user.refreshToken);
      if (!isValid) return next(new UnauthorizedError('Invalid refresh token'));

      // rotate tokens — issue new pair
      const newAccessToken  = generateAccessToken(user.id, user.role);
      const newRefreshToken = generateRefreshToken(user.id, user.role);

      user.refreshToken = await bcrypt.hash(newRefreshToken, 10);
      await userRepository.save(user);

      setRefreshTokenCookie(res, newRefreshToken);
      logger.info(`Tokens refreshed: ${user.email}`);

      return res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: { accessToken: newAccessToken },
      });
    } catch {
      next(new UnauthorizedError('Invalid or expired refresh token'));
    }
  }

  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // clear refresh token from DB
      if (req.userId) {
        await userRepository.update(req.userId, { refreshToken: null });
      }

      res.clearCookie('refreshToken');

      req.session.destroy((err) => {
        if (err) return next(err);
        logger.info(`User logged out: ${req.userId}`);
        return res.status(200).json({ success: true, message: 'Logout successful' });
      });
    } catch (err) { next(err); }
  }

  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (id !== req.userId) return next(new ForbiddenError('Access denied'));

      const user = await userRepository.findOne({ where: { id } });
      if (!user) return next(new NotFoundError('User not found'));

      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id, email: user.email, firstName: user.firstName,
            lastName: user.lastName, isActive: user.isActive, createdAt: user.createdAt,
          },
        },
      });
    } catch (err) { next(err); }
  }

  async updateProfile(req: AuthRequest & { body: UpdateProfileDTO }, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (id !== req.userId) return next(new ForbiddenError('Access denied'));

      const user = await userRepository.findOne({ where: { id } });
      if (!user) return next(new NotFoundError('User not found'));

      const { firstName, lastName } = req.body;
      if (firstName) user.firstName = firstName;
      if (lastName)  user.lastName  = lastName;

      await userRepository.save(user);
      logger.info(`Profile updated: ${user.email}`);

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } },
      });
    } catch (err) { next(err); }
  }

  async changePassword(req: AuthRequest & { body: ChangePasswordDTO }, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (id !== req.userId) return next(new ForbiddenError('Access denied'));

      const user = await userRepository.findOne({ where: { id } });
      if (!user) return next(new NotFoundError('User not found'));

      const { currentPassword, newPassword } = req.body;
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) return next(new UnauthorizedError('Current password is incorrect'));

      user.password = await bcrypt.hash(newPassword, 10);
      await userRepository.save(user);

      logger.info(`Password changed: ${user.email}`);
      return res.status(200).json({ success: true, message: 'Password changed successfully' });
    } catch (err) { next(err); }
  }

  // ─── Admin only ───────────────────────────────────────────────────────────────

  async adminCreateUser(req: Request<{}, {}, RegisterDTO & { role?: UserRole }>, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName, role } = req.body;

      const existing = await userRepository.findOne({ where: { email } });
      if (existing) return next(new ConflictError('Email already registered'));

      const hashed = await bcrypt.hash(password, 10);
      const user   = userRepository.create({
        email, firstName, lastName,
        password: hashed,
        role: role ?? UserRole.USER,
      });
      await userRepository.save(user);

      logger.info(`Admin created user: ${user.email} role=${user.role}`);
      return res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: { user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role } },
      });
    } catch (err) { next(err); }
  }

  async adminUpdateUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await userRepository.findOne({ where: { id } });
      if (!user) return next(new NotFoundError('User not found'));

      const { firstName, lastName, isActive, role } = req.body;
      if (firstName !== undefined) user.firstName = firstName;
      if (lastName  !== undefined) user.lastName  = lastName;
      if (isActive  !== undefined) user.isActive  = isActive;
      if (role      !== undefined) user.role      = role;

      await userRepository.save(user);
      logger.info(`Admin updated user: ${user.email}`);

      return res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: { user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, isActive: user.isActive } },
      });
    } catch (err) { next(err); }
  }

  async adminGetAllUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const users = await userRepository.find({ select: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'createdAt'] });
      return res.status(200).json({ success: true, data: users });
    } catch (err) { next(err); }
  }
}
