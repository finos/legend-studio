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
  type V1_PackageableElementVisitor,
  type V1_PackageableElementPointer,
  type V1_RawLambda,
  V1_PackageableElement,
} from '@finos/legend-graph';
import { type Hashable, hashArray } from '@finos/legend-shared';
import { DATA_QUALITY_HASH_STRUCTURE } from '../../../../graph/metamodel/DSL_DataQuality_HashUtils.js';
import { type V1_DataQualityRootGraphFetchTree } from './model/graphFetch/V1_DataQualityRootGraphFetchTree.js';

export abstract class V1_DataQualityExecutionContext implements Hashable {
  abstract get hashCode(): string;
}

export class V1_DataSpaceDataQualityExecutionContext extends V1_DataQualityExecutionContext {
  context!: string;
  dataSpace!: V1_PackageableElementPointer;

  override get hashCode(): string {
    return hashArray([
      DATA_QUALITY_HASH_STRUCTURE.DATA_QUALTIY_DATASPACE_EXECUTION_CONTEXT,
      this.context,
      this.dataSpace.path,
    ]);
  }
}

export class V1_MappingAndRuntimeDataQualityExecutionContext extends V1_DataQualityExecutionContext {
  mapping!: V1_PackageableElementPointer;
  runtime!: V1_PackageableElementPointer;

  override get hashCode(): string {
    return hashArray([
      DATA_QUALITY_HASH_STRUCTURE.DATA_QUALITY_MAPPING_AND_RUNTIME_EXECUTION_CONTEXT,
      this.mapping.path,
      this.runtime.path,
    ]);
  }
}

export class V1_DataQualityClassValidationsConfiguration
  extends V1_PackageableElement
  implements Hashable
{
  context!: V1_DataQualityExecutionContext;
  dataQualityRootGraphFetchTree: V1_DataQualityRootGraphFetchTree | undefined;
  filter?: V1_RawLambda | undefined;

  override get hashCode(): string {
    return hashArray([
      DATA_QUALITY_HASH_STRUCTURE.DATA_QUALITY_CONSTRAINTS_CONFIGURATION,
      this.context,
      this.filter ?? '',
      this.dataQualityRootGraphFetchTree ?? '',
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}

export class V1_DataQualityServiceValidationsConfiguration
  extends V1_PackageableElement
  implements Hashable
{
  contextName?: string | undefined;
  serviceName?: string | undefined;
  dataQualityRootGraphFetchTree?: V1_DataQualityRootGraphFetchTree | undefined;

  override get hashCode(): string {
    return hashArray([
      DATA_QUALITY_HASH_STRUCTURE.DATA_QUALITY_SERVICE_VALIDATION_CONFIGURATION,
      this.contextName ?? '',
      this.serviceName ?? '',
      this.dataQualityRootGraphFetchTree ?? '',
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}
