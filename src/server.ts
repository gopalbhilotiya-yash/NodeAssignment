import 'reflect-metadata';
import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { AppDataSource } from './config/database';
import { swaggerSpec } from './config/swagger';
import { requestLogger } from './middlewares/requestLogger';
import { errorHandler } from './middlewares/errorHandler';
import authRoutes    from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import cartRoutes    from './routes/cartRoutes';
import orderRoutes   from './routes/orderRoutes';
import logger from './config/logger';

const app = express();
const PORT = process.env.PORT || 3000;

// ─── 1. Core Middlewares ──────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── 2. Session ───────────────────────────────────────────────────────────────
app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

// ─── 3. Request Logger (Winston) ──────────────────────────────────────────────
app.use(requestLogger);

// ─── 4. Swagger Docs ──────────────────────────────────────────────────────────
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "E-Commerce Auth API Docs ",
  }),
);

// ─── 5. Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart',     cartRoutes);
app.use('/api/orders',   orderRoutes);

// ─── 6. 404 Handler ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── 7. Global Error Handler (must be last) ───────────────────────────────────
app.use(errorHandler);

// ─── 8. Start Server ──────────────────────────────────────────────────────────
AppDataSource.initialize()
  .then(() => {
    logger.info('Database connected (SQLite)');
    app.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
      logger.info(`Swagger docs at http://localhost:${PORT}/api/docs`);
    });
  })
  .catch((err) => {
    logger.error('Database connection failed', { error: err });
    process.exit(1);
  });
