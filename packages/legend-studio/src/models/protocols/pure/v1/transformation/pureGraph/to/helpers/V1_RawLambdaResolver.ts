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
  assertErrorThrown,
  returnUndefOnError,
} from '@finos/legend-studio-shared';
import { CORE_LOG_EVENT } from '../../../../../../../../utils/Logger';
import type { PackageableElement } from '../../../../../../../metamodels/pure/model/packageableElements/PackageableElement';
import type { PackageableElementImplicitReference } from '../../../../../../../metamodels/pure/model/packageableElements/PackageableElementReference';
import { RawLambda } from '../../../../../../../metamodels/pure/model/rawValueSpecification/RawLambda';
import { isValidFullPath } from '../../../../../../../MetaModelUtility';
import { V1_RawLambda } from '../../../../model/rawValueSpecification/V1_RawLambda';
import type { V1_AppliedFunction } from '../../../../model/valueSpecification/application/V1_AppliedFunction';
import type { V1_AppliedProperty } from '../../../../model/valueSpecification/application/V1_AppliedProperty';
import type { V1_PropertyGraphFetchTree } from '../../../../model/valueSpecification/raw/graph/V1_PropertyGraphFetchTree';
import type { V1_RootGraphFetchTree } from '../../../../model/valueSpecification/raw/graph/V1_RootGraphFetchTree';
import type { V1_Path } from '../../../../model/valueSpecification/raw/path/V1_Path';
import type { V1_AggregateValue } from '../../../../model/valueSpecification/raw/V1_AggregateValue';
import type { V1_CBoolean } from '../../../../model/valueSpecification/raw/V1_CBoolean';
import type { V1_CDateTime } from '../../../../model/valueSpecification/raw/V1_CDateTime';
import type { V1_CDecimal } from '../../../../model/valueSpecification/raw/V1_CDecimal';
import type { V1_CFloat } from '../../../../model/valueSpecification/raw/V1_CFloat';
import type { V1_CInteger } from '../../../../model/valueSpecification/raw/V1_CInteger';
import type { V1_Class } from '../../../../model/valueSpecification/raw/V1_Class';
import type { V1_CLatestDate } from '../../../../model/valueSpecification/raw/V1_CLatestDate';
import type { V1_Collection } from '../../../../model/valueSpecification/raw/V1_Collection';
import type { V1_CStrictDate } from '../../../../model/valueSpecification/raw/V1_CStrictDate';
import type { V1_CStrictTime } from '../../../../model/valueSpecification/raw/V1_CStrictTime';
import type { V1_CString } from '../../../../model/valueSpecification/raw/V1_CString';
import type { V1_Enum } from '../../../../model/valueSpecification/raw/V1_Enum';
import type { V1_EnumValue } from '../../../../model/valueSpecification/raw/V1_EnumValue';
import type { V1_ExecutionContextInstance } from '../../../../model/valueSpecification/raw/V1_ExecutionContextInstance';
import type { V1_KeyExpression } from '../../../../model/valueSpecification/raw/V1_KeyExpression';
import type { V1_Lambda } from '../../../../model/valueSpecification/raw/V1_Lambda';
import type { V1_MappingInstance } from '../../../../model/valueSpecification/raw/V1_MappingInstance';
import type { V1_Pair } from '../../../../model/valueSpecification/raw/V1_Pair';
import type { V1_PrimitiveType } from '../../../../model/valueSpecification/raw/V1_PrimitiveType';
import type { V1_PureList } from '../../../../model/valueSpecification/raw/V1_PureList';
import type { V1_RuntimeInstance } from '../../../../model/valueSpecification/raw/V1_RuntimeInstance';
import type { V1_SerializationConfig } from '../../../../model/valueSpecification/raw/V1_SerializationConfig';
import type { V1_TDSAggregateValue } from '../../../../model/valueSpecification/raw/V1_TDSAggregateValue';
import type { V1_TDSColumnInformation } from '../../../../model/valueSpecification/raw/V1_TDSColumnInformation';
import type { V1_TdsOlapAggregation } from '../../../../model/valueSpecification/raw/V1_TdsOlapAggregation';
import type { V1_TdsOlapRank } from '../../../../model/valueSpecification/raw/V1_TdsOlapRank';
import type { V1_TDSSortInformation } from '../../../../model/valueSpecification/raw/V1_TDSSortInformation';
import type { V1_UnitInstance } from '../../../../model/valueSpecification/raw/V1_UnitInstance';
import type { V1_UnitType } from '../../../../model/valueSpecification/raw/V1_UnitType';
import type {
  V1_ValueSpecification,
  V1_ValueSpecificationVisitor,
} from '../../../../model/valueSpecification/V1_ValueSpecification';
import type { V1_Variable } from '../../../../model/valueSpecification/V1_Variable';
import {
  V1_serializeRawValueSpecification,
  V1_deserializeRawValueSpecification,
} from '../../../pureProtocol/serializationHelpers/V1_RawValueSpecificationSerializationHelper';
import {
  V1_deserializeValueSpecification,
  V1_serializeValueSpecification,
} from '../../../pureProtocol/serializationHelpers/V1_ValueSpecificationSerializer';
import type { V1_GraphBuilderContext } from '../V1_GraphBuilderContext';

