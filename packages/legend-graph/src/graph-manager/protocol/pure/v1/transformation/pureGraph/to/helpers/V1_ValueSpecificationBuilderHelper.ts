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
  guaranteeNonNullable,
  guaranteeType,
  UnsupportedOperationError,
  isNonNullable,
  uniq,
  returnUndefOnError,
  assertTrue,
} from '@finos/legend-shared';
import {
  PRIMITIVE_TYPE,
  SUPPORTED_FUNCTIONS,
} from '../../../../../../../../graph/MetaModelConst.js';
import {
  LambdaFunction,
  FunctionType,
  LambdaFunctionInstanceValue,
} from '../../../../../../../../graph/metamodel/pure/valueSpecification/LambdaFunction.js';
import { VariableExpression } from '../../../../../../../../graph/metamodel/pure/valueSpecification/VariableExpression.js';
import { Class } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/Class.js';
import type { AbstractProperty } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/AbstractProperty.js';
import {
  type GraphFetchTree,
  PropertyGraphFetchTree,
  RootGraphFetchTree,
  SubTypeGraphFetchTree,
  GraphFetchTreeInstanceValue,
} from '../../../../../../../../graph/metamodel/pure/valueSpecification/GraphFetchTree.js';
import { ValueSpecification } from '../../../../../../../../graph/metamodel/pure/valueSpecification/ValueSpecification.js';
import {
  SimpleFunctionExpression,
  AbstractPropertyExpression,
  FunctionExpression,
} from '../../../../../../../../graph/metamodel/pure/valueSpecification/Expression.js';
import { GenericType } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/GenericType.js';
import { GenericTypeExplicitReference } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/GenericTypeReference.js';
import {
  InstanceValue,
  PrimitiveInstanceValue,
  EnumValueInstanceValue,
  CollectionInstanceValue,
} from '../../../../../../../../graph/metamodel/pure/valueSpecification/InstanceValue.js';
import type { Type } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/Type.js';
import { PropertyExplicitReference } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/PropertyReference.js';
import { PackageableElementExplicitReference } from '../../../../../../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';
import type {
  V1_ValueSpecificationVisitor,
  V1_ValueSpecification,
} from '../../../../model/valueSpecification/V1_ValueSpecification.js';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext.js';
import type { V1_Lambda } from '../../../../model/valueSpecification/raw/V1_Lambda.js';
import { V1_Variable } from '../../../../model/valueSpecification/V1_Variable.js';
import { V1_ProcessingContext } from './V1_ProcessingContext.js';
import { V1_PropertyGraphFetchTree } from '../../../../model/valueSpecification/raw/classInstance/graph/V1_PropertyGraphFetchTree.js';
import { V1_Multiplicity } from '../../../../model/packageableElements/domain/V1_Multiplicity.js';
import { V1_RootGraphFetchTree } from '../../../../model/valueSpecification/raw/classInstance/graph/V1_RootGraphFetchTree.js';
import type { V1_GraphFetchTree } from '../../../../model/valueSpecification/raw/classInstance/graph/V1_GraphFetchTree.js';
import type { V1_AppliedFunction } from '../../../../model/valueSpecification/application/V1_AppliedFunction.js';
import type { V1_AppliedProperty } from '../../../../model/valueSpecification/application/V1_AppliedProperty.js';
import type { V1_CBoolean } from '../../../../model/valueSpecification/raw/V1_CBoolean.js';
import type { V1_CByteArray } from '../../../../model/valueSpecification/raw/V1_CByteArray.js';
import type { V1_CDateTime } from '../../../../model/valueSpecification/raw/V1_CDateTime.js';
import type { V1_CStrictTime } from '../../../../model/valueSpecification/raw/V1_CStrictTime.js';
import type { V1_CDecimal } from '../../../../model/valueSpecification/raw/V1_CDecimal.js';
import type { V1_CFloat } from '../../../../model/valueSpecification/raw/V1_CFloat.js';
import type { V1_CInteger } from '../../../../model/valueSpecification/raw/V1_CInteger.js';
import type { V1_CLatestDate } from '../../../../model/valueSpecification/raw/V1_CLatestDate.js';
import type { V1_Collection } from '../../../../model/valueSpecification/raw/V1_Collection.js';
import type { V1_CStrictDate } from '../../../../model/valueSpecification/raw/V1_CStrictDate.js';
import { V1_CString } from '../../../../model/valueSpecification/raw/V1_CString.js';
import type { V1_EnumValue } from '../../../../model/valueSpecification/raw/V1_EnumValue.js';
import type { V1_KeyExpression } from '../../../../model/valueSpecification/raw/V1_KeyExpression.js';
import { V1_getAppliedProperty } from './V1_DomainBuilderHelper.js';
import { Enumeration } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/Enumeration.js';
import { EnumValueExplicitReference } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/EnumValueReference.js';
import type { V1_PackageableElementPtr } from '../../../../model/valueSpecification/raw/V1_PackageableElementPtr.js';
import type { V1_INTERNAL__UnknownValueSpecification } from '../../../../model/valueSpecification/V1_INTERNAL__UnknownValueSpecfication.js';
import { INTERNAL__UnknownValueSpecification } from '../../../../../../../../graph/metamodel/pure/valueSpecification/INTERNAL__UnknownValueSpecification.js';
import { GraphBuilderError } from '../../../../../../../../graph-manager/GraphManagerUtils.js';
import { getEnumValue } from '../../../../../../../../graph/helpers/DomainHelper.js';
import { matchFunctionName } from '../../../../../../../../graph/MetaModelUtils.js';
import type { V1_ClassInstance } from '../../../../model/valueSpecification/raw/V1_ClassInstance.js';
import type { V1_GenericTypeInstance } from '../../../../model/valueSpecification/raw/V1_GenericTypeInstance.js';
import {
  V1_ClassInstanceType,
  V1_serializeValueSpecification,
} from '../../../pureProtocol/serializationHelpers/V1_ValueSpecificationSerializer.js';
import { Multiplicity } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/Multiplicity.js';
import {
  KeyExpression,
  KeyExpressionInstanceValue,
} from '../../../../../../../../graph/metamodel/pure/valueSpecification/KeyExpressionInstanceValue.js';
import { V1_SubTypeGraphFetchTree } from '../../../../model/valueSpecification/raw/classInstance/graph/V1_SubTypeGraphFetchTree.js';
import { findMappingLocalProperty } from '../../../../../../../../graph/helpers/DSL_Mapping_Helper.js';
import { getRelationTypeGenericType } from '../../../../../../../../graph/helpers/ValueSpecificationHelper.js';
import { Relation_RelationType } from '../../../../../../../../graph/metamodel/pure/packageableElements/relation/Relation_RelationType.js';
import { V1_getGenericTypeFullPath } from '../../../../helpers/V1_DomainHelper.js';
import { V1_createGenericTypeWithElementPath } from '../../from/V1_DomainTransformer.js';

