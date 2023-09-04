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

import {
  V1_PackageableElement,
  type V1_PackageableElementVisitor,
} from '@finos/legend-graph';
import { type Hashable, hashArray } from '@finos/legend-shared';
import { MASTERY_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Mastery_HashUtils.js';

export enum V1_DataProviderType {
  AGGREGATOR = 'Aggregator',
  EXCHANGE = 'Exchange',
  REGULATOR = 'Regulator',
}

export class V1_DataProvider extends V1_PackageableElement implements Hashable {
  dataProviderId!: string;
  dataProviderType!: V1_DataProviderType;

  override get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.DATA_PROVIDER,
      this.dataProviderId,
      this.dataProviderType,
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}
