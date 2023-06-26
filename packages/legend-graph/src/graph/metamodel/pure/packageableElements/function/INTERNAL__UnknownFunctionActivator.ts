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
  type Hashable,
  hashArray,
  type PlainObject,
} from '@finos/legend-shared';
import { FunctionActivator } from './FunctionActivator.js';
import {
  CORE_HASH_STRUCTURE,
  hashObjectWithoutSourceInformation,
} from '../../../../Core_HashUtils.js';
import type { PackageableElementVisitor } from '../PackageableElement.js';

export class INTERNAL__UnknownFunctionActivator
  extends FunctionActivator
  implements Hashable
{
  content!: PlainObject;

  protected override get _elementHashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.INTERNAL__UNKNOWN_FUNCTION_ACTIVATOR,
      this.path,
      // TODO: for simplicity, we won't allow changing the function
      // for unknown function activator, this is also due to
      // the fact that to properly compute the hash, we need to
      // use an utility function to generate the function pretty name
      //
      // generateFunctionPrettyName(this.function.value, {
      //   fullPath: true,
      //   spacing: false,
      // }),
      hashObjectWithoutSourceInformation(this.content),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_INTERNAL__UnknownFunctionActivator(this);
  }
}
