import { AuthContext } from '@edusphere/types';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}
