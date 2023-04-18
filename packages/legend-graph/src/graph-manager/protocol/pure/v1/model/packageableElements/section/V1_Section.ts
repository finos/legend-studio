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

import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import { hashArray } from '@finos/legend-shared';

export abstract class V1_Section {
  parserName!: string[1];
  elements: string[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SECTION,
      this.parserName,
      hashArray(this.elements),
    ]);
  }
}

export class V1_ImportAwareCodeSection extends V1_Section {
  imports: string[] = [];

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.IMPORT_AWARE_CODE_SECTION,
      super.hashCode,
      hashArray(this.imports),
    ]);
  }
}

export class V1_DefaultCodeSection extends V1_Section {
  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DEFAULT_CODE_SECTION,
      super.hashCode,
    ]);
  }
}
