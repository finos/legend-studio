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

import { hashArray } from '@finos/legend-shared';
import type { Hashable } from '@finos/legend-shared';
import { DATA_SPACE_HASH_STRUCTURE } from '../../../../../../DSLDataSpace_ModelUtils';
import type { V1_PackageableElementVisitor } from '@finos/legend-graph';
import { V1_PackageableElement } from '@finos/legend-graph';

export class V1_DataSpace extends V1_PackageableElement implements Hashable {
  groupId!: string;
  artifactId!: string;
  versionId!: string;
  mapping!: string;
  runtime!: string;
  diagrams?: string[] | undefined;
  description?: string | undefined;
  supportEmail?: string | undefined;

  override get hashCode(): string {
    return hashArray([
      DATA_SPACE_HASH_STRUCTURE.DATA_SPACE,
      this.groupId,
      this.artifactId,
      this.versionId,
      this.mapping,
      this.runtime,
      hashArray(this.diagrams ?? []),
      this.description ?? '',
      this.supportEmail ?? '',
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}