const V1_shouldResolvePath = (fullPath: string): boolean =>
  !isValidFullPath(fullPath);

export class V1_ValueSpecificationResolver
  implements V1_ValueSpecificationVisitor<V1_ValueSpecification>
{
  context: V1_GraphBuilderContext;
  hasModifiedLambda = false;
  constructor(context: V1_GraphBuilderContext) {
    this.context = context;
  }
  visit_Class(spec: V1_Class): V1_ValueSpecification {
    const classPath = spec.fullPath;
    if (V1_shouldResolvePath(classPath)) {
      spec.fullPath =
        returnUndefOnError(() =>
          V1_resolveElementPath(classPath, this.context.resolveClass, this),
        ) ?? classPath;
    }
    return spec;
  }
  visit_Enum(spec: V1_Enum): V1_ValueSpecification {
    const enumPath = spec.fullPath;
    if (V1_shouldResolvePath(enumPath)) {
      spec.fullPath =
        returnUndefOnError(() =>
          V1_resolveElementPath(
            enumPath,
            this.context.resolveEnumeration,
            this,
          ),
        ) ?? enumPath;
    }
    return spec;
  }
  visit_EnumValue(spec: V1_EnumValue): V1_ValueSpecification {
    const enumPath = spec.fullPath;
    if (V1_shouldResolvePath(enumPath)) {
      spec.fullPath =
        returnUndefOnError(() =>
          V1_resolveElementPath(
            enumPath,
            this.context.resolveEnumeration,
            this,
          ),
        ) ?? enumPath;
    }
    return spec;
  }
  visit_Variable(spec: V1_Variable): V1_ValueSpecification {
    const classPath = spec.class;
    if (classPath && V1_shouldResolvePath(classPath)) {
      spec.class =
        returnUndefOnError(() =>
          V1_resolveElementPath(classPath, this.context.resolveClass, this),
        ) ?? classPath;
    }
    return spec;
  }
  visit_Lambda(spec: V1_Lambda): V1_ValueSpecification {
    spec.body.forEach((v) => v.accept_ValueSpecificationVisitor(this));
    spec.parameters.forEach((v) => v.accept_ValueSpecificationVisitor(this));
    return spec;
  }
  visit_Path(valueSpecification: V1_Path): V1_ValueSpecification {
    return valueSpecification;
  }
  visit_AppliedFunction(spec: V1_AppliedFunction): V1_ValueSpecification {
    spec.parameters.forEach((v) => v.accept_ValueSpecificationVisitor(this));
    return spec;
  }
  visit_AppliedProperty(spec: V1_AppliedProperty): V1_ValueSpecification {
    const classPath = spec.class;
    if (classPath && V1_shouldResolvePath(classPath)) {
      spec.class =
        returnUndefOnError(() =>
          V1_resolveElementPath(classPath, this.context.resolveClass, this),
        ) ?? spec.class;
    }
    spec.parameters.forEach((v) => v.accept_ValueSpecificationVisitor(this));
    return spec;
  }
  visit_Collection(spec: V1_Collection): V1_ValueSpecification {
    spec.values.forEach((v) => v.accept_ValueSpecificationVisitor(this));
    return spec;
  }
  visit_CInteger(spec: V1_CInteger): V1_ValueSpecification {
    return spec;
  }
  visit_CDecimal(spec: V1_CDecimal): V1_ValueSpecification {
    return spec;
  }
  visit_CString(spec: V1_CString): V1_ValueSpecification {
    return spec;
  }
  visit_CBoolean(spec: V1_CBoolean): V1_ValueSpecification {
    return spec;
  }
  visit_CFloat(spec: V1_CFloat): V1_ValueSpecification {
    return spec;
  }
  visit_CDateTime(spec: V1_CDateTime): V1_ValueSpecification {
    return spec;
  }
  visit_CStrictDate(spec: V1_CStrictDate): V1_ValueSpecification {
    return spec;
  }
  visit_CStrictTime(spec: V1_CStrictTime): V1_ValueSpecification {
    return spec;
  }
  visit_CLatestDate(spec: V1_CLatestDate): V1_ValueSpecification {
    return spec;
  }
  visit_AggregateValue(spec: V1_AggregateValue): V1_ValueSpecification {
    spec.aggregateFn.accept_ValueSpecificationVisitor(this);
    spec.mapFn.accept_ValueSpecificationVisitor(this);
    return spec;
  }
  visit_Pair(spec: V1_Pair): V1_ValueSpecification {
    spec.first.accept_ValueSpecificationVisitor(this);
    spec.second.accept_ValueSpecificationVisitor(this);
    return spec;
  }
  visit_MappingInstance(spec: V1_MappingInstance): V1_ValueSpecification {
    const mappingPath = spec.fullPath;
    if (V1_shouldResolvePath(mappingPath)) {
      spec.fullPath =
        returnUndefOnError(() =>
          V1_resolveElementPath(mappingPath, this.context.resolveMapping, this),
        ) ?? mappingPath;
    }
    return spec;
  }
  visit_RuntimeInstance(spec: V1_RuntimeInstance): V1_ValueSpecification {
    return spec;
  }
  visit_ExecutionContextInstance(
    spec: V1_ExecutionContextInstance,
  ): V1_ValueSpecification {
    return spec;
  }
  visit_PureList(spec: V1_PureList): V1_ValueSpecification {
    spec.values.forEach((v) => v.accept_ValueSpecificationVisitor(this));
    return spec;
  }
  visit_RootGraphFetchTree(spec: V1_RootGraphFetchTree): V1_ValueSpecification {
    const classPath = spec.class;
    if (V1_shouldResolvePath(classPath)) {
      spec.class =
        returnUndefOnError(() =>
          V1_resolveElementPath(classPath, this.context.resolveClass, this),
        ) ?? classPath;
    }
    spec.subTrees.forEach((v) => v.accept_ValueSpecificationVisitor(this));
    return spec;
  }
  visit_PropertyGraphFetchTree(
    spec: V1_PropertyGraphFetchTree,
  ): V1_ValueSpecification {
    const subType = spec.subType;
    if (subType && V1_shouldResolvePath(subType)) {
      spec.subType =
        returnUndefOnError(() =>
          V1_resolveElementPath(subType, this.context.resolveType, this),
        ) ?? subType;
    }
    spec.parameters.forEach((v) => v.accept_ValueSpecificationVisitor(this));
    spec.subTrees.forEach((v) => v.accept_ValueSpecificationVisitor(this));
    return spec;
  }
  visit_SerializationConfig(
    spec: V1_SerializationConfig,
  ): V1_ValueSpecification {
    return spec;
  }
  visit_UnitType(spec: V1_UnitType): V1_ValueSpecification {
    const unitPath = spec.unitType;
    if (V1_shouldResolvePath(unitPath)) {
      spec.unitType =
        returnUndefOnError(() =>
          V1_resolveElementPath(unitPath, this.context.resolveUnit, this),
        ) ?? unitPath;
    }
    return spec;
  }
  visit_UnitInstance(spec: V1_UnitInstance): V1_ValueSpecification {
    const unitPath = spec.unitType;
    if (V1_shouldResolvePath(unitPath)) {
      spec.unitType =
        returnUndefOnError(() =>
          V1_resolveElementPath(unitPath, this.context.resolveUnit, this),
        ) ?? unitPath;
    }
    return spec;
  }
  visit_KeyExpression(spec: V1_KeyExpression): V1_ValueSpecification {
    spec.key.accept_ValueSpecificationVisitor(this);
    spec.expression.accept_ValueSpecificationVisitor(this);
    return spec;
  }
  visit_PrimitiveType(spec: V1_PrimitiveType): V1_ValueSpecification {
    return spec;
  }
  visit_TDSAggregateValue(spec: V1_TDSAggregateValue): V1_ValueSpecification {
    spec.pmapFn.accept_ValueSpecificationVisitor(this);
    spec.aggregateFn.accept_ValueSpecificationVisitor(this);
    return spec;
  }
  visit_TDSColumnInformation(
    spec: V1_TDSColumnInformation,
  ): V1_ValueSpecification {
    spec.columnFn.accept_ValueSpecificationVisitor(this);
    return spec;
  }
  visit_TDSSortInformation(spec: V1_TDSSortInformation): V1_ValueSpecification {
    return spec;
  }
  visit_TdsOlapRank(spec: V1_TdsOlapRank): V1_ValueSpecification {
    spec.function.accept_ValueSpecificationVisitor(this);
    return spec;
  }
  visit_TdsOlapAggregation(spec: V1_TdsOlapAggregation): V1_ValueSpecification {
    spec.function.accept_ValueSpecificationVisitor(this);
    return spec;
  }
}