const buildPrimtiveInstanceValue = (
  type: PRIMITIVE_TYPE,
  values: unknown[],
  context: V1_GraphBuilderContext,
): PrimitiveInstanceValue => {
  const _genericType = context.resolveGenericType(type);
  const instance = new PrimitiveInstanceValue(_genericType);
  instance.values = values;
  return instance;
};

export class V1_ValueSpecificationBuilder
  implements V1_ValueSpecificationVisitor<ValueSpecification>
{
  context: V1_GraphBuilderContext;
  processingContext: V1_ProcessingContext;
  openVariables: string[] = [];
  checkFunctionName?: boolean | undefined;

  constructor(
    context: V1_GraphBuilderContext,
    processingContext: V1_ProcessingContext,
    openVariables: string[],
    checkFunctionName?: boolean | undefined,
  ) {
    this.context = context;
    this.processingContext = processingContext;
    this.openVariables = openVariables;
    this.checkFunctionName = checkFunctionName;
  }

  visit_INTERNAL__UnknownValueSpecfication(
    valueSpecification: V1_INTERNAL__UnknownValueSpecification,
  ): ValueSpecification {
    const metamodel = new INTERNAL__UnknownValueSpecification(
      valueSpecification.content,
    );
    return metamodel;
  }

  visit_Variable(variable: V1_Variable): ValueSpecification {
    this.openVariables.push(variable.name);
    if (variable.genericType) {
      const multiplicity = this.context.graph.getMultiplicity(
        variable.multiplicity.lowerBound,
        variable.multiplicity.upperBound,
      );
      const ve = new VariableExpression(variable.name, multiplicity);
      ve.genericType = this.context.resolveGenericType(
        V1_getGenericTypeFullPath(variable.genericType),
      );
      this.processingContext.addInferredVariables(variable.name, ve);
      return ve;
    } else {
      const vs = this.processingContext.getInferredVariable(variable.name);
      if (!vs) {
        throw new GraphBuilderError(
          `Can't find variable '${variable.name}' in the graph`,
        );
      }
      return vs;
    }
  }

  visit_Lambda(valueSpecification: V1_Lambda): ValueSpecification {
    const instanceValue = new LambdaFunctionInstanceValue();
    instanceValue.values = [
      V1_buildLambdaBody(
        valueSpecification.body,
        valueSpecification.parameters,
        this.context,
        this.processingContext.clone(), // clone the context for lambda
      ),
    ];
    return instanceValue;
  }

  visit_KeyExpression(
    valueSpecification: V1_KeyExpression,
  ): ValueSpecification {
    const keyExpInstanceVal = new KeyExpressionInstanceValue();
    const processedExpression =
      valueSpecification.expression.accept_ValueSpecificationVisitor(
        new V1_ValueSpecificationBuilder(
          this.context,
          this.processingContext,
          this.openVariables,
        ),
      );
    const processedKey =
      valueSpecification.key.accept_ValueSpecificationVisitor(
        new V1_ValueSpecificationBuilder(
          this.context,
          this.processingContext,
          this.openVariables,
        ),
      );
    const key = guaranteeType(
      processedKey,
      PrimitiveInstanceValue,
      `Can't process key expression: key value must be a primitive instance value`,
    );
    const keyExpression = new KeyExpression(
      key,
      processedExpression,
      valueSpecification.add,
    );
    keyExpInstanceVal.values = [keyExpression];
    return keyExpInstanceVal;
  }

  visit_AppliedFunction(
    appliedFunction: V1_AppliedFunction,
  ): ValueSpecification {
    this.processingContext.push(
      `Applying function '${appliedFunction.function}'`,
    );
    if (matchFunctionName(appliedFunction.function, SUPPORTED_FUNCTIONS.LET)) {
      // We will build the let parameters to assign the right side of the expression to the left side
      const parameters = appliedFunction.parameters.map((expression) =>
        returnUndefOnError(() =>
          expression.accept_ValueSpecificationVisitor(
            new V1_ValueSpecificationBuilder(
              this.context,
              this.processingContext,
              this.openVariables,
            ),
          ),
        ),
      );
      const letName = guaranteeType(
        appliedFunction.parameters[0],
        V1_CString,
      ).value;
      // right side (value spec)
      const rightSide = parameters[1];
      const variableExpression = new VariableExpression(
        letName,
        rightSide?.multiplicity ?? Multiplicity.ONE,
      );

      variableExpression.genericType = rightSide?.genericType;
      this.processingContext.addInferredVariables(letName, variableExpression);
      this.openVariables.push(letName);
    }
    const func = V1_buildFunctionExpression(
      appliedFunction.function,
      appliedFunction.parameters,
      this.openVariables,
      this.context,
      this.processingContext,
      this.checkFunctionName,
    );
    this.processingContext.pop();

    return func;
  }

  visit_AppliedProperty(
    valueSpecification: V1_AppliedProperty,
  ): ValueSpecification {
    return V1_processProperty(
      this.context,
      this.openVariables,
      this.processingContext,
      valueSpecification.parameters,
      valueSpecification.property,
    );
  }

  visit_PackageableElementPtr(
    valueSpecification: V1_PackageableElementPtr,
  ): ValueSpecification {
    const instanceValue = new InstanceValue(
      Multiplicity.ONE,
      // generic type not required since packageable element not required to be a type
      returnUndefOnError(() =>
        this.context.resolveGenericType(valueSpecification.fullPath),
      ),
    );
    instanceValue.values = [
      this.context.resolveElement(valueSpecification.fullPath, false),
    ];
    return instanceValue;
  }

  visit_GenericTypeInstance(
    valueSpecification: V1_GenericTypeInstance,
  ): ValueSpecification {
    const instanceValue = new InstanceValue(
      Multiplicity.ONE,
      this.context.resolveGenericType(valueSpecification.fullPath),
    );
    return instanceValue;
  }

  visit_Collection(valueSpecification: V1_Collection): ValueSpecification {
    const instanceValue = new CollectionInstanceValue(
      this.context.graph.getMultiplicity(
        valueSpecification.multiplicity.lowerBound,
        valueSpecification.multiplicity.upperBound,
      ),
    );
    instanceValue.values = valueSpecification.values.map((v) =>
      v.accept_ValueSpecificationVisitor(
        new V1_ValueSpecificationBuilder(
          this.context,
          this.processingContext,
          this.openVariables,
        ),
      ),
    );
    // NOTE: Engine applies a more sophisticated `findMostCommon()` algorithm to find the collection's generic type. Here we only handle the case where the collection has one type.
    const typeValues = uniq(
      instanceValue.values
        .map((v) => v.genericType?.value.rawType)
        .filter(isNonNullable),
    );
    if (typeValues.length === 1) {
      instanceValue.genericType = GenericTypeExplicitReference.create(
        new GenericType(guaranteeNonNullable(typeValues[0])),
      );
    }
    return instanceValue;
  }

  visit_EnumValue(valueSpecification: V1_EnumValue): ValueSpecification {
    const instance = new EnumValueInstanceValue(
      this.context.resolveGenericType(valueSpecification.fullPath),
    );
    instance.values = [
      this.context.resolveEnumValue(
        valueSpecification.fullPath,
        valueSpecification.value,
      ),
    ];
    return instance;
  }

  visit_CInteger(valueSpecification: V1_CInteger): ValueSpecification {
    return buildPrimtiveInstanceValue(
      PRIMITIVE_TYPE.INTEGER,
      [valueSpecification.value],
      this.context,
    );
  }

  visit_CDecimal(valueSpecification: V1_CDecimal): ValueSpecification {
    return buildPrimtiveInstanceValue(
      PRIMITIVE_TYPE.DECIMAL,
      [valueSpecification.value],
      this.context,
    );
  }

  visit_CString(valueSpecification: V1_CString): ValueSpecification {
    return buildPrimtiveInstanceValue(
      PRIMITIVE_TYPE.STRING,
      [valueSpecification.value],
      this.context,
    );
  }

  visit_CBoolean(valueSpecification: V1_CBoolean): ValueSpecification {
    return buildPrimtiveInstanceValue(
      PRIMITIVE_TYPE.BOOLEAN,
      [valueSpecification.value],
      this.context,
    );
  }

  visit_CByteArray(valueSpecification: V1_CByteArray): ValueSpecification {
    const res = buildPrimtiveInstanceValue(
      PRIMITIVE_TYPE.BYTE,
      [valueSpecification.value], // Store a Base64String as the value for BYTE
      this.context,
    );

    return res;
  }

  visit_CFloat(valueSpecification: V1_CFloat): ValueSpecification {
    return buildPrimtiveInstanceValue(
      PRIMITIVE_TYPE.FLOAT,
      [valueSpecification.value],
      this.context,
    );
  }

  visit_CDateTime(valueSpecification: V1_CDateTime): ValueSpecification {
    return buildPrimtiveInstanceValue(
      PRIMITIVE_TYPE.DATETIME,
      [valueSpecification.value],
      this.context,
    );
  }

  visit_CStrictDate(valueSpecification: V1_CStrictDate): ValueSpecification {
    return buildPrimtiveInstanceValue(
      PRIMITIVE_TYPE.STRICTDATE,
      [valueSpecification.value],
      this.context,
    );
  }

  visit_CStrictTime(valueSpecification: V1_CStrictTime): ValueSpecification {
    return buildPrimtiveInstanceValue(
      PRIMITIVE_TYPE.STRICTTIME,
      [valueSpecification.value],
      this.context,
    );
  }

  visit_CLatestDate(valueSpecification: V1_CLatestDate): ValueSpecification {
    return buildPrimtiveInstanceValue(
      PRIMITIVE_TYPE.LATESTDATE,
      [],
      this.context,
    );
  }

  visit_ClassInstance(
    valueSpecification: V1_ClassInstance,
  ): ValueSpecification {
    switch (valueSpecification.type) {
      case V1_ClassInstanceType.ROOT_GRAPH_FETCH_TREE: {
        const instanceValue = new GraphFetchTreeInstanceValue();
        const protocol = guaranteeType(
          valueSpecification.value,
          V1_RootGraphFetchTree,
        );
        const tree = V1_buildGraphFetchTree(
          protocol,
          this.context,
          this.context.resolveClass(protocol.class).value,
          this.openVariables,
          this.processingContext,
        ) as RootGraphFetchTree;
        instanceValue.values = [tree];
        return instanceValue;
      }
      default: {
        const builders = this.context.extensions.plugins.flatMap(
          (plugin) => plugin.V1_getExtraClassInstanceValueBuilders?.() ?? [],
        );
        for (const builder of builders) {
          const value = builder(
            valueSpecification.value,
            valueSpecification.type,
            this.context,
          );
          if (value) {
            const instanceValue = new InstanceValue(Multiplicity.ONE);
            instanceValue.values = [value];
            return instanceValue;
          }
        }
        throw new UnsupportedOperationError(
          `Can't build class instance value of type '${valueSpecification.type}': no compatible builder available from plugins`,
        );
      }
    }
  }
}

