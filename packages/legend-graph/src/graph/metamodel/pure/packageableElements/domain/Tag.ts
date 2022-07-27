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

import { uuid } from '@finos/legend-shared';
import type { Profile } from './Profile.js';

// NOTE: in Pure metamodel, this extends `Annotation`
export class Tag {
  readonly _UUID = uuid();
  readonly _OWNER: Profile;

  value: string;

  constructor(owner: Profile, value: string) {
    this._OWNER = owner;
    this.value = value;
  }
}
