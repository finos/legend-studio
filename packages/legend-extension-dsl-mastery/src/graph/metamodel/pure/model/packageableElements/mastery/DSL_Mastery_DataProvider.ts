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

import { type Hashable, hashArray } from '@finos/legend-shared';
import {
  type PackageableElementVisitor,
  PackageableElement,
} from '@finos/legend-graph';
import { MASTERY_HASH_STRUCTURE } from '../../../../../DSL_Mastery_HashUtils.js';

export class DataProvider extends PackageableElement implements Hashable {
  dataProviderId!: string;
  dataProviderType!: DataProviderType;

  override get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.DATA_PROVIDER,
      this.dataProviderId,
      this.dataProviderType,
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}

export enum DataProviderType {
  AGGREGATOR = 'Aggregator',
  EXCHANGE = 'Exchange',
  REGULATOR = 'Regulator',
}