// --------------------------------------------- Generic Constructs ---------------------------------------------

export function V1_buildLambdaBody(
  expressions: V1_ValueSpecification[],
  parameters: V1_Variable[],
  context: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): LambdaFunction {
  processingContext.push('Creating new lambda');
  const pureParameters = parameters.map(
    (parameter) =>
      parameter.accept_ValueSpecificationVisitor(
        new V1_ValueSpecificationBuilder(context, processingContext, []),
      ) as VariableExpression,
  );
  const openVariables: string[] = [];
  const _expressions = expressions.map((value) =>
    value.accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        context,
        processingContext,
        openVariables,
      ),
    ),
  );
  const firstExpression = guaranteeNonNullable(_expressions[0]);
  const functionType = new FunctionType(
    firstExpression.genericType
      ? PackageableElementExplicitReference.create(
          firstExpression.genericType.value.rawType,
        )
      : undefined,
    firstExpression.multiplicity,
  );
  functionType.parameters = pureParameters;
  processingContext.pop();
  const _lambda = new LambdaFunction(functionType);
  openVariables.forEach((v) => {
    const varExp = processingContext.getInferredVariable(v);
    if (varExp instanceof VariableExpression) {
      _lambda.openVariables.set(varExp.name, varExp);
    }
  });
  _lambda.expressionSequence = _expressions;
  return _lambda;
}

