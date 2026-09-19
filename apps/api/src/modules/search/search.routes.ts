import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { searchController } from './search.controller.js';

export const searchRouter = Router();

searchRouter.get('/', authenticate, searchController.search.bind(searchController));
