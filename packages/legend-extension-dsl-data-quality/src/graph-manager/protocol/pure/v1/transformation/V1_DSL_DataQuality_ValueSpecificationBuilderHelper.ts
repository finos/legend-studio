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

import { V1_DataQualityPropertyGraphFetchTree } from '../model/graphFetch/V1_DataQualityPropertyGraphFetchTree.js';
import {
  at,
  guaranteeNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { V1_DataQualityRootGraphFetchTree } from '../model/graphFetch/V1_DataQualityRootGraphFetchTree.js';
import {
  DataQualityPropertyGraphFetchTree,
  DataQualityRootGraphFetchTree,
} from '../../../../../graph/metamodel/pure/packageableElements/data-quality/DataQualityGraphFetchTree.js';
import {
  type V1_DataQualityExecutionContext,
  type V1_DataQualityClassValidationsConfiguration,
  type V1_DataQualityRelationValidation,
  type V1_DataQualityRelationValidationsConfiguration,
  type V1_DataQualityServiceValidationsConfiguration,
  V1_DataSpaceDataQualityExecutionContext,
  V1_MappingAndRuntimeDataQualityExecutionContext,
} from '../V1_DataQualityValidationConfiguration.js';
import {
  type DataQualityExecutionContext,
  DataQualityRelationQueryLambda,
  DataQualityRelationValidation,
  DataSpaceDataQualityExecutionContext,
  MappingAndRuntimeDataQualityExecutionContext,
} from '../../../../../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';
import {
  type V1_GraphBuilderContext,
  type Class,
  type GraphFetchTree,
  type Mapping,
  type PackageableElementImplicitReference,
  type PackageableRuntime,
  type PropertyGraphFetchTree,
  type RootGraphFetchTree,
  type V1_GraphFetchTree,
  type V1_PropertyGraphFetchTree,
  type V1_RootGraphFetchTree,
  V1_ProcessingContext,
  V1_buildPropertyGraphFetchTree,
  V1_buildRootGraphFetchTree,
  V1_buildRawLambdaWithResolvedPaths,
  V1_buildFullPath,
  V1_buildVariable,
} from '@finos/legend-graph';
import type { DataSpace } from '@finos/legend-extension-dsl-data-space/graph';
import {
  getOwnDataQualityClassValidationsConfiguration,
  getOwnDataQualityServiceValidationsConfiguration,
  getOwnDataQualityRelationValidationsConfiguration,
} from '../../../../DSL_DataQuality_GraphManagerHelper.js';

export function V1_buildDataQualityExecutionContext(
  dataQualityExecutionContext: V1_DataQualityExecutionContext,
  graphContext: V1_GraphBuilderContext,
): DataQualityExecutionContext {
  if (
    dataQualityExecutionContext instanceof
    V1_DataSpaceDataQualityExecutionContext
  ) {
    const dataSpaceExecutionContext =
      new DataSpaceDataQualityExecutionContext();
    dataSpaceExecutionContext.context = dataQualityExecutionContext.context;
    dataSpaceExecutionContext.dataSpace = graphContext.resolveElement(
      dataQualityExecutionContext.dataSpace.path,
      false,
    ) as PackageableElementImplicitReference<DataSpace>;
    return dataSpaceExecutionContext;
  } else if (
    dataQualityExecutionContext instanceof
    V1_MappingAndRuntimeDataQualityExecutionContext
  ) {
    const mappingAndRuntimeExecutionContext =
      new MappingAndRuntimeDataQualityExecutionContext();
    mappingAndRuntimeExecutionContext.mapping = graphContext.resolveElement(
      dataQualityExecutionContext.mapping.path,
      false,
    ) as PackageableElementImplicitReference<Mapping>;
    mappingAndRuntimeExecutionContext.runtime = graphContext.resolveElement(
      dataQualityExecutionContext.runtime.path,
      false,
    ) as PackageableElementImplicitReference<PackageableRuntime>;
    return mappingAndRuntimeExecutionContext;
  }

  throw new UnsupportedOperationError(
    `Can't build data quality execution context`,
    dataQualityExecutionContext,
  );
}

export function V1_buildGraphFetchTree(
  graphFetchTree: V1_GraphFetchTree,
  context: V1_GraphBuilderContext,
  parentClass: Class | undefined,
  openVariables: string[],
  processingContext: V1_ProcessingContext,
  canResolveLocalProperty?: boolean | undefined,
): GraphFetchTree {
  if (graphFetchTree instanceof V1_DataQualityPropertyGraphFetchTree) {
    return V1_buildPropertyGraphFetchTree(
      graphFetchTree,
      context,
      guaranteeNonNullable(parentClass),
      openVariables,
      processingContext,
      canResolveLocalProperty,
    );
  }
  if (graphFetchTree instanceof V1_DataQualityRootGraphFetchTree) {
    return V1_buildRootGraphFetchTree(
      graphFetchTree,
      context,
      openVariables,
      processingContext,
      canResolveLocalProperty,
    );
  }
  throw new UnsupportedOperationError(
    `Can't build graph fetch tree`,
    graphFetchTree,
  );
}

export function V1_buildDataQualityGraphFetchTree(
  graphFetchTree: V1_GraphFetchTree,
  context: V1_GraphBuilderContext,
  parentClass: Class | undefined,
  openVariables: string[],
  processingContext: V1_ProcessingContext,
  canResolveLocalProperty?: boolean | undefined,
): GraphFetchTree {
  const _graphFetchTree = V1_buildGraphFetchTree(
    graphFetchTree,
    context,
    parentClass,
    openVariables,
    processingContext,
    canResolveLocalProperty,
  );
  return transformGraphFetchTreeToDataQualityGraphFetchTree(
    _graphFetchTree,
    graphFetchTree,
  );
}

export function V1_buildDataQualityRelationValidation(
  validation: V1_DataQualityRelationValidation,
  context: V1_GraphBuilderContext,
): DataQualityRelationValidation {
  const _validation = new DataQualityRelationValidation(
    validation.name,
    V1_buildRawLambdaWithResolvedPaths(
      validation.assertion.parameters,
      validation.assertion.body,
      context,
    ),
  );
  _validation.description = validation.description;
  _validation.type = validation.type;
  return _validation;
}

function transformGraphFetchTreeToDataQualityGraphFetchTree(
  graphFetchTree: GraphFetchTree,
  V1_graphFetchTree: V1_GraphFetchTree,
): GraphFetchTree {
  if (V1_graphFetchTree instanceof V1_DataQualityRootGraphFetchTree) {
    return transformRootGraphFetchTreeToDataQualityRootGraphFetchTree(
      graphFetchTree as RootGraphFetchTree,
      V1_graphFetchTree,
    );
  } else if (
    V1_graphFetchTree instanceof V1_DataQualityPropertyGraphFetchTree
  ) {
    return transformPropertyGraphFetchTreeToDataQualityPropertyGraphFetchTree(
      graphFetchTree as PropertyGraphFetchTree,
      V1_graphFetchTree,
    );
  }
  throw new UnsupportedOperationError(
    `Can't transform graph fetch tree to data quality graph fetch tree`,
    V1_graphFetchTree,
  );
}

function transformRootGraphFetchTreeToDataQualityRootGraphFetchTree(
  rootGraphFetchTree: RootGraphFetchTree,
  V1_rootGraphFetchTree: V1_DataQualityRootGraphFetchTree,
): DataQualityRootGraphFetchTree {
  const dataQualityRootGraphFetchTree = new DataQualityRootGraphFetchTree(
    rootGraphFetchTree.class,
  );
  dataQualityRootGraphFetchTree.constraints = V1_rootGraphFetchTree.constraints;
  dataQualityRootGraphFetchTree.subTrees = rootGraphFetchTree.subTrees.map(
    (_propertyTree, index) =>
      transformGraphFetchTreeToDataQualityGraphFetchTree(
        _propertyTree,
        at(V1_rootGraphFetchTree.subTrees, index),
      ),
  );
  return dataQualityRootGraphFetchTree;
}

function transformPropertyGraphFetchTreeToDataQualityPropertyGraphFetchTree(
  propertyGraphFetchTree: PropertyGraphFetchTree,
  V1_propertyGraphFetchTree: V1_DataQualityPropertyGraphFetchTree,
): DataQualityPropertyGraphFetchTree {
  const dataQualityPropertyGraphFetchTree =
    new DataQualityPropertyGraphFetchTree(
      propertyGraphFetchTree.property,
      propertyGraphFetchTree.subType,
    );
  dataQualityPropertyGraphFetchTree.alias = propertyGraphFetchTree.alias;
  dataQualityPropertyGraphFetchTree.parameters =
    propertyGraphFetchTree.parameters;
  dataQualityPropertyGraphFetchTree.subTrees =
    propertyGraphFetchTree.subTrees.map((_propertyTree, index) =>
      transformGraphFetchTreeToDataQualityGraphFetchTree(
        _propertyTree,
        at(V1_propertyGraphFetchTree.subTrees, index),
      ),
    );
  dataQualityPropertyGraphFetchTree.constraints =
    V1_propertyGraphFetchTree.constraints;
  return dataQualityPropertyGraphFetchTree;
}
export function V1_transformRootGraphFetchTreeToDataQualityRootGraphFetchTree(
  rootGraphFetchTree: V1_RootGraphFetchTree,
): V1_DataQualityRootGraphFetchTree {
  const dataQualityRootGraphFetchTree = new V1_DataQualityRootGraphFetchTree();
  dataQualityRootGraphFetchTree.class = rootGraphFetchTree.class;
  dataQualityRootGraphFetchTree.subTrees = rootGraphFetchTree.subTrees.map(
    (_propertyTree) =>
      V1_transformPropertyGraphFetchTreeToDataQualityPropertyGraphFetchTree(
        _propertyTree as V1_PropertyGraphFetchTree,
      ),
  );
  return dataQualityRootGraphFetchTree;
}

function V1_transformPropertyGraphFetchTreeToDataQualityPropertyGraphFetchTree(
  graphFetchTree: V1_PropertyGraphFetchTree,
): V1_DataQualityPropertyGraphFetchTree {
  const dataQualityPropertyGraphFetchTree =
    new V1_DataQualityPropertyGraphFetchTree();
  dataQualityPropertyGraphFetchTree.property = graphFetchTree.property;
  dataQualityPropertyGraphFetchTree.parameters = graphFetchTree.parameters;
  dataQualityPropertyGraphFetchTree.subTrees = graphFetchTree.subTrees.map(
    (_propertyTree) =>
      V1_transformPropertyGraphFetchTreeToDataQualityPropertyGraphFetchTree(
        _propertyTree as V1_PropertyGraphFetchTree,
      ),
  );
  return dataQualityPropertyGraphFetchTree;
}

export function V1_buildDataQualityClassValidationConfiguration(
  elementProtocol: V1_DataQualityClassValidationsConfiguration,
  context: V1_GraphBuilderContext,
): void {
  const path = V1_buildFullPath(elementProtocol.package, elementProtocol.name);
  const element = getOwnDataQualityClassValidationsConfiguration(
    path,
    context.currentSubGraph,
  );
  element.context = V1_buildDataQualityExecutionContext(
    elementProtocol.context,
    context,
  );
  element.dataQualityRootGraphFetchTree =
    elementProtocol.dataQualityRootGraphFetchTree
      ? (V1_buildDataQualityGraphFetchTree(
          elementProtocol.dataQualityRootGraphFetchTree,
          context,
          undefined,
          [],
          new V1_ProcessingContext(''),
          true,
        ) as DataQualityRootGraphFetchTree)
      : undefined;
  element.filter = elementProtocol.filter
    ? V1_buildRawLambdaWithResolvedPaths(
        elementProtocol.filter.parameters,
        elementProtocol.filter.body,
        context,
      )
    : undefined;
}

export function V1_buildDataQualityRelationValidationConfiguration(
  elementProtocol: V1_DataQualityRelationValidationsConfiguration,
  context: V1_GraphBuilderContext,
): void {
  const path = V1_buildFullPath(elementProtocol.package, elementProtocol.name);
  const element = getOwnDataQualityRelationValidationsConfiguration(
    path,
    context.currentSubGraph,
  );
  element.query = new DataQualityRelationQueryLambda();
  element.query.body = elementProtocol.query.body;
  element.query.parameters = elementProtocol.query.parameters.map((param) =>
    V1_buildVariable(param, context),
  );
  element.validations = elementProtocol.validations.map((validation) =>
    V1_buildDataQualityRelationValidation(validation, context),
  );
  element.runtime = elementProtocol.runtime
    ? (context.resolveElement(
        elementProtocol.runtime.path,
        false,
      ) as PackageableElementImplicitReference<PackageableRuntime>)
    : undefined;
}

export function V1_buildDataQualityServiceValidationConfiguration(
  elementProtocol: V1_DataQualityServiceValidationsConfiguration,
  context: V1_GraphBuilderContext,
): void {
  const path = V1_buildFullPath(elementProtocol.package, elementProtocol.name);
  const element = getOwnDataQualityServiceValidationsConfiguration(
    path,
    context.currentSubGraph,
  );
  element.contextName = elementProtocol.contextName;
  element.serviceName = elementProtocol.serviceName;
  element.dataQualityRootGraphFetchTree =
    elementProtocol.dataQualityRootGraphFetchTree
      ? (V1_buildDataQualityGraphFetchTree(
          elementProtocol.dataQualityRootGraphFetchTree,
          context,
          undefined,
          [],
          new V1_ProcessingContext(''),
          true,
        ) as DataQualityRootGraphFetchTree)
      : undefined;
}