export function V1_buildValueSpecification(
  valueSpecification: V1_ValueSpecification,
  context: V1_GraphBuilderContext,
): ValueSpecification {
  return valueSpecification.accept_ValueSpecificationVisitor(
    new V1_ValueSpecificationBuilder(context, new V1_ProcessingContext(''), []),
  );
}

// ------------------------------------------ Property -----------------------------------------

export function V1_processProperty(
  context: V1_GraphBuilderContext,
  openVariables: string[],
  processingContext: V1_ProcessingContext,
  parameters: V1_ValueSpecification[],
  property: string,
): ValueSpecification {
  const firstParameter = parameters[0];
  const processedParameters = parameters.map((parameter) =>
    parameter.accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        context,
        processingContext,
        openVariables,
      ),
    ),
  );
  let inferredVariable: ValueSpecification | undefined;
  if (firstParameter instanceof V1_Variable) {
    inferredVariable = guaranteeType(
      processingContext.getInferredVariable(firstParameter.name),
      ValueSpecification,
    );
  } else {
    inferredVariable = processedParameters[0];
  }
  const inferredType =
    inferredVariable instanceof AbstractPropertyExpression
      ? inferredVariable.func.value.genericType.value.rawType
      : V1_resolvePropertyExpressionTypeInference(inferredVariable, context);
  if (inferredType instanceof Class) {
    const processedProperty = new AbstractPropertyExpression('');
    processedProperty.func = PropertyExplicitReference.create(
      V1_getAppliedProperty(inferredType, undefined, property),
    );
    processedProperty.parametersValues = processedParameters;
    return processedProperty;
  } else if (inferredType instanceof Enumeration) {
    const enumValueInstanceValue = new EnumValueInstanceValue(
      GenericTypeExplicitReference.create(new GenericType(inferredType)),
    );
    enumValueInstanceValue.values = [
      EnumValueExplicitReference.create(getEnumValue(inferredType, property)),
    ];
    return enumValueInstanceValue;
  } else if (inferredType instanceof Relation_RelationType) {
    const col = guaranteeNonNullable(
      inferredType.columns.find((e) => property === e.name),
      `Can't find property ${property} in relation`,
    );
    const _funcExp = new FunctionExpression(col.name);
    _funcExp.func = col;
    _funcExp.parametersValues = processedParameters;
    return _funcExp;
  }
  throw new UnsupportedOperationError(
    `Can't resolve property '${property}' of type '${inferredType?.name}'`,
  );
}

