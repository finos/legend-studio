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
import { hashLambda } from '../../../../../../MetaModelUtility';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../MetaModelConst';
import type { V1_Multiplicity } from './V1_Multiplicity';
import type { V1_StereotypePtr } from '../../../model/packageableElements/domain/V1_StereotypePtr';
import type { V1_TaggedValue } from '../../../model/packageableElements/domain/V1_TaggedValue';

export class V1_DerivedProperty implements Hashable {
  name!: string;
  returnType!: string;
  returnMultiplicity!: V1_Multiplicity;
  stereotypes: V1_StereotypePtr[] = [];
  taggedValues: V1_TaggedValue[] = [];
  body?: object; // @MARKER GENERATED MODEL DISCREPANCY --- Studio does not process lambda
  parameters?: object; // @MARKER GENERATED MODEL DISCREPANCY --- Studio does not process lambda

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DERIVED_PROPERTY,
      this.name,
      this.returnMultiplicity,
      this.returnType,
      hashArray(this.stereotypes),
      hashArray(this.taggedValues),
      hashLambda(this.parameters, this.body),
    ]);
  }
}
