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
import type { PackageableElementReference } from '../../PackageableElementReference';
import type { PackageableElement } from '../../PackageableElement';
import { DSL_EXTERNAL_FORMAT_HASH_STRUCTURE } from '../../../../../DSLExternalFormat_ModelUtils';

export class ModelUnit implements Hashable {
  packageableElementIncludes: PackageableElementReference<PackageableElement>[] =
    [];
  packageableElementExcludes: PackageableElementReference<PackageableElement>[] =
    [];

  constructor() {
    makeObservable(this, {
      packageableElementIncludes: observable,
      packageableElementExcludes: observable,
      hashCode: computed,
    });
  }

  get hashCode(): string {
    return hashArray([
      DSL_EXTERNAL_FORMAT_HASH_STRUCTURE.MODEL_UNIT,
      hashArray(
        this.packageableElementIncludes.map((element) => element.hashValue),
      ),
      hashArray(
        this.packageableElementExcludes.map((element) => element.hashValue),
      ),
    ]);
  }
}
