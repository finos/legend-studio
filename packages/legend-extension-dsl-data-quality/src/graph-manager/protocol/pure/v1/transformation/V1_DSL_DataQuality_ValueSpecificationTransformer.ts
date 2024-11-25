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
  type V1_GraphTransformerContext,
  type V1_RawVariable,
  PackageableElementPointerType,
  V1_PackageableElementPointer,
  V1_PropertyGraphFetchTree,
  V1_RootGraphFetchTree,
  V1_transformGraphFetchTree,
  V1_transformRawLambda,
  V1_initPackageableElement,
  V1_RawValueSpecificationTransformer,
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
  type DataQualityRelationValidation,
  type DataQualityRelationValidationConfiguration,
  type DataQualityClassValidationsConfiguration,
  DataSpaceDataQualityExecutionContext,
  MappingAndRuntimeDataQualityExecutionContext,
} from '../../../../../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';
import {
  type V1_DataQualityExecutionContext,
  V1_DataQualityClassValidationsConfiguration,
  V1_DataQualityRelationValidation,
  V1_DataQualityRelationValidationsConfiguration,
  V1_DataSpaceDataQualityExecutionContext,
  V1_MappingAndRuntimeDataQualityExecutionContext,
  V1_DataQualityRelationQueryLambda,
} from '../V1_DataQualityValidationConfiguration.js';
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

export function V1_transformDataQualityRelationValidation(
  value: DataQualityRelationValidation,
  context: V1_GraphTransformerContext,
): V1_DataQualityRelationValidation {
  const relationConstraint = new V1_DataQualityRelationValidation();
  relationConstraint.name = value.name;
  relationConstraint.description = value.description;
  relationConstraint.assertion = V1_transformRawLambda(
    value.assertion,
    context,
  );
  relationConstraint.type = value.type;
  relationConstraint.rowMapFunction = value.rowMapFunction
    ? V1_transformRawLambda(value.rowMapFunction, context)
    : value.rowMapFunction;
  return relationConstraint;
}

export function V1_transformDataQualityClassValidationConfiguration(
  metamodel: DataQualityClassValidationsConfiguration,
  context: V1_GraphTransformerContext,
): V1_DataQualityClassValidationsConfiguration {
  const protocol = new V1_DataQualityClassValidationsConfiguration();
  V1_initPackageableElement(protocol, metamodel);
  protocol.name = metamodel.name;
  protocol.package = metamodel.package?.path ?? '';
  protocol.dataQualityRootGraphFetchTree =
    metamodel.dataQualityRootGraphFetchTree
      ? (V1_transformDataQualityGraphFetchTree(
          metamodel.dataQualityRootGraphFetchTree,
          [],
          new Map<string, unknown[]>(),
          false,
          false,
        ) as V1_DataQualityRootGraphFetchTree)
      : undefined;
  protocol.context = V1_transformDataQualityExecutionContext(metamodel.context);
  protocol.filter = metamodel.filter
    ? V1_transformRawLambda(metamodel.filter, context)
    : undefined;
  return protocol;
}

export function V1_transformDataQualityRelationValidationConfiguration(
  metamodel: DataQualityRelationValidationConfiguration,
  context: V1_GraphTransformerContext,
): V1_DataQualityRelationValidationsConfiguration {
  const protocol = new V1_DataQualityRelationValidationsConfiguration();
  V1_initPackageableElement(protocol, metamodel);
  protocol.name = metamodel.name;
  protocol.package = metamodel.package?.path ?? '';
  protocol.validations = metamodel.validations.map((validation) =>
    V1_transformDataQualityRelationValidation(validation, context),
  );
  protocol.query = new V1_DataQualityRelationQueryLambda();
  protocol.query.body = metamodel.query.body;
  protocol.query.parameters = metamodel.query.parameters.map(
    (v) =>
      v.accept_RawValueSpecificationVisitor(
        new V1_RawValueSpecificationTransformer(context),
      ) as V1_RawVariable,
  );
  return protocol;
}
