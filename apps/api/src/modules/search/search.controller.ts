import { Request, Response, NextFunction } from 'express';
import { createSuccessResponse, AuthenticationError, ValidationError } from '@edusphere/common';
import { searchService } from './search.service.js';
import { globalSearchQuerySchema } from './search.validator.js';

export class SearchController {
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.auth) {
        throw new AuthenticationError('Authentication required for global search.');
      }

      const parsed = globalSearchQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError('Search query validation failed.', [
          { field: parsed.error.issues[0]?.path.join('.'), issue: parsed.error.issues[0]?.message },
        ]);
      }

      const tenantId = req.auth.tenantId || (req.tenantContext?.tenantId as string);
      const result = await searchService.search(tenantId, req.auth, parsed.data);

      res.status(200).json(
        createSuccessResponse(result, 'Search results retrieved successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }
}

export const searchController = new SearchController();
