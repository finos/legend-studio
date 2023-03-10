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
import { DATA_SPACE_HASH_STRUCTURE } from '../../../../../../../graph/DSL_DataSpace_HashUtils.js';
import {
  V1_PackageableElement,
  type V1_RawLambda,
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

export class V1_DataSpaceSampleTDSQueryColumn implements Hashable {
  name!: string;
  description?: string | undefined;
  sampleValues?: string[] | undefined;

  get hashCode(): string {
    return hashArray([
      DATA_SPACE_HASH_STRUCTURE.DATA_SPACE_SAMPLE_TDS_QUERY_COLUMN,
      this.name,
      this.description ?? '',
      hashArray(this.sampleValues ?? []),
    ]);
  }
}

export class V1_DataSpaceSampleTDSQuery implements Hashable {
  name!: string;
  description?: string | undefined;
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  query!: V1_RawLambda;
  columns?: V1_DataSpaceSampleTDSQueryColumn[] | undefined;

  get hashCode(): string {
    return hashArray([
      DATA_SPACE_HASH_STRUCTURE.DATA_SPACE_SAMPLE_TDS_QUERY,
      this.name,
      this.description ?? '',
      this.query,
      hashArray(this.columns ?? []),
    ]);
  }
}

export class V1_DataSpace extends V1_PackageableElement implements Hashable {
  stereotypes: V1_StereotypePtr[] = [];
  taggedValues: V1_TaggedValue[] = [];
  title?: string | undefined;
  description?: string | undefined;
  executionContexts!: V1_DataSpaceExecutionContext[];
  defaultExecutionContext!: string;
  featuredDiagrams?: V1_PackageableElementPointer[] | undefined;
  elements?: V1_PackageableElementPointer[] | undefined;
  sampleTDSQueries?: V1_DataSpaceSampleTDSQuery[] | undefined;
  supportInfo?: V1_DataSpaceSupportInfo | undefined;

  override get hashCode(): string {
    return hashArray([
      DATA_SPACE_HASH_STRUCTURE.DATA_SPACE,
      hashArray(this.stereotypes),
      hashArray(this.taggedValues),
      this.title ?? '',
      this.description ?? '',
      hashArray(this.executionContexts),
      this.defaultExecutionContext,
      hashArray((this.featuredDiagrams ?? []).map((pointer) => pointer.path)),
      hashArray((this.elements ?? []).map((pointer) => pointer.path)),
      hashArray(this.sampleTDSQueries ?? []),
      this.supportInfo ?? '',
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}
