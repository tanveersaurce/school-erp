import { AuthContext, GlobalSearchGroup, GlobalSearchResponse } from '@edusphere/types';
import { UserType } from '@edusphere/common';
import { SEARCH_PROVIDERS, SearchProvider, SearchProviderContext } from './search.registry.js';
import { GlobalSearchQueryInput } from './search.validator.js';
import { logger } from '../../core/logger/logger.js';
import { rbacService } from '../rbac/rbac.service.js';

export class SearchService {
  private hasPermission(user: AuthContext, requiredPermission: string): boolean {
    if (user.userType === UserType.SUPER_ADMIN) {
      return true;
    }
    const permissions = user.permissions || [];
    if (permissions.includes('*') || permissions.includes(requiredPermission)) {
      return true;
    }
    // Check wildcard prefix (e.g., student:* matches student:read)
    const [domain] = requiredPermission.split(':');
    if (domain && permissions.includes(`${domain}:*`)) {
      return true;
    }
    return false;
  }

  async search(
    tenantId: string,
    user: AuthContext,
    params: GlobalSearchQueryInput
  ): Promise<GlobalSearchResponse> {
    const trimmedQuery = params.q.trim();
    if (trimmedQuery.length < 2) {
      return { query: trimmedQuery, totalMatches: 0, groups: [] };
    }

    // Ensure user permissions are loaded
    if (!user.permissions || user.permissions.length === 0) {
      try {
        const effective = await rbacService.getEffectivePermissions(tenantId, user.userId, user.userType);
        user.permissions = effective.permissions;
        user.roles = effective.roles;
      } catch (err) {
        logger.warn({ err }, 'Failed to load effective permissions during search');
      }
    }

    // 1. Authorization-first filtering of providers
    let eligibleProviders = SEARCH_PROVIDERS.filter((provider) =>
      this.hasPermission(user, provider.requiredPermission)
    );

    // 2. Filter by requested entities if specified
    if (params.entities && params.entities.length > 0) {
      eligibleProviders = eligibleProviders.filter((p) =>
        params.entities!.includes(p.entityType)
      );
    }

    const providerContext: SearchProviderContext = {
      tenantId,
      userId: user.userId,
      userType: user.userType,
      permissions: user.permissions || [],
      schoolId: params.schoolId || user.schoolId,
      campusId: params.campusId || user.campusId,
      query: trimmedQuery,
      limit: params.limit || 5,
    };

    // 3. Concurrent execution with resilience
    const results = await Promise.allSettled(
      eligibleProviders.map(async (provider) => {
        const items = await provider.search(providerContext);
        return {
          provider,
          items,
        };
      })
    );

    const groups: GlobalSearchGroup[] = [];
    let totalMatches = 0;

    for (const res of results) {
      if (res.status === 'fulfilled') {
        const { provider, items } = res.value;
        if (items.length > 0) {
          groups.push({
            category: provider.category,
            entityType: provider.entityType,
            label: provider.label,
            total: items.length,
            items,
          });
          totalMatches += items.length;
        }
      } else {
        logger.error({ err: res.reason }, 'Search provider failed during execution');
      }
    }

    return {
      query: trimmedQuery,
      totalMatches,
      groups,
    };
  }
}

export const searchService = new SearchService();
