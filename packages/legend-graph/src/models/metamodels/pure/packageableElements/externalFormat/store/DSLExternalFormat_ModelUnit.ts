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
import {
  type Hashable,
  addUniqueEntry,
  changeEntry,
  deleteEntry,
  hashArray,
} from '@finos/legend-shared';
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
      addPackageableElementIncludes: action,
      deletePackageableElementIncludes: action,
      updatePackageableElementIncludes: action,
      addPackageableElementExcludes: action,
      deletePackageableElementExcludes: action,
      updatePackageableElementExcludes: action,
    });
  }

  addPackageableElementIncludes(
    value: PackageableElementReference<PackageableElement>,
  ): void {
    addUniqueEntry(this.packageableElementIncludes, value);
  }

  deletePackageableElementIncludes(
    value: PackageableElementReference<PackageableElement>,
  ): void {
    deleteEntry(this.packageableElementIncludes, value);
  }

  updatePackageableElementIncludes(
    oldValue: PackageableElementReference<PackageableElement>,
    newValue: PackageableElementReference<PackageableElement>,
  ): void {
    changeEntry(this.packageableElementIncludes, oldValue, newValue);
  }

  addPackageableElementExcludes(
    value: PackageableElementReference<PackageableElement>,
  ): void {
    addUniqueEntry(this.packageableElementExcludes, value);
  }

  deletePackageableElementExcludes(
    value: PackageableElementReference<PackageableElement>,
  ): void {
    deleteEntry(this.packageableElementExcludes, value);
  }

  updatePackageableElementExcludes(
    oldValue: PackageableElementReference<PackageableElement>,
    newValue: PackageableElementReference<PackageableElement>,
  ): void {
    changeEntry(this.packageableElementExcludes, oldValue, newValue);
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
