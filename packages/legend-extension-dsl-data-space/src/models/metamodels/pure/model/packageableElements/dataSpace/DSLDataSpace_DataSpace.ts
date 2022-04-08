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

import { hashArray, type Hashable } from '@finos/legend-shared';
import {
  PackageableElement,
  type PackageableElementVisitor,
  type StereotypeReference,
  type TaggedValue,
} from '@finos/legend-graph';
import { DATA_SPACE_HASH_STRUCTURE } from '../../../../../DSLDataSpace_ModelUtils';

export abstract class DataSpaceSupportInfo implements Hashable {
  abstract get hashCode(): string;
}

export class DataSpaceSupportEmail
  extends DataSpaceSupportInfo
  implements Hashable
{
  address!: string;

  get hashCode(): string {
    return hashArray([
      DATA_SPACE_HASH_STRUCTURE.DATA_SPACE_SUPPORT_EMAIL,
      this.address,
    ]);
  }
}

export class DataSpaceExecutionContext implements Hashable {
  name!: string;
  description?: string | undefined;
  mapping!: string;
  defaultRuntime!: string;

  get hashCode(): string {
    return hashArray([
      DATA_SPACE_HASH_STRUCTURE.DATA_SPACE_EXECUTION_CONTEXT,
      this.name,
      this.description ?? '',
      this.mapping,
      this.defaultRuntime,
    ]);
  }
}

export class DataSpace extends PackageableElement implements Hashable {
  stereotypes: StereotypeReference[] = [];
  taggedValues: TaggedValue[] = [];
  groupId!: string;
  artifactId!: string;
  versionId!: string;
  executionContexts: DataSpaceExecutionContext[] = [];
  defaultExecutionContext!: DataSpaceExecutionContext;
  featuredDiagrams: string[] = [];
  description?: string | undefined;
  supportInfo?: DataSpaceSupportInfo | undefined;

  protected override get _elementHashCode(): string {
    return hashArray([
      DATA_SPACE_HASH_STRUCTURE.DATA_SPACE,
      hashArray(
        this.stereotypes.map((stereotype) => stereotype.pointerHashCode),
      ),
      hashArray(this.taggedValues),
      this.groupId,
      this.artifactId,
      this.versionId,
      hashArray(this.executionContexts),
      this.defaultExecutionContext.name,
      hashArray(this.featuredDiagrams),
      this.description ?? '',
      this.supportInfo ?? '',
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}
