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
  type ParameterValue,
  type RawVariableExpression,
  type EXECUTION_SERIALIZATION_FORMAT,
  PackageableElement,
  hashRawLambda,
} from '@finos/legend-graph';
import { type Hashable, hashArray, uuid } from '@finos/legend-shared';
import { DATA_QUALITY_HASH_STRUCTURE } from '../../../DSL_DataQuality_HashUtils.js';
import type { DataSpace } from '@finos/legend-extension-dsl-data-space/graph';
import type { DataQualityRootGraphFetchTree } from './DataQualityGraphFetchTree.js';

export enum RelationValidationType {
  ROW_LEVEL = 'ROW_LEVEL',
  AGGREGATE = 'AGGREGATE',
}
export interface DQExecuteInputOptions {
  lambdaParameterValues?: ParameterValue[];
  clientVersion?: string | undefined;
  validationName?: string | undefined;
  previewLimit?: number | undefined;
  runQuery?: boolean | undefined;
  serializationFormat?: EXECUTION_SERIALIZATION_FORMAT | undefined;
}

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

export abstract class DataQualityValidationConfiguration extends PackageableElement {}

export class DataQualityClassValidationsConfiguration
  extends DataQualityValidationConfiguration
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
  extends DataQualityValidationConfiguration
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

export class DataQualityRelationQueryLambda implements Hashable {
  body?: object | undefined;
  parameters: RawVariableExpression[] = [];

  get hashCode(): string {
    return hashArray([
      DATA_QUALITY_HASH_STRUCTURE.DATA_QUALITY_RELATION_VALIDATION_QUERY,
      hashArray(this.parameters),
      hashRawLambda(undefined, this.body),
    ]);
  }
}

export class DataQualityRelationValidation implements Hashable {
  readonly _UUID = uuid();
  name: string;
  description: string | undefined;
  assertion: RawLambda;
  type?: RelationValidationType;

  constructor(name: string, assertion: RawLambda) {
    this.name = name;
    this.assertion = assertion;
  }

  get hashCode(): string {
    return hashArray([
      DATA_QUALITY_HASH_STRUCTURE.DATA_QUALITY_RELATION_VALIDATION,
      this.name,
      this.type ?? '',
      this.description ?? '',
      this.assertion,
    ]);
  }
}

export class DataQualityRelationValidationConfiguration
  extends DataQualityValidationConfiguration
  implements Hashable
{
  query!: DataQualityRelationQueryLambda;
  validations: DataQualityRelationValidation[] = [];
  runtime?: PackageableElementReference<PackageableRuntime> | undefined;

  protected override get _elementHashCode(): string {
    return hashArray([
      DATA_QUALITY_HASH_STRUCTURE.DATA_QUALITY_RELATION_VALIDATION_CONFIGURATION,
      this.query,
      hashArray(this.validations),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}
