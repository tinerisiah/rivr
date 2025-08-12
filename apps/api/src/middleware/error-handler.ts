import { Request, Response, NextFunction } from "express";
import { log } from "@repo/logger";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseError";
  }
}

export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  log("error", "API Error", {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });

  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (err instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      message: err.message,
    });
  }

  if (err instanceof DatabaseError) {
    return res.status(500).json({
      success: false,
      message: "Database error occurred",
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
}
