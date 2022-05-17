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

import { hashArray, type Hashable } from '@finos/legend-shared';
import {
  CORE_HASH_STRUCTURE,
  PackageableElementPointerType,
} from '../../../../../../../MetaModelConst';
import { InputData } from '../../../mapping/InputData';
import type { FlatData } from '../model/FlatData';
import type { PackageableElementReference } from '../../../PackageableElementReference';
import { hashElementPointer } from '../../../../../../../MetaModelUtils';

export class FlatDataInputData extends InputData implements Hashable {
  sourceFlatData: PackageableElementReference<FlatData>;
  data: string;

  constructor(
    sourceFlatData: PackageableElementReference<FlatData>,
    data: string,
  ) {
    super();
    this.sourceFlatData = sourceFlatData;
    this.data = data;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_INPUT_DATA,
      hashElementPointer(
        PackageableElementPointerType.STORE,
        this.sourceFlatData.hashValue,
      ),
      this.data,
    ]);
  }
}
