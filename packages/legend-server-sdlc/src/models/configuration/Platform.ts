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

import { observable, computed, makeObservable } from 'mobx';
import { type Hashable, hashArray } from '@finos/legend-shared';
import { SDLC_HASH_STRUCTURE } from '../../SDLC_HashUtils.js';

export class Platform implements Hashable {
  name: string;
  groupId: string;
  platformVersion: string;

  constructor(name: string, groupId: string, platformVersion: string) {
    makeObservable(this, {
      name: observable,
      groupId: observable,
      platformVersion: observable,
      hashCode: computed,
    });

    this.name = name;
    this.groupId = groupId;
    this.platformVersion = platformVersion;
  }

  get hashCode(): string {
    return hashArray([
      SDLC_HASH_STRUCTURE.PLATFORM,
      this.name,
      this.groupId,
      this.platformVersion,
    ]);
  }
}
