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

import { computed, action, makeObservable } from 'mobx';
import { uuid } from '@finos/legend-shared';
import type { SetImplementationReference } from './SetImplementationReference';
import type { Stubable } from '../../../helpers/Stubable';
import type { SetImplementation } from './SetImplementation';

export class SetImplementationContainer implements Stubable {
  uuid = uuid();
  setImplementation: SetImplementationReference;

  constructor(setImplementation: SetImplementationReference) {
    makeObservable(this, {
      setSetImplementation: action,
      isStub: computed,
    });

    this.setImplementation = setImplementation;
  }

  setSetImplementation(value: SetImplementation): void {
    this.setImplementation.setValue(value);
  }

  get isStub(): boolean {
    return !this.setImplementation.value.id;
  }
}
