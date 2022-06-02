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

import type { Hashable } from '@finos/legend-shared';
import {
  type PackageableElementVisitor,
  PackageableElement,
} from '../PackageableElement.js';

export class Package extends PackageableElement implements Hashable {
  children: PackageableElement[] = [];

  /**
   * This logic is specific to the codebase and this is not part of the native metamodel.
   * If needed, we can probably move this out as an utility or do type declaration merge
   * and define this externally using `Object.defineProperty`.
   *
   * @internal model logic
   */
  override get path(): string {
    return !this.package ? '' : super.path;
  }

  override get hashCode(): string {
    return '';
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_Package(this);
  }
}
