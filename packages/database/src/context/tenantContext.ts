import { AsyncLocalStorage } from 'node:async_hooks';
import { TenantContext } from '@edusphere/types';

export const tenantContextStore = new AsyncLocalStorage<TenantContext>();

export function getTenantContext(): TenantContext | undefined {
  return tenantContextStore.getStore();
}

export function runWithTenantContext<R>(context: TenantContext, fn: () => R): R {
  return tenantContextStore.run(context, fn);
}
