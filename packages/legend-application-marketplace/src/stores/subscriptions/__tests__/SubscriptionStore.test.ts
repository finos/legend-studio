/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { describe, expect, test } from '@jest/globals';
import { LegendUser } from '@finos/legend-shared';
import { SubscriptionStore } from '../SubscriptionStore.js';
import { TEST__provideMockLegendMarketplaceBaseStore } from '../../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import type { LegendMarketplaceBaseStore } from '../../LegendMarketplaceBaseStore.js';

const setupStore = async (): Promise<{
  subscriptionStore: SubscriptionStore;
  baseStore: LegendMarketplaceBaseStore;
}> => {
  const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
  const subscriptionStore = new SubscriptionStore(baseStore);
  return { subscriptionStore, baseStore };
};

describe('SubscriptionStore - selectedUser', () => {
  test('defaults selectedUser.id to the current user', async () => {
    const { subscriptionStore, baseStore } = await setupStore();
    expect(subscriptionStore.selectedUser.id).toBe(
      baseStore.applicationStore.identityService.currentUser,
    );
  });

  test('setSelectedUser updates selectedUser', async () => {
    const { subscriptionStore } = await setupStore();
    const user = new LegendUser();
    user.id = 'test-user-123';
    subscriptionStore.setSelectedUser(user);
    expect(subscriptionStore.selectedUser.id).toBe('test-user-123');
  });

  test('resetSelectedUser restores selectedUser.id to the current user', async () => {
    const { subscriptionStore, baseStore } = await setupStore();
    const user = new LegendUser();
    user.id = 'test-user-123';
    subscriptionStore.setSelectedUser(user);

    subscriptionStore.resetSelectedUser();

    expect(subscriptionStore.selectedUser.id).toBe(
      baseStore.applicationStore.identityService.currentUser,
    );
  });
});
