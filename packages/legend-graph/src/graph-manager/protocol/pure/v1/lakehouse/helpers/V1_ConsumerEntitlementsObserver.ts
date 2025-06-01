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

import { makeObservable, observable } from 'mobx';
import { skipObserved } from '../../../../../action/changeDetection/CoreObserverHelper.js';
import type { V1_DataContract } from '../entitlements/V1_ConsumerEntitlements.js';

export const V1_observe_DataContract = skipObserved(
  (metamodel: V1_DataContract) => {
    makeObservable(metamodel, {
      description: observable,
      guid: observable,
      version: observable,
      state: observable,
      resource: observable,
      members: observable,
      consumer: observable,
      createdBy: observable,
    });

    return metamodel;
  },
);
