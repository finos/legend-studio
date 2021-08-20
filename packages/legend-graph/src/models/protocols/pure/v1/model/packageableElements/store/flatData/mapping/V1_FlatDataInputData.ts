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

import { hashArray } from '@finos/legend-shared';
import type { Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../../../MetaModelConst';
import { V1_InputData } from '../../../../../model/packageableElements/mapping/V1_InputData';
import type { V1_PackageableElementPointer } from '../../../../../model/packageableElements/V1_PackageableElement';

export class V1_FlatDataInputData extends V1_InputData implements Hashable {
  sourceFlatData!: V1_PackageableElementPointer;
  data!: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_INPUT_DATA,
      this.sourceFlatData,
      this.data,
    ]);
  }
}
