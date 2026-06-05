/**
 * Copyright (c) 2020-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { PlainObject } from '@finos/legend-shared';
import type { V1_PendingTasksResponse } from '@finos/legend-graph';
import type { LakehouseContractServerClient } from '@finos/legend-server-lakehouse';

/**
 * Default TTL for cached pending-tasks responses. The entitlements server
 * was reporting overload from this endpoint, so we cache responses briefly
 * and dedupe in-flight requests across all UI consumers (header badge,
 * entitlements dashboard, etc.).
 */
export const PENDING_TASKS_CACHE_TTL_MS = 60_000;

type CacheEntry = {
  response: PlainObject<V1_PendingTasksResponse>;
  fetchedAt: number;
};

/**
 * Shared cache + in-flight request dedupe for `getPendingTasks`.
 *
 * - Multiple concurrent callers for the same user share a single network call.
 * - Subsequent callers within `PENDING_TASKS_CACHE_TTL_MS` get the cached
 *   response without hitting the server.
 * - Mutating operations (approve/deny) should call `invalidate()` so the
 *   next read refreshes.
 */
export class PendingTasksCache {
  private readonly client: LakehouseContractServerClient;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<
    string,
    Promise<PlainObject<V1_PendingTasksResponse>>
  >();

  constructor(client: LakehouseContractServerClient) {
    this.client = client;
  }

  private static keyFor(user: string | undefined): string {
    return user ?? '<self>';
  }

  invalidate(user?: string): void {
    if (user === undefined) {
      this.cache.clear();
    } else {
      this.cache.delete(PendingTasksCache.keyFor(user));
    }
  }

  async fetch(
    user: string | undefined,
    token: string | undefined,
    options?: { forceRefresh?: boolean },
  ): Promise<PlainObject<V1_PendingTasksResponse>> {
    const key = PendingTasksCache.keyFor(user);

    if (!options?.forceRefresh) {
      const entry = this.cache.get(key);
      if (entry && Date.now() - entry.fetchedAt < PENDING_TASKS_CACHE_TTL_MS) {
        return entry.response;
      }
      const pending = this.inFlight.get(key);
      if (pending) {
        return pending;
      }
    }

    const request = this.client
      .getPendingTasks(user, token)
      .then((response) => {
        this.cache.set(key, { response, fetchedAt: Date.now() });
        return response;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });
    this.inFlight.set(key, request);
    return request;
  }
}
