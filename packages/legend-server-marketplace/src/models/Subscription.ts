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

import { SerializationFactory } from '@finos/legend-shared';
import { alias, createModelSchema, list, object, primitive } from 'serializr';

export class Subscription {
  carrierVendor!: string;
  model!: string;
  sourceVendor!: string;
  itemName!: string;
  serviceName!: string;
  annualAmount!: number;
  taxValue!: number;
  costCode!: string;
  price!: number;
  servicepriceId?: number;
  permId!: number;
  id!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(Subscription, {
      carrierVendor: alias('CarrierVendor', primitive()),
      model: alias('Model', primitive()),
      sourceVendor: alias('SourceVendor', primitive()),
      itemName: alias('ItemName', primitive()),
      serviceName: alias('ServiceName', primitive()),
      annualAmount: alias('AnnualAmount', primitive()),
      taxValue: alias('TaxValue', primitive()),
      costCode: alias('CostCode', primitive()),
      price: primitive(),
      servicepriceId: primitive(),
      permId: primitive(),
      id: primitive(),
    }),
  );
}

export class SubscriptionResponse {
  subscriptionFeeds!: Subscription[];
  TotalMonthlyCost!: number;

  static readonly serialization = new SerializationFactory(
    createModelSchema(SubscriptionResponse, {
      subscriptionFeeds: alias(
        'subscription_feeds',
        list(object(Subscription)),
      ),
      TotalMonthlyCost: primitive(),
    }),
  );
}

export interface ProductSubscription {
  providerName: string;
  productName: string;
  category: string;
  price: number;
  servicepriceId: number;
  model: string;
}

export interface SubscriptionRequest {
  ordered_by: string;
  kerberos: string;
  order_items: Record<number, ProductSubscription[]>;
}
