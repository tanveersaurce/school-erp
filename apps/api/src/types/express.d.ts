import { AuthContext, TenantContext } from '@edusphere/types';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
      tenantContext?: TenantContext;
    }
  }
}
