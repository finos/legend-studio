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
  type GraphFetchTree,
  type V1_GraphFetchTree,
  PackageableElementPointerType,
  V1_PackageableElementPointer,
  V1_PropertyGraphFetchTree,
  V1_RootGraphFetchTree,
  V1_transformGraphFetchTree,
} from '@finos/legend-graph';
import { V1_DataQualityRootGraphFetchTree } from '../model/graphFetch/V1_DataQualityRootGraphFetchTree.js';
import { assertType, UnsupportedOperationError } from '@finos/legend-shared';
import { V1_DataQualityPropertyGraphFetchTree } from '../model/graphFetch/V1_DataQualityPropertyGraphFetchTree.js';
import {
  DataQualityPropertyGraphFetchTree,
  DataQualityRootGraphFetchTree,
} from '../../../../../graph/metamodel/pure/packageableElements/data-quality/DataQualityGraphFetchTree.js';
import {
  type DataQualityExecutionContext,
  DataSpaceDataQualityExecutionContext,
  MappingAndRuntimeDataQualityExecutionContext,
} from '../../../../../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';
import {
  type V1_DataQualityExecutionContext,
  V1_DataSpaceDataQualityExecutionContext,
  V1_MappingAndRuntimeDataQualityExecutionContext,
} from '../V1_DataQualityConstraintsConfiguration.js';
import { DATA_SPACE_ELEMENT_POINTER } from '@finos/legend-extension-dsl-data-space/graph';

export function V1_transformDataQualityGraphFetchTree(
  value: GraphFetchTree,
  inScope: string[],
  open: Map<string, unknown[]>,
  isParameter: boolean,
  useAppliedFunction: boolean,
): V1_GraphFetchTree {
  const v1_GraphFetchTree = V1_transformGraphFetchTree(
    value,
    inScope,
    open,
    isParameter,
    useAppliedFunction,
  );
  return V1_transformGraphFetchTreeToDataQualityGraphFetchTree(
    v1_GraphFetchTree,
    value,
  );
}

export function V1_transformGraphFetchTreeToDataQualityGraphFetchTree(
  v1_graphFetchTree: V1_GraphFetchTree,
  graphFetchTree: GraphFetchTree,
): V1_GraphFetchTree {
  if (v1_graphFetchTree instanceof V1_RootGraphFetchTree) {
    assertType(graphFetchTree, DataQualityRootGraphFetchTree);
    const v1_DataQualityRootGraphFetchTree =
      new V1_DataQualityRootGraphFetchTree();
    v1_DataQualityRootGraphFetchTree.class = v1_graphFetchTree.class;
    v1_DataQualityRootGraphFetchTree.constraints = graphFetchTree.constraints;
    v1_DataQualityRootGraphFetchTree.subTrees = v1_graphFetchTree.subTrees.map(
      (subTree, index) =>
        V1_transformGraphFetchTreeToDataQualityGraphFetchTree(
          subTree,
          graphFetchTree.subTrees[index]!,
        ),
    );
    return v1_DataQualityRootGraphFetchTree;
  }
  if (v1_graphFetchTree instanceof V1_PropertyGraphFetchTree) {
    assertType(graphFetchTree, DataQualityPropertyGraphFetchTree);
    const v1_DataQualityPropertyGraphFetchTree =
      new V1_DataQualityPropertyGraphFetchTree();
    v1_DataQualityPropertyGraphFetchTree.alias = v1_graphFetchTree.alias;
    v1_DataQualityPropertyGraphFetchTree.parameters =
      v1_graphFetchTree.parameters;
    v1_DataQualityPropertyGraphFetchTree.property = v1_graphFetchTree.property;
    v1_DataQualityPropertyGraphFetchTree.subType = v1_graphFetchTree.subType;
    v1_DataQualityPropertyGraphFetchTree.constraints =
      graphFetchTree.constraints;
    v1_DataQualityPropertyGraphFetchTree.subTrees =
      v1_graphFetchTree.subTrees.map((subTree, index) =>
        V1_transformGraphFetchTreeToDataQualityGraphFetchTree(
          subTree,
          graphFetchTree.subTrees[index]!,
        ),
      );
    return v1_DataQualityPropertyGraphFetchTree;
  }
  throw new UnsupportedOperationError(
    `Can't transform graph fetch tree to data quality graph fetch tree`,
  );
}

export function V1_transformDataQualityExecutionContext(
  value: DataQualityExecutionContext,
): V1_DataQualityExecutionContext {
  if (value instanceof DataSpaceDataQualityExecutionContext) {
    const dataSpaceExecutionContext =
      new V1_DataSpaceDataQualityExecutionContext();
    dataSpaceExecutionContext.context = value.context!;
    dataSpaceExecutionContext.dataSpace = new V1_PackageableElementPointer(
      DATA_SPACE_ELEMENT_POINTER,
      value.dataSpace.valueForSerialization ?? '',
    );
    return dataSpaceExecutionContext;
  } else if (value instanceof MappingAndRuntimeDataQualityExecutionContext) {
    const mappingAndRuntimeExecutionContext =
      new V1_MappingAndRuntimeDataQualityExecutionContext();
    mappingAndRuntimeExecutionContext.mapping =
      new V1_PackageableElementPointer(
        PackageableElementPointerType.MAPPING,
        value.mapping.valueForSerialization ?? '',
      );
    mappingAndRuntimeExecutionContext.runtime =
      new V1_PackageableElementPointer(
        PackageableElementPointerType.RUNTIME,
        value.runtime.valueForSerialization ?? '',
      );
    return mappingAndRuntimeExecutionContext;
  }
  throw new UnsupportedOperationError(
    `Can't build data quality execution context '${value.toString()}'`,
  );
}
