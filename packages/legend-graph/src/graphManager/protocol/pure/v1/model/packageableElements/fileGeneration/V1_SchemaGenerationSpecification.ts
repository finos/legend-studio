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
import type { V1_ModelUnit } from '../externalFormat/store/V1_DSL_ExternalFormat_ModelUnit.js';
import { V1_AbstractGenerationSpecification } from '../generationSpecification/V1_AbstractGenerationSpecification.js';
import type { V1_PackageableElementVisitor } from '../V1_PackageableElement.js';
import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import type { V1_ConfigurationProperty } from './V1_ConfigurationProperty.js';

export class V1_SchemaGenerationSpecification
  extends V1_AbstractGenerationSpecification
  implements Hashable
{
  format!: string;
  modelUnit!: V1_ModelUnit;
  config: V1_ConfigurationProperty[] | undefined;

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SCHEMA_GENERATION,
      this.path,
      this.format,
      this.modelUnit,
      this.config ? hashArray(this.config) : '',
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_SchemaGeneration(this);
  }
}
