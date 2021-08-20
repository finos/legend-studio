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

import { observable, action, computed, makeObservable } from 'mobx';
import type { Clazz } from '@finos/legend-shared';
import { guaranteeType, uuid } from '@finos/legend-shared';
import type { Type } from './Type';
import type { Stubable } from '../../../helpers/Stubable';

export class GenericType implements Stubable {
  uuid = uuid();
  rawType: Type;

  constructor(rawType: Type) {
    makeObservable(this, {
      rawType: observable,
      setRawType: action,
      isStub: computed,
    });

    this.rawType = rawType;
  }

  getRawType = <T extends Type>(clazz: Clazz<T>): T =>
    guaranteeType<T>(this.rawType, clazz);
  setRawType(type: Type): void {
    this.rawType = type;
  }

  // NOTE: we don't have a `createStub` for GenericType because it all depends on the type passed in
  // so might as well use constructor
  get isStub(): boolean {
    return this.rawType.isStub;
  }
}
