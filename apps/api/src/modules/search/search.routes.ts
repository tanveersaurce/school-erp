import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { searchRateLimiter } from '../../middlewares/rateLimiter.js';
import { searchController } from './search.controller.js';

export const searchRouter = Router();

searchRouter.get('/', searchRateLimiter, authenticate, searchController.search.bind(searchController));
