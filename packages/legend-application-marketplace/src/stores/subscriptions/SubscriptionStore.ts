/**
 * Copyright (c) 2025-present, Goldman Sachs
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

import { makeObservable, observable, action, flow } from 'mobx';
import {
  LogEvent,
  type GeneratorFn,
  assertErrorThrown,
  ActionState,
  type PlainObject,
  LegendUser,
} from '@finos/legend-shared';
import { APPLICATION_EVENT } from '@finos/legend-application';
import type { LegendMarketplaceBaseStore } from '../LegendMarketplaceBaseStore.js';
import {
  type Subscription,
  SubscriptionResponse,
  type SubscriptionRequest,
} from '@finos/legend-server-marketplace';

export class SubscriptionStore {
  readonly baseStore: LegendMarketplaceBaseStore;

  subscriptionFeeds: Subscription[] = [];
  totalCost = 0;
  selectedUser: LegendUser = new LegendUser();
  selectedSubscriptions: Subscription[] = [];
  readonly fetchSubscriptionState = ActionState.create();
  readonly fetchUsersState = ActionState.create();
  readonly cancelSubscriptionState = ActionState.create();

  constructor(baseStore: LegendMarketplaceBaseStore) {
    makeObservable(this, {
      subscriptionFeeds: observable,
      totalCost: observable,
      selectedSubscriptions: observable,
      addSelectedSubscriptions: action,
      removeSelectedSubscription: action,
      clearSelectedSubscriptions: action,
      setSelectedUser: action,
      resetSelectedUser: action,
      refresh: flow,
      fetchSubscription: flow,
      cancelSubscription: flow,
    });
    this.baseStore = baseStore;
  }

  addSelectedSubscriptions(subscription: Subscription | null): void {
    const exists = this.selectedSubscriptions.some(
      (sub) => sub.id === subscription?.id,
    );
    if (!exists && subscription) {
      this.selectedSubscriptions.push(subscription);
    }
  }

  removeSelectedSubscription(subscription: Subscription | null): void {
    this.selectedSubscriptions = this.selectedSubscriptions.filter(
      (sub) => sub.id !== subscription?.id,
    );
  }

  clearSelectedSubscriptions(): void {
    this.selectedSubscriptions = [];
  }

  setSelectedUser(user: LegendUser): void {
    this.selectedUser = user;
  }

  resetSelectedUser(): void {
    this.selectedUser = new LegendUser();
  }

  *refresh(): GeneratorFn<void> {
    const user = this.baseStore.applicationStore.identityService.currentUser;
    this.fetchSubscription(user);
  }

  *fetchSubscription(user: string): GeneratorFn<void> {
    this.fetchSubscriptionState.inProgress();
    try {
      const rawResponse =
        (yield this.baseStore.marketplaceServerClient.getSubscriptions(
          user,
        )) as PlainObject<SubscriptionResponse>;
      const response: SubscriptionResponse =
        SubscriptionResponse.serialization.fromJson(rawResponse);

      this.subscriptionFeeds = response.subscriptionFeeds;
      this.totalCost = response.TotalMonthlyCost;
      this.fetchSubscriptionState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.baseStore.applicationStore.logService.error(
        LogEvent.create(APPLICATION_EVENT.GENERIC_FAILURE),
        `Failed to fetch Subscriptions: ${error.message}`,
      );
      this.baseStore.applicationStore.notificationService.notifyError(
        `Failed to fetch Subscriptions: ${error.message}`,
      );
      this.fetchSubscriptionState.fail();
    }
  }

  *cancelSubscription(
    cancellationRequest: SubscriptionRequest,
  ): GeneratorFn<void> {
    this.cancelSubscriptionState.inProgress();

    try {
      const response =
        (yield this.baseStore.marketplaceServerClient.cancelSubscriptions(
          cancellationRequest,
        )) as { message: string };

      this.baseStore.applicationStore.notificationService.notifySuccess(
        `Subscriptions Cancelled Successfully: ${response.message}`,
      );

      this.cancelSubscriptionState.complete();
      this.clearSelectedSubscriptions();
      this.refresh();
    } catch (error) {
      assertErrorThrown(error);
      this.baseStore.applicationStore.logService.error(
        LogEvent.create(APPLICATION_EVENT.GENERIC_FAILURE),
        `Failed to cancel Subscriptions: ${error.message}`,
      );
      this.baseStore.applicationStore.notificationService.notifyError(
        `Failed to cancel Subscriptions: ${error.message}`,
      );
      this.cancelSubscriptionState.fail();
    }
  }
}
