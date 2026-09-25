import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startHrTime = process.hrtime();
  const existingId = req.headers['x-request-id'] as string;
  const requestId = existingId || `req_${uuidv4()}`;

  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);

  const calculateResponseTime = () => {
    const diff = process.hrtime(startHrTime);
    return `${(diff[0] * 1000 + diff[1] / 1e6).toFixed(2)}ms`;
  };

  const originalWriteHead = res.writeHead;
  res.writeHead = function (this: any, ...args: any[]): any {
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', calculateResponseTime());
    }
    return originalWriteHead.apply(this, args as any);
  };

  next();
}
