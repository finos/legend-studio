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
import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import type { V1_ConfigurationProperty } from './V1_ConfigurationProperty.js';
import type { V1_PackageableElementVisitor } from '../V1_PackageableElement.js';
import { V1_AbstractGenerationSpecification } from '../generationSpecification/V1_AbstractGenerationSpecification.js';

export class V1_FileGenerationSpecification
  extends V1_AbstractGenerationSpecification
  implements Hashable
{
  type!: string;
  generationOutputPath?: string | undefined;
  scopeElements: string[] = [];
  configurationProperties: V1_ConfigurationProperty[] = [];

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FILE_GENERATION,
      this.path,
      this.type,
      this.generationOutputPath ?? '',
      hashArray(this.scopeElements),
      hashArray(this.configurationProperties),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_FileGeneration(this);
  }
}
