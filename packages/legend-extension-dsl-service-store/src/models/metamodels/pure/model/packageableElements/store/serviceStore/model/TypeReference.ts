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

import { observable, action, makeObservable } from 'mobx';
import type { Hashable } from '@finos/legend-shared';
import { hashArray } from '@finos/legend-shared';
import { SERVICE_STORE_HASH_STRUCTURE } from '../../../../../../../DSLServiceStore_ModelUtils';

export abstract class TypeReference implements Hashable {
  private readonly _$nominalTypeBrand!: 'TypeReference';
  list!: boolean;

  constructor(list: boolean) {
    this.list = list;

    makeObservable(this, {
      list: observable,
      setList: action,
    });
  }

  setList(value: boolean): void {
    this.list = value;
  }

  get hashCode(): string {
    return hashArray([
      SERVICE_STORE_HASH_STRUCTURE.TYPE_REFERENCE,
      Boolean(this.list).toString(),
    ]);
  }
}
