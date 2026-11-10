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
import { Subscription, SubscriptionResponse } from '../Subscription.js';

describe('Subscription', () => {
  test('deserializes isMandatory from plain camelCase payload key', () => {
    const subscription = Subscription.serialization.fromJson({
      CarrierVendor: 'Bloomberg',
      Model: 'B-PIPE',
      SourceVendor: 'NYSE',
      ItemName: 'Add-On',
      ServiceName: 'Real-Time News Add-On',
      AnnualAmount: 1200,
      TaxValue: 100,
      CostCode: 'CC-1',
      price: 100,
      servicepriceId: 55,
      permId: 999,
      id: 'sub-1',
      isMandatory: true,
    });

    expect(subscription).toBeInstanceOf(Subscription);
    expect(subscription.isMandatory).toBe(true);
  });

  test('deserializes feeds when isMandatory is absent without changing other behavior', () => {
    const response = SubscriptionResponse.serialization.fromJson({
      subscription_feeds: [
        {
          CarrierVendor: 'Bloomberg',
          Model: 'B-PIPE',
          SourceVendor: 'NYSE',
          ItemName: 'Permission ID',
          ServiceName: 'Level 1',
          AnnualAmount: 1200,
          TaxValue: 100,
          CostCode: 'CC-1',
          price: 100,
          servicepriceId: 55,
          permId: 999,
          id: 'sub-1',
        },
      ],
      TotalMonthlyCost: 100,
    });

    expect(response.subscriptionFeeds).toHaveLength(1);
    expect(response.subscriptionFeeds[0]?.isMandatory).toBeUndefined();
  });
});
