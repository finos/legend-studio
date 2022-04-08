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
import type { Profile } from './Profile';
import type { Stubable } from '../../../../../helpers/Stubable';

export class Tag implements Stubable {
  readonly uuid = uuid();
  owner: Profile;

  value: string;

  constructor(owner: Profile, value: string) {
    this.owner = owner;
    this.value = value;
  }

  static createStub = (profile: Profile): Tag => new Tag(profile, '');
  get isStub(): boolean {
    return !this.value;
  }
}
