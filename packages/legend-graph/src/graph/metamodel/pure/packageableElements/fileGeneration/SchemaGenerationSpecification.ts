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

import { type Hashable, hashArray } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../graph/Core_HashUtils.js';
import {
  type PackageableElementVisitor,
  PackageableElement,
} from '../PackageableElement.js';
import type { ModelUnit } from '../externalFormat/store/DSL_ExternalFormat_ModelUnit.js';
import type { ConfigurationProperty } from './ConfigurationProperty.js';

export class SchemaGenerationSpecification
  extends PackageableElement
  implements Hashable
{
  format!: string;
  modelUnit!: ModelUnit;
  config: ConfigurationProperty[] | undefined;

  protected override get _elementHashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SCHEMA_GENERATION,
      this.path,
      this.format,
      this.modelUnit,
      this.config ? hashArray(this.config) : '',
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_SchemaGenerationSpecification(this);
  }
}
