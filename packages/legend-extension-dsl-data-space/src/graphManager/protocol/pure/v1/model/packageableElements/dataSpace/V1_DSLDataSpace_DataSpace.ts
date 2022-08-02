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
import { DATA_SPACE_HASH_STRUCTURE } from '../../../../../../../graph/DSLDataSpace_HashUtils.js';
import {
  V1_PackageableElement,
  type V1_PackageableElementPointer,
  type V1_PackageableElementVisitor,
  type V1_StereotypePtr,
  type V1_TaggedValue,
} from '@finos/legend-graph';

export abstract class V1_DataSpaceSupportInfo implements Hashable {
  abstract get hashCode(): string;
}

export class V1_DataSpaceSupportEmail
  extends V1_DataSpaceSupportInfo
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

export class V1_DataSpaceExecutionContext implements Hashable {
  name!: string;
  description?: string | undefined;
  mapping!: V1_PackageableElementPointer;
  defaultRuntime!: V1_PackageableElementPointer;

  get hashCode(): string {
    return hashArray([
      DATA_SPACE_HASH_STRUCTURE.DATA_SPACE_EXECUTION_CONTEXT,
      this.name,
      this.description ?? '',
      this.mapping.path,
      this.defaultRuntime.path,
    ]);
  }
}

export class V1_DataSpace extends V1_PackageableElement implements Hashable {
  stereotypes: V1_StereotypePtr[] = [];
  taggedValues: V1_TaggedValue[] = [];
  executionContexts!: V1_DataSpaceExecutionContext[];
  defaultExecutionContext!: string;
  featuredDiagrams?: V1_PackageableElementPointer[] | undefined;
  title?: string | undefined;
  description?: string | undefined;
  supportInfo?: V1_DataSpaceSupportInfo | undefined;

  override get hashCode(): string {
    return hashArray([
      DATA_SPACE_HASH_STRUCTURE.DATA_SPACE,
      hashArray(this.stereotypes),
      hashArray(this.taggedValues),
      hashArray(this.executionContexts),
      this.defaultExecutionContext,
      hashArray((this.featuredDiagrams ?? []).map((pointer) => pointer.path)),
      this.title ?? '',
      this.description ?? '',
      this.supportInfo ?? '',
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}
