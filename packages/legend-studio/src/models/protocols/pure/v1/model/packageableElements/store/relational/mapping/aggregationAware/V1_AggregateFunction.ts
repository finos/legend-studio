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

import type { V1_RawLambda } from '../../../../../../model/rawValueSpecification/V1_RawLambda';
import type { Hashable } from '@finos/legend-studio-shared';
import { hashArray } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../../../MetaModelConst';
import { hashLambda } from '../../../../../../../../../MetaModelUtility';

export class V1_AggregateFunction implements Hashable {
  mapFn!: V1_RawLambda; // @MARKER GENERATED MODEL DISCREPANCY --- Studio does not process lambda
  aggregateFn!: V1_RawLambda; // @MARKER GENERATED MODEL DISCREPANCY --- Studio does not process lambda

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.AGGREGATE_FUNCTION,
      hashLambda(this.mapFn.parameters, this.mapFn.body),
      hashLambda(this.aggregateFn.parameters, this.aggregateFn.body),
    ]);
  }
}
