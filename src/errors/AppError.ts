// ─── Base Error ───────────────────────────────────────────────────────────────
export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number,
    public readonly isOperational = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── 400 ─────────────────────────────────────────────────────────────────────
export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400);
  }
}

// ─── 401 ─────────────────────────────────────────────────────────────────────
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

// ─── 403 ─────────────────────────────────────────────────────────────────────
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

// ─── 404 ─────────────────────────────────────────────────────────────────────
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

// ─── 409 ─────────────────────────────────────────────────────────────────────
export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409);
  }
}
