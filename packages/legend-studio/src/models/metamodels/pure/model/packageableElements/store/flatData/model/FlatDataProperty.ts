/**
 * Copyright Goldman Sachs
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

import { observable, computed, makeObservable } from 'mobx';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import type { Hashable } from '@finos/legend-studio-shared';
import { hashArray } from '@finos/legend-studio-shared';

export type FlatDataPropertyValue = boolean | string | number;

export class FlatDataProperty implements Hashable {
  name: string;
  value: FlatDataPropertyValue;

  constructor(name: string, value: FlatDataPropertyValue) {
    makeObservable(this, {
      name: observable,
      value: observable,
      hashCode: computed,
    });

    this.name = name;
    this.value = value;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_PROPERTY,
      this.name,
      this.value.toString(),
    ]);
  }
}