export const V1_buildBaseSimpleFunctionExpression = (
  processedParameters: ValueSpecification[],
  functionName: string,
  compileContext: V1_GraphBuilderContext,
): SimpleFunctionExpression => {
  const expression = new SimpleFunctionExpression(functionName);
  const func = returnUndefOnError(() =>
    compileContext.resolveFunction(functionName),
  );
  expression.func = func;
  if (func) {
    const val = func.value;
    expression.genericType = GenericTypeExplicitReference.create(
      new GenericType(val.returnType.value),
    );
    expression.multiplicity = val.returnMultiplicity;
  }
  expression.parametersValues = processedParameters;
  return expression;
};

/**
 * NOTE: this is a catch-all builder for all functions we support
 * This is extremely basic and will fail for any functions that needs proper
 * type-inferencing of the return and the parameters.
 */
export const V1_buildGenericFunctionExpression = (
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): SimpleFunctionExpression =>
  V1_buildBaseSimpleFunctionExpression(
    parameters.map((parameter) =>
      parameter.accept_ValueSpecificationVisitor(
        new V1_ValueSpecificationBuilder(
          compileContext,
          processingContext,
          openVariables,
        ),
      ),
    ),
    functionName,
    compileContext,
  );

export const V1_buildGenericLetFunctionExpression = (
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): SimpleFunctionExpression => {
  try {
    return V1_buildGenericFunctionExpression(
      functionName,
      parameters,
      openVariables,
      compileContext,
      processingContext,
    );
  } catch {
    // let statement
    assertTrue(
      matchFunctionName(functionName, SUPPORTED_FUNCTIONS.LET),
      'Expected let() function for custom let() handling',
    );
    assertTrue(parameters.length === 2, 'Let() function expects 2 parameters');
    const leftSide = guaranteeNonNullable(
      parameters[0],
      'Left side of let statement expected to be defined',
    ).accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        compileContext,
        processingContext,
        openVariables,
      ),
    );
    const rightSideParam = guaranteeNonNullable(parameters[1]);
    const rightSide =
      returnUndefOnError(() =>
        rightSideParam.accept_ValueSpecificationVisitor(
          new V1_ValueSpecificationBuilder(
            compileContext,
            processingContext,
            openVariables,
          ),
        ),
      ) ??
      new INTERNAL__UnknownValueSpecification(
        V1_serializeValueSpecification(
          rightSideParam,
          compileContext.extensions.plugins,
        ),
      );
    return V1_buildBaseSimpleFunctionExpression(
      [leftSide, rightSide],
      functionName,
      compileContext,
    );
  }
};
/**
 * This is fairly similar to how engine does function matching in a way.
 * Notice that Studio core should not attempt to do any function inferencing/matching
 * at all as the job is meant for engine.
 *
 * On the other hand, the function handling/matching plugin mechanism is meant
 * for extensions which should try to understand/match functions such as query builder.
 */
