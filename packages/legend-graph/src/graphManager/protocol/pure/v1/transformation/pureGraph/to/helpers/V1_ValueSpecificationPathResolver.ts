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
  LogEvent,
  assertErrorThrown,
  returnUndefOnError,
} from '@finos/legend-shared';
import { GRAPH_MANAGER_EVENT } from '../../../../../../../../graphManager/GraphManagerEvent.js';
import type { PackageableElement } from '../../../../../../../../graph/metamodel/pure/packageableElements/PackageableElement.js';
import type { PackageableElementReference } from '../../../../../../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';
import { RawLambda } from '../../../../../../../../graph/metamodel/pure/rawValueSpecification/RawLambda.js';
import { isValidFullPath } from '../../../../../../../../graph/MetaModelUtils.js';
import { V1_RawLambda } from '../../../../model/rawValueSpecification/V1_RawLambda.js';
import type { V1_AppliedFunction } from '../../../../model/valueSpecification/application/V1_AppliedFunction.js';
import type { V1_AppliedProperty } from '../../../../model/valueSpecification/application/V1_AppliedProperty.js';
import type { V1_PropertyGraphFetchTree } from '../../../../model/valueSpecification/raw/graph/V1_PropertyGraphFetchTree.js';
import type { V1_RootGraphFetchTree } from '../../../../model/valueSpecification/raw/graph/V1_RootGraphFetchTree.js';
import type { V1_Path } from '../../../../model/valueSpecification/raw/path/V1_Path.js';
import type { V1_AggregateValue } from '../../../../model/valueSpecification/raw/V1_AggregateValue.js';
import type { V1_CBoolean } from '../../../../model/valueSpecification/raw/V1_CBoolean.js';
import type { V1_CDateTime } from '../../../../model/valueSpecification/raw/V1_CDateTime.js';
import type { V1_CDecimal } from '../../../../model/valueSpecification/raw/V1_CDecimal.js';
import type { V1_CFloat } from '../../../../model/valueSpecification/raw/V1_CFloat.js';
import type { V1_CInteger } from '../../../../model/valueSpecification/raw/V1_CInteger.js';
import type { V1_CLatestDate } from '../../../../model/valueSpecification/raw/V1_CLatestDate.js';
import type { V1_Collection } from '../../../../model/valueSpecification/raw/V1_Collection.js';
import type { V1_CStrictDate } from '../../../../model/valueSpecification/raw/V1_CStrictDate.js';
import type { V1_CStrictTime } from '../../../../model/valueSpecification/raw/V1_CStrictTime.js';
import type { V1_CString } from '../../../../model/valueSpecification/raw/V1_CString.js';
import type { V1_EnumValue } from '../../../../model/valueSpecification/raw/V1_EnumValue.js';
import type { V1_ExecutionContextInstance } from '../../../../model/valueSpecification/raw/V1_ExecutionContextInstance.js';
import type { V1_HackedClass } from '../../../../model/valueSpecification/raw/V1_HackedClass.js';
import type { V1_HackedUnit } from '../../../../model/valueSpecification/raw/V1_HackedUnit.js';
import type { V1_KeyExpression } from '../../../../model/valueSpecification/raw/V1_KeyExpression.js';
import type { V1_Lambda } from '../../../../model/valueSpecification/raw/V1_Lambda.js';
import type { V1_PackageableElementPtr } from '../../../../model/valueSpecification/raw/V1_PackageableElementPtr.js';
import type { V1_Pair } from '../../../../model/valueSpecification/raw/V1_Pair.js';
import type { V1_PrimitiveType } from '../../../../model/valueSpecification/raw/V1_PrimitiveType.js';
import type { V1_PureList } from '../../../../model/valueSpecification/raw/V1_PureList.js';
import type { V1_RuntimeInstance } from '../../../../model/valueSpecification/raw/V1_RuntimeInstance.js';
import type { V1_SerializationConfig } from '../../../../model/valueSpecification/raw/V1_SerializationConfig.js';
import type { V1_TDSAggregateValue } from '../../../../model/valueSpecification/raw/V1_TDSAggregateValue.js';
import type { V1_TDSColumnInformation } from '../../../../model/valueSpecification/raw/V1_TDSColumnInformation.js';
import type { V1_TDSOlapAggregation } from '../../../../model/valueSpecification/raw/V1_TDSOlapAggregation.js';
import type { V1_TDSOlapRank } from '../../../../model/valueSpecification/raw/V1_TDSOlapRank.js';
import type { V1_TDSSortInformation } from '../../../../model/valueSpecification/raw/V1_TDSSortInformation.js';
import type { V1_UnitInstance } from '../../../../model/valueSpecification/raw/V1_UnitInstance.js';
import type { V1_UnitType } from '../../../../model/valueSpecification/raw/V1_UnitType.js';
import type { V1_INTERNAL__UnknownValueSpecification } from '../../../../model/valueSpecification/V1_INTERNAL__UnknownValueSpecfication.js';
import type {
  V1_ValueSpecification,
  V1_ValueSpecificationVisitor,
} from '../../../../model/valueSpecification/V1_ValueSpecification.js';
import type { V1_Variable } from '../../../../model/valueSpecification/V1_Variable.js';
import {
  V1_serializeRawValueSpecification,
  V1_deserializeRawValueSpecification,
} from '../../../pureProtocol/serializationHelpers/V1_RawValueSpecificationSerializationHelper.js';
import {
  V1_deserializeValueSpecification,
  V1_serializeValueSpecification,
} from '../../../pureProtocol/serializationHelpers/V1_ValueSpecificationSerializer.js';
import type { V1_GraphBuilderContext } from '../V1_GraphBuilderContext.js';

