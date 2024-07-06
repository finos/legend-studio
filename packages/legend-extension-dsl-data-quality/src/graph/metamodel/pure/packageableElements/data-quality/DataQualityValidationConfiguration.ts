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
  type PackageableElementVisitor,
  type GraphFetchTree,
  type Mapping,
  type PackageableElementReference,
  type PackageableRuntime,
  type RawLambda,
  PackageableElement,
} from '@finos/legend-graph';
import { type Hashable, hashArray } from '@finos/legend-shared';
import { DATA_QUALITY_HASH_STRUCTURE } from '../../../DSL_DataQuality_HashUtils.js';
import type { DataSpace } from '@finos/legend-extension-dsl-data-space/graph';
import type { DataQualityRootGraphFetchTree } from './DataQualityGraphFetchTree.js';

export abstract class DataQualityExecutionContext implements Hashable {
  abstract get hashCode(): string;
}

export class DataSpaceDataQualityExecutionContext extends DataQualityExecutionContext {
  context!: string;
  dataSpace!: PackageableElementReference<DataSpace>;

  override get hashCode(): string {
    return hashArray([
      DATA_QUALITY_HASH_STRUCTURE.DATA_QUALTIY_DATASPACE_EXECUTION_CONTEXT,
      this.context,
      this.dataSpace.valueForSerialization ?? '',
    ]);
  }
}

export class MappingAndRuntimeDataQualityExecutionContext extends DataQualityExecutionContext {
  mapping!: PackageableElementReference<Mapping>;
  runtime!: PackageableElementReference<PackageableRuntime>;

  override get hashCode(): string {
    return hashArray([
      DATA_QUALITY_HASH_STRUCTURE.DATA_QUALITY_MAPPING_AND_RUNTIME_EXECUTION_CONTEXT,
      this.mapping.valueForSerialization ?? '',
      this.runtime.valueForSerialization ?? '',
    ]);
  }
}

export class DataQualityClassValidationsConfiguration
  extends PackageableElement
  implements Hashable
{
  context!: DataQualityExecutionContext;
  dataQualityRootGraphFetchTree: DataQualityRootGraphFetchTree | undefined;
  filter?: RawLambda | undefined;

  protected override get _elementHashCode(): string {
    return hashArray([
      DATA_QUALITY_HASH_STRUCTURE.DATA_QUALITY_CONSTRAINTS_CONFIGURATION,
      this.context,
      this.filter ?? '',
      this.dataQualityRootGraphFetchTree ?? '',
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}

export class DataQualityServiceValidationConfiguration
  extends PackageableElement
  implements Hashable
{
  serviceName: string | undefined;
  contextName: string | undefined;
  dataQualityRootGraphFetchTree: GraphFetchTree | undefined;

  protected override get _elementHashCode(): string {
    return hashArray([
      DATA_QUALITY_HASH_STRUCTURE.DATA_QUALITY_SERVICE_VALIDATION_CONFIGURATION,
      this.serviceName ?? '',
      this.contextName ?? '',
      this.dataQualityRootGraphFetchTree ?? '',
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}
