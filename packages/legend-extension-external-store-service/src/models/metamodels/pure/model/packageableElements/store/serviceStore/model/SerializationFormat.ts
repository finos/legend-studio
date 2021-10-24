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

import { observable, computed, makeObservable, action } from 'mobx';
import { hashArray } from '@finos/legend-shared';
import type { Hashable } from '@finos/legend-shared';
import { SERVICE_STORE_HASH_STRUCTURE } from '../../../../../../../ESService_ModelUtils';

export class SerializationFormat implements Hashable {
  style?: string | undefined;
  explode?: boolean | undefined;

  constructor() {
    makeObservable(this, {
      style: observable,
      explode: observable,
      setStyle: action,
      setExplode: action,
      hashCode: computed,
    });
  }

  setStyle(value: string): void {
    this.style = value;
  }

  setExplode(value: boolean): void {
    this.explode = value;
  }

  get hashCode(): string {
    return hashArray([
      SERVICE_STORE_HASH_STRUCTURE.SERIALIZATION_FORMAT,
      this.style ?? '',
      Boolean(this.explode ?? true).toString(),
    ]);
  }
}
