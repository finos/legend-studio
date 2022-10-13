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

import { alias, createModelSchema, primitive } from 'serializr';
import { observable, action, computed, makeObservable } from 'mobx';
import {
  type Hashable,
  hashArray,
  SerializationFactory,
  uuid,
} from '@finos/legend-shared';
import { SDLC_HASH_STRUCTURE } from '../../SDLC_HashUtils.js';

export class PlatformConfiguration implements Hashable {
  readonly _UUID = uuid();

  name: string | undefined;
  version: string | undefined;

  constructor(name: string | undefined, version: string | undefined) {
    makeObservable(this, {
      name: observable,
      version: observable,
      setVersion: action,
      hashCode: computed,
    });

    this.name = name;
    this.version = version;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(PlatformConfiguration, {
      version: alias('version', primitive()),
      name: primitive(),
    }),
  );

  setVersion(v: string): void {
    this.version = v;
  }

  get hashCode(): string {
    return hashArray([
      SDLC_HASH_STRUCTURE.PLATFORM_CONFIGURATION,
      this.name ?? '',
      this.version ?? '',
    ]);
  }
}