export function V1_buildFunctionExpression(
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
  // We don't want to throw error when we build valuespecification outside
  // query context (for ex: while building execution plan)
  checkFunctionName?: boolean | undefined,
): SimpleFunctionExpression {
  if (checkFunctionName === false) {
    return V1_buildGenericFunctionExpression(
      functionName,
      parameters,
      openVariables,
      compileContext,
      processingContext,
    );
  }
  if (matchFunctionName(functionName, Object.values(SUPPORTED_FUNCTIONS))) {
    if (matchFunctionName(functionName, SUPPORTED_FUNCTIONS.LET)) {
      return V1_buildGenericLetFunctionExpression(
        functionName,
        parameters,
        openVariables,
        compileContext,
        processingContext,
      );
    }
    // NOTE: this is a catch-all builder that is only meant for basic function expression
    // such as and(), or(), etc. It will fail when type-inferencing/function-matching is required
    // such as for project(), filter(), getAll(), etc.
    return V1_buildGenericFunctionExpression(
      functionName,
      parameters,
      openVariables,
      compileContext,
      processingContext,
    );
  }
  const extraFunctionExpressionBuilders =
    compileContext.extensions.plugins.flatMap(
      (plugin) => plugin.V1_getExtraFunctionExpressionBuilders?.() ?? [],
    );
  for (const builder of extraFunctionExpressionBuilders) {
    const metamodel = builder(
      functionName,
      parameters,
      openVariables,
      compileContext,
      processingContext,
    );
    if (metamodel) {
      return metamodel;
    }
  }
  throw new UnsupportedOperationError(
    `Can't find expression builder for function '${functionName}': no compatible function expression builder available from plugins`,
  );
}

