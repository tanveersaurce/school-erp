import { Request, Response, NextFunction } from 'express';

/**
 * Checks if a key represents a MongoDB operator (starts with $)
 * or dot notation (contains .) or prototype pollution attack.
 */
function isProhibitedKey(key: string): boolean {
  if (key.startsWith('$') || key.includes('.')) {
    return true;
  }
  if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
    return true;
  }
  return false;
}

/**
 * Recursively strips prohibited keys (MongoDB query operators, dot-notation, prototype pollution)
 * from objects and arrays in-place.
 */
function sanitizeObject(target: unknown, seen = new WeakSet<object>()): void {
  if (!target || typeof target !== 'object') {
    return;
  }

  // Prevent circular reference infinite loops
  if (seen.has(target as object)) {
    return;
  }
  seen.add(target as object);

  if (Array.isArray(target)) {
    for (let i = 0; i < target.length; i++) {
      const item = target[i];
      if (item && typeof item === 'object') {
        sanitizeObject(item, seen);
      }
    }
    return;
  }

  const obj = target as Record<string, any>;
  const keys = Object.keys(obj);

  for (const key of keys) {
    if (isProhibitedKey(key)) {
      delete obj[key];
    } else {
      const val = obj[key];
      if (val && typeof val === 'object') {
        sanitizeObject(val, seen);
      }
    }
  }
}

/**
 * Express middleware for deep NoSQL injection and Prototype Pollution sanitization.
 * Operates on req.body, req.query, and req.params.
 */
export function mongoSanitizeMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (req.body) {
    sanitizeObject(req.body);
  }
  if (req.query) {
    sanitizeObject(req.query);
  }
  if (req.params) {
    sanitizeObject(req.params);
  }
  next();
}
