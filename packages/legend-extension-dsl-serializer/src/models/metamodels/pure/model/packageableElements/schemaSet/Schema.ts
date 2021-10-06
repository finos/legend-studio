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
import { DSL_SERIALIZER_HASH_STRUCTURE } from '../../../../../DSLSerializer_ModelUtils';

export class Schema implements Hashable {
  id?: string | undefined;
  location?: string | undefined;
  content = '';

  constructor() {
    makeObservable(this, {
      id: observable.ref,
      location: observable.ref,
      content: observable,
      setId: action,
      setLocation: action,
      setContent: action,
      hashCode: computed,
    });
  }

  setId(value: string): void {
    this.id = value;
  }

  setLocation(value: string): void {
    this.location = value;
  }

  setContent(value: string): void {
    this.content = value;
  }

  get hashCode(): string {
    return hashArray([
      DSL_SERIALIZER_HASH_STRUCTURE.SCHEMA,
      this.id ?? '',
      this.location ?? '',
      this.content,
    ]);
  }
}