function V1_resolveElementPath(
  path: string,
  resolverFunc: (
    path: string,
  ) => PackageableElementImplicitReference<PackageableElement>,
  resolver: V1_ValueSpecificationResolver,
): string {
  const resolvedPath = resolverFunc(path).value.path;
  // Note: this handles any system elements + primitve types already resolved. i.e String, ModelStore
  if (resolvedPath !== path) {
    resolver.hasModifiedLambda = true;
  }
  return resolvedPath;
}

const V1_transformV1RawLambdaToV1Lambda = (
  v1RawLambda: V1_RawLambda,
): V1_ValueSpecification => {
  const v1RawLambdaJson = V1_serializeRawValueSpecification(v1RawLambda);
  return V1_deserializeValueSpecification(v1RawLambdaJson);
};

const V1_transformV1LambdaToV1RawLambda = (
  v1Lambda: V1_ValueSpecification,
): V1_RawLambda => {
  const v1LambdaJson = V1_serializeValueSpecification(v1Lambda);
  const resolvedV1RawLambda = V1_deserializeRawValueSpecification(
    v1LambdaJson,
  ) as V1_RawLambda;
  return resolvedV1RawLambda;
};

/**
 * Method resolves element paths inside V1_RawLambda
 * To do this we take V1_RawLamba (body: object, parameters: obect) convert it to V1_Lambda and
 * resolve where possible (where an element path is defined as part of the value specification flow.
 * When completed we convert it back to V1_RawLambda.
 * This method ignores any function matching therefore if any time we encounter an error resolving an element path
 * inside the value specification, we continue on the graph unchanging the value spec.
 * We use this new resolved lamba if we have changed any element path (noted by the hasModifiedLambda flag)
 * The whole flow is wrapper around a try/catch and we use the orginal lambda if any errors arise from this flow.
 */
