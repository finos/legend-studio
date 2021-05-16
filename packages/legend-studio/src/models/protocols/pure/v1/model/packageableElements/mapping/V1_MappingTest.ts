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

import { hashArray } from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../MetaModelConst';
import type { V1_RawLambda } from '../../../model/rawValueSpecification/V1_RawLambda';
import type { V1_MappingTestAssert } from './V1_MappingTestAssert';
import type { V1_InputData } from './V1_InputData';

export class V1_MappingTest implements Hashable {
  name!: string;
  query!: V1_RawLambda; // @MARKER GENERATED MODEL DISCREPANCY --- Studio does not process lambda
  inputData: V1_InputData[] = [];
  assert!: V1_MappingTestAssert;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MAPPING_TEST,
      this.name,
      this.query,
      hashArray(this.inputData),
      this.assert,
    ]);
  }
}
