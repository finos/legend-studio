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
  V1_DataSpaceDataQualityExecutionContext,
  V1_MappingAndRuntimeDataQualityExecutionContext,
} from '../V1_DataQualityConstraintsConfiguration.js';
import {
  type DataQualityExecutionContext,
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
  type V1_ProcessingContext,
  type V1_PropertyGraphFetchTree,
  type V1_RootGraphFetchTree,
  V1_buildPropertyGraphFetchTree,
  V1_buildRootGraphFetchTree,
} from '@finos/legend-graph';
import type { DataSpace } from '@finos/legend-extension-dsl-data-space/graph';

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
        V1_rootGraphFetchTree.subTrees[index]!,
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
        V1_propertyGraphFetchTree.subTrees[index]!,
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