const V1_resolveLambdaElementPaths = (
  _context: V1_GraphBuilderContext,
  v1RawLambda: V1_RawLambda,
): V1_RawLambda => {
  try {
    // 1. Convert V1_RawLambda to V1_Lambda
    const v1lambda = V1_transformV1RawLambdaToV1Lambda(v1RawLambda);
    // 2. resolve V1_Lambda
    const resolver = new V1_ValueSpecificationResolver(_context);
    v1lambda.accept_ValueSpecificationVisitor(resolver);
    // if the resolver has modified lambda then convert V1_Lambda to V1RawLambda and return
    // else return orginal lambda
    return resolver.hasModifiedLambda
      ? V1_transformV1LambdaToV1RawLambda(v1lambda)
      : v1RawLambda;
  } catch (error: unknown) {
    // return orginal lambda if anything goes wrong
    assertErrorThrown(error);
    error.message = `Can't resolve element paths for lambda:\n${error.message}`;
    _context.logger.warn(CORE_LOG_EVENT.GRAPH_PROBLEM, error);
    return v1RawLambda;
  }
};
export const V1_rawLambdaBuilderWithResolver = (
  _context: V1_GraphBuilderContext,
  parameters?: object,
  body?: object,
): RawLambda => {
  const rawLambda = new V1_RawLambda();
  rawLambda.parameters = parameters ?? [];
  rawLambda.body = body ?? [];
  const resolverEnabled =
    !_context.options?.TEMPORARY__disableRawLambdaResolver &&
    !_context.options?.TEMPORARY__keepSectionIndex;
  let resolved = rawLambda;
  if (resolverEnabled) {
    resolved = V1_resolveLambdaElementPaths(_context, rawLambda);
  }
  return new RawLambda(resolved.parameters, resolved.body);
};