export function V1_resolvePropertyExpressionTypeInference(
  inferredVariable: ValueSpecification | undefined,
  compileContext: V1_GraphBuilderContext,
): Type | undefined {
  const inferrers = compileContext.extensions.plugins.flatMap(
    (plugin) => plugin.V1_getExtraPropertyExpressionTypeInferrers?.() ?? [],
  );
  for (const inferrer of inferrers) {
    const inferredType = inferrer(inferredVariable);
    if (inferredType) {
      return inferredType;
    }
  }
  const relationType = inferredVariable
    ? getRelationTypeGenericType(inferredVariable)
    : undefined;
  if (relationType) {
    return relationType;
  }
  return inferredVariable?.genericType?.value.rawType;
}

// --------------------------------------------- Graph Fetch Tree ---------------------------------------------

export function V1_buildGraphFetchTree(
  graphFetchTree: V1_GraphFetchTree,
  context: V1_GraphBuilderContext,
  parentClass: Class | undefined,
  openVariables: string[],
  processingContext: V1_ProcessingContext,
  canResolveLocalProperty?: boolean | undefined,
): GraphFetchTree {
  if (graphFetchTree instanceof V1_PropertyGraphFetchTree) {
    return V1_buildPropertyGraphFetchTree(
      graphFetchTree,
      context,
      guaranteeNonNullable(parentClass),
      openVariables,
      processingContext,
      canResolveLocalProperty,
    );
  } else if (graphFetchTree instanceof V1_RootGraphFetchTree) {
    return V1_buildRootGraphFetchTree(
      graphFetchTree,
      context,
      openVariables,
      processingContext,
      canResolveLocalProperty,
    );
  } else if (graphFetchTree instanceof V1_SubTypeGraphFetchTree) {
    return buildSubTypeGraphFetchTree(
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

const createThisVariableForClass = (
  context: V1_GraphBuilderContext,
  classPackageString: string,
): VariableExpression => {
  const _classGenericType = context.resolveGenericType(classPackageString);
  const _var = new VariableExpression('this', Multiplicity.ONE);
  _var.genericType = _classGenericType;
  return _var;
};

export function V1_buildPropertyGraphFetchTree(
  propertyGraphFetchTree: V1_PropertyGraphFetchTree,
  context: V1_GraphBuilderContext,
  parentClass: Class,
  openVariables: string[],
  processingContext: V1_ProcessingContext,
  canResolveLocalProperty?: boolean | undefined,
): PropertyGraphFetchTree {
  let property: AbstractProperty;
  let pureParameters: ValueSpecification[] = [];
  if (propertyGraphFetchTree.parameters.length) {
    const thisVariable = new V1_Variable();
    thisVariable.name = 'this';
    thisVariable.genericType = V1_createGenericTypeWithElementPath(
      parentClass.path,
    );
    thisVariable.multiplicity = V1_Multiplicity.ONE;
    const parameters: V1_ValueSpecification[] =
      propertyGraphFetchTree.parameters.concat([thisVariable]);
    property = V1_getAppliedProperty(
      parentClass,
      parameters,
      propertyGraphFetchTree.property,
    );
    processingContext.push('Creating graph-fetch property tree');
    processingContext.addInferredVariables(
      'this',
      createThisVariableForClass(context, parentClass.path),
    );
    pureParameters = propertyGraphFetchTree.parameters.map((x) =>
      x.accept_ValueSpecificationVisitor(
        new V1_ValueSpecificationBuilder(
          context,
          processingContext,
          openVariables,
        ),
      ),
    );
    processingContext.flushVariable('this');
    processingContext.pop();
  } else {
    // While building property graph fetch tree, the Class of root graph
    // fetch tree is passed as the parentClass of property graph fetch tree.
    // This Class contains the properties of property graph fetch trees.
    // But sometimes, a local property is missing in the parentClass and
    // causing error in V1_getAppliedProperty.
    // To fix this, we get the local property from PureModel context.graph
    // mappings. The function findProperty() is used for this purpose.
    if (canResolveLocalProperty) {
      try {
        property = V1_getAppliedProperty(
          parentClass,
          undefined,
          propertyGraphFetchTree.property,
        );
      } catch (error) {
        const newProperty = findMappingLocalProperty(
          context.graph.mappings,
          propertyGraphFetchTree.property,
        );
        if (newProperty) {
          property = newProperty;
        } else {
          throw error;
        }
      }
    } else {
      property = V1_getAppliedProperty(
        parentClass,
        undefined,
        propertyGraphFetchTree.property,
      );
    }
  }
  const _subType = propertyGraphFetchTree.subType
    ? context.resolveClass(propertyGraphFetchTree.subType)
    : undefined;
  const _returnType = _subType?.value ?? property.genericType.value.rawType;
  let children: GraphFetchTree[] = [];
  if (propertyGraphFetchTree.subTrees.length) {
    const _returnTypeClasss = guaranteeType(
      _returnType,
      Class,
      'To have subtrees the type of the property must be complex',
    );
    children = propertyGraphFetchTree.subTrees.map((subTree) =>
      V1_buildGraphFetchTree(
        subTree,
        context,
        _returnTypeClasss,
        openVariables,
        processingContext,
        canResolveLocalProperty,
      ),
    );
  }
  const _propertyGraphFetchTree = new PropertyGraphFetchTree(
    PropertyExplicitReference.create(property),
    undefined,
  );
  _propertyGraphFetchTree.parameters = pureParameters;
  _propertyGraphFetchTree.alias = propertyGraphFetchTree.alias;
  _propertyGraphFetchTree.subType = _subType;
  _propertyGraphFetchTree.subTrees = children;
  return _propertyGraphFetchTree;
}

export function V1_buildRootGraphFetchTree(
  rootGraphFetchTree: V1_RootGraphFetchTree,
  context: V1_GraphBuilderContext,
  openVariables: string[],
  processingContext: V1_ProcessingContext,
  canResolveLocalProperty?: boolean | undefined,
): RootGraphFetchTree {
  const _class = context.resolveClass(rootGraphFetchTree.class);
  const subTreeChildren = rootGraphFetchTree.subTrees.map((subTree) =>
    V1_buildGraphFetchTree(
      subTree,
      context,
      _class.value,
      openVariables,
      processingContext,
      canResolveLocalProperty,
    ),
  );
  const subTypeTreeChildren = rootGraphFetchTree.subTypeTrees.map(
    (subTypeTree) =>
      buildSubTypeGraphFetchTree(
        subTypeTree,
        context,
        openVariables,
        processingContext,
        canResolveLocalProperty,
      ),
  );
  const _rootGraphFetchTree = new RootGraphFetchTree(
    PackageableElementExplicitReference.create(_class.value),
  );
  _rootGraphFetchTree.subTrees = subTreeChildren;
  _rootGraphFetchTree.subTypeTrees = subTypeTreeChildren;
  return _rootGraphFetchTree;
}

function buildSubTypeGraphFetchTree(
  subTypeGraphFetchTree: V1_SubTypeGraphFetchTree,
  context: V1_GraphBuilderContext,
  openVariables: string[],
  processingContext: V1_ProcessingContext,
  canResolveLocalProperty?: boolean | undefined,
): SubTypeGraphFetchTree {
  const subTypeClass = context.resolveClass(subTypeGraphFetchTree.subTypeClass);
  const children = subTypeGraphFetchTree.subTrees.map((subTree) =>
    V1_buildGraphFetchTree(
      subTree,
      context,
      subTypeClass.value,
      openVariables,
      processingContext,
      canResolveLocalProperty,
    ),
  );
  const _subTypeGraphFetchTree = new SubTypeGraphFetchTree(
    PackageableElementExplicitReference.create(subTypeClass.value),
  );
  _subTypeGraphFetchTree.subTrees = children;
  return _subTypeGraphFetchTree;
}
