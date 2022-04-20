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

import {
  CORE_HASH_STRUCTURE,
  ELEMENT_PATH_DELIMITER,
} from '../../../../../MetaModelConst';
import { type Hashable, hashArray } from '@finos/legend-shared';
import {
  type PackageableElementVisitor,
  PackageableElement,
} from '../PackageableElement';

export class Package extends PackageableElement implements Hashable {
  children: PackageableElement[] = [];

  get fullPath(): string {
    if (!this.package) {
      return '';
    }
    const parentPackageName = this.package.fullPath;
    return !parentPackageName
      ? this.name
      : `${parentPackageName}${ELEMENT_PATH_DELIMITER}${this.name}`;
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.PACKAGE,
      this.path,
      hashArray(this.children.map((child) => child.path)),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_Package(this);
  }
}