class V1_ValueSpecificationPathResolver
  implements V1_ValueSpecificationVisitor<V1_ValueSpecification>
{
  context: V1_GraphBuilderContext;
  /**
   * This flag is an optimization we do so the consumer can tell if any modification to the protocol
   * models happened as part of path resolution.
   */
  hasModified = false;

  constructor(context: V1_GraphBuilderContext) {
    this.context = context;
  }

  visit_INTERNAL__UnknownValueSpecfication(
    spec: V1_INTERNAL__UnknownValueSpecification,
  ): V1_ValueSpecification {
    return spec;
  }

  visit_PackageableElementPtr(
    spec: V1_PackageableElementPtr,
  ): V1_ValueSpecification {
    const path = spec.fullPath;
    if (!isValidFullPath(path)) {
      spec.fullPath =
        returnUndefOnError(() =>
          V1_resolveElementPath(
            path,
            (_path) => this.context.resolveElement(_path, false),
            this,
          ),
        ) ?? path;
    }
    return spec;
  }

  visit_HackedClass(spec: V1_HackedClass): V1_ValueSpecification {
    return this.visit_PackageableElementPtr(spec);
  }

  visit_HackedUnit(spec: V1_HackedUnit): V1_ValueSpecification {
    const path = spec.unitType;
    if (!isValidFullPath(path)) {
      spec.unitType =
        returnUndefOnError(() =>
          V1_resolveElementPath(
            path,
            (_path) => this.context.resolveElement(_path, false),
            this,
          ),
        ) ?? path;
    }
    return spec;
  }

  visit_EnumValue(spec: V1_EnumValue): V1_ValueSpecification {
    const enumPath = spec.fullPath;
    if (!isValidFullPath(enumPath)) {
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
    if (classPath && !isValidFullPath(classPath)) {
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
    if (classPath && !isValidFullPath(classPath)) {
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
    if (!isValidFullPath(classPath)) {
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
    if (subType && !isValidFullPath(subType)) {
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
    if (!isValidFullPath(unitPath)) {
      spec.unitType =
        returnUndefOnError(() =>
          V1_resolveElementPath(unitPath, this.context.resolveUnit, this),
        ) ?? unitPath;
    }
    return spec;
  }
  visit_UnitInstance(spec: V1_UnitInstance): V1_ValueSpecification {
    const unitPath = spec.unitType;
    if (!isValidFullPath(unitPath)) {
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
  visit_TDSOlapRank(spec: V1_TDSOlapRank): V1_ValueSpecification {
    spec.function.accept_ValueSpecificationVisitor(this);
    return spec;
  }
  visit_TDSOlapAggregation(spec: V1_TDSOlapAggregation): V1_ValueSpecification {
    spec.function.accept_ValueSpecificationVisitor(this);
    return spec;
  }
}

function V1_resolveElementPath(
  path: string,
  resolverFunc: (
    path: string,
  ) => PackageableElementReference<PackageableElement>,
  resolver: V1_ValueSpecificationPathResolver,
): string {
  const resolvedPath = resolverFunc(path).value.path;
  if (resolvedPath !== path) {
    resolver.hasModified = true;
  }
  return resolvedPath;
}

/**
 * Method resolves element paths inside raw lambda.
 *
 * To do this we take RawLamba (body: object, parameters: obect) convert it to Lambda and
 * resolve paths using section index where possible (wherever an element path is defined as
 * part of the value specification flow. When completed we convert it back to raw lambda.
 *
 * This method ignores any function matching therefore if any time we encounter an error resolving an
 * element path inside the value specification, we continue on the graph unchanging the value spec.
 * We use this new resolved lambda if we have changed any element path.
 *
 * NOTE: Here we fail silently, and we would use the orginal lambda if any errors arise from this procedure.
 */
const V1_resolveLambdaElementPaths = (
  rawLambdaProtocol: V1_RawLambda,
  context: V1_GraphBuilderContext,
): V1_RawLambda => {
  try {
    // Convert raw lambda to V1 lambda
    const lambdaProtocol = V1_deserializeValueSpecification(
      V1_serializeRawValueSpecification(rawLambdaProtocol),
    );
    // Resolve paths in V1 lambda
    const resolver = new V1_ValueSpecificationPathResolver(context);
    lambdaProtocol.accept_ValueSpecificationVisitor(resolver);
    // if the resolver has modified the lambda then convert lambda back to raw lambda and return
    // else return orginal lambda (this check saves us the work to convert between
    // raw protocol and protocol forms)
    return resolver.hasModified
      ? (V1_deserializeRawValueSpecification(
          V1_serializeValueSpecification(lambdaProtocol),
        ) as V1_RawLambda)
      : rawLambdaProtocol;
  } catch (error) {
    assertErrorThrown(error);
    // silently return orginal lambda if anything goes wrong
    error.message = `Can't resolve element paths for lambda:\n${error.message}`;
    context.log.warn(
      LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_FAILURE),
      error,
    );
    return rawLambdaProtocol;
  }
};

/**
 * This method will traverse through the lambda protocol model tree
 * and **with best effort** try to rewrite the lambda so all shortened
 * paths inside the lambda are fully resolved.
 *
 * This is needed since apps like `Studio` leave value specifications raw/unprocessed
 * when building the graph, hence any modification to section index or imports
 * will not apply to the raw value specification (for the contrast, see the
 * behavior of references)
 */
export const V1_buildRawLambdaWithResolvedPaths = (
  parameters: object | undefined,
  body: object | undefined,
  context: V1_GraphBuilderContext,
): RawLambda => {
  const rawLambda = new V1_RawLambda();
  rawLambda.parameters = parameters ?? [];
  rawLambda.body = body ?? [];
  let resolved = rawLambda;
  if (context.enableRawLambdaAutoPathResolution) {
    resolved = V1_resolveLambdaElementPaths(rawLambda, context);
  }
  return new RawLambda(resolved.parameters, resolved.body);
};
