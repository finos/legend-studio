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
  Pair,
  guaranteeNonNullable,
  guaranteeType,
  UnsupportedOperationError,
  isNonNullable,
  uniq,
  returnUndefOnError,
} from '@finos/legend-shared';
import {
  TYPICAL_MULTIPLICITY_TYPE,
  PRIMITIVE_TYPE,
  SUPPORTED_FUNCTIONS,
} from '../../../../../../../../graph/MetaModelConst.js';
import {
  LambdaFunction,
  FunctionType,
  LambdaFunctionInstanceValue,
} from '../../../../../../../../graph/metamodel/pure/valueSpecification/LambdaFunction.js';
import {
  type ExecutionContext,
  BaseExecutionContext,
  AnalyticsExecutionContext,
} from '../../../../../../../../graph/metamodel/pure/valueSpecification/ExecutionContext.js';
import { VariableExpression } from '../../../../../../../../graph/metamodel/pure/valueSpecification/VariableExpression.js';
import { Class } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/Class.js';
import type { AbstractProperty } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/AbstractProperty.js';
import {
  type GraphFetchTree,
  PropertyGraphFetchTree,
  RootGraphFetchTree,
  PropertyGraphFetchTreeInstanceValue,
  RootGraphFetchTreeInstanceValue,
} from '../../../../../../../../graph/metamodel/pure/valueSpecification/GraphFetchTree.js';
import { ValueSpecification } from '../../../../../../../../graph/metamodel/pure/valueSpecification/ValueSpecification.js';
import {
  SimpleFunctionExpression,
  AbstractPropertyExpression,
} from '../../../../../../../../graph/metamodel/pure/valueSpecification/Expression.js';
import { GenericType } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/GenericType.js';
import { GenericTypeExplicitReference } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/GenericTypeReference.js';
import {
  InstanceValue,
  PrimitiveInstanceValue,
  EnumValueInstanceValue,
  PairInstanceValue,
  PureListInstanceValue,
  CollectionInstanceValue,
} from '../../../../../../../../graph/metamodel/pure/valueSpecification/InstanceValue.js';
import type { Multiplicity } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/Multiplicity.js';
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
import type { V1_ExecutionContext } from '../../../../model/valueSpecification/raw/executionContext/V1_ExecutionContext.js';
import { V1_BaseExecutionContext } from '../../../../model/valueSpecification/raw/executionContext/V1_BaseExecutionContext.js';
import { V1_AnalyticsExecutionContext } from '../../../../model/valueSpecification/raw/executionContext/V1_AnalyticsExecutionContext.js';
import { V1_PropertyGraphFetchTree } from '../../../../model/valueSpecification/raw/graph/V1_PropertyGraphFetchTree.js';
import { V1_Multiplicity } from '../../../../model/packageableElements/domain/V1_Multiplicity.js';
import { V1_RootGraphFetchTree } from '../../../../model/valueSpecification/raw/graph/V1_RootGraphFetchTree.js';
import type { V1_GraphFetchTree } from '../../../../model/valueSpecification/raw/graph/V1_GraphFetchTree.js';
import type { V1_AppliedFunction } from '../../../../model/valueSpecification/application/V1_AppliedFunction.js';
import type { V1_AppliedProperty } from '../../../../model/valueSpecification/application/V1_AppliedProperty.js';
import type { V1_AggregateValue } from '../../../../model/valueSpecification/raw/V1_AggregateValue.js';
import type { V1_CBoolean } from '../../../../model/valueSpecification/raw/V1_CBoolean.js';
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
import type { V1_ExecutionContextInstance } from '../../../../model/valueSpecification/raw/V1_ExecutionContextInstance.js';
import type { V1_KeyExpression } from '../../../../model/valueSpecification/raw/V1_KeyExpression.js';
import type { V1_Pair } from '../../../../model/valueSpecification/raw/V1_Pair.js';
import type { V1_Path } from '../../../../model/valueSpecification/raw/path/V1_Path.js';
import type { V1_PrimitiveType } from '../../../../model/valueSpecification/raw/V1_PrimitiveType.js';
import type { V1_PureList } from '../../../../model/valueSpecification/raw/V1_PureList.js';
import type { V1_RuntimeInstance } from '../../../../model/valueSpecification/raw/V1_RuntimeInstance.js';
import type { V1_SerializationConfig } from '../../../../model/valueSpecification/raw/V1_SerializationConfig.js';
import type { V1_TDSAggregateValue } from '../../../../model/valueSpecification/raw/V1_TDSAggregateValue.js';
import type { V1_TDSColumnInformation } from '../../../../model/valueSpecification/raw/V1_TDSColumnInformation.js';
import type { V1_TdsOlapAggregation } from '../../../../model/valueSpecification/raw/V1_TDSOlapAggregation.js';
import type { V1_TdsOlapRank } from '../../../../model/valueSpecification/raw/V1_TDSOlapRank.js';
import type { V1_TDSSortInformation } from '../../../../model/valueSpecification/raw/V1_TDSSortInformation.js';
import type { V1_UnitInstance } from '../../../../model/valueSpecification/raw/V1_UnitInstance.js';
import type { V1_UnitType } from '../../../../model/valueSpecification/raw/V1_UnitType.js';
import { V1_getAppliedProperty } from './V1_DomainBuilderHelper.js';
import { Enumeration } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/Enumeration.js';
import { EnumValueExplicitReference } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/EnumValueReference.js';
import type { V1_PackageableElementPtr } from '../../../../model/valueSpecification/raw/V1_PackageableElementPtr.js';
import type { V1_HackedClass } from '../../../../model/valueSpecification/raw/V1_HackedClass.js';
import type { V1_HackedUnit } from '../../../../model/valueSpecification/raw/V1_HackedUnit.js';
import type { V1_INTERNAL__UnknownValueSpecification } from '../../../../model/valueSpecification/V1_INTERNAL__UnknownValueSpecfication.js';
import { INTERNAL__UnknownValueSpecification } from '../../../../../../../../graph/metamodel/pure/valueSpecification/INTERNAL__UnknownValueSpecification.js';
import { GraphBuilderError } from '../../../../../../../../graphManager/GraphManagerUtils.js';
import { getEnumValue } from '../../../../../../../../graph/helpers/DomainHelper.js';
import { matchFunctionName } from '../../../../../../../../graph/MetaModelUtils.js';

const LET_FUNCTION = 'letFunction';

const buildPrimtiveInstanceValue = (
  type: PRIMITIVE_TYPE,
  values: unknown[],
  context: V1_GraphBuilderContext,
  multiplicity: Multiplicity,
): PrimitiveInstanceValue => {
  const _genericType = context.resolveGenericType(type);
  const instance = new PrimitiveInstanceValue(_genericType, multiplicity);
  instance.values = values;
  return instance;
};

export class V1_ValueSpecificationBuilder
  implements V1_ValueSpecificationVisitor<ValueSpecification>
{
  context: V1_GraphBuilderContext;
  processingContext: V1_ProcessingContext;
  openVariables: string[] = [];

  constructor(
    context: V1_GraphBuilderContext,
    processingContext: V1_ProcessingContext,
    openVariables: string[],
  ) {
    this.context = context;
    this.processingContext = processingContext;
    this.openVariables = openVariables;
  }

  visit_INTERNAL__UnknownValueSpecfication(
    valueSpecification: V1_INTERNAL__UnknownValueSpecification,
  ): ValueSpecification {
    const metamodel = new INTERNAL__UnknownValueSpecification(
      valueSpecification.content,
    );
    return metamodel;
  }

  // --------------------------------------------- Function ---------------------------------------------

  visit_Variable(variable: V1_Variable): ValueSpecification {
    this.openVariables.push(variable.name);
    if (variable.class && variable.multiplicity) {
      const multiplicity = this.context.graph.getMultiplicity(
        variable.multiplicity.lowerBound,
        variable.multiplicity.upperBound,
      );
      const ve = new VariableExpression(variable.name, multiplicity);
      ve.genericType = this.context.resolveGenericType(variable.class);
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
    const lambda = V1_buildLambdaBody(
      valueSpecification.body,
      valueSpecification.parameters,
      this.context,
      this.processingContext.clone(), // clone the context for lambda
    );
    const instance = new LambdaFunctionInstanceValue(
      this.context.graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONE),
    );
    instance.values = [lambda];
    return instance;
  }

  visit_AppliedFunction(
    appliedFunction: V1_AppliedFunction,
  ): ValueSpecification {
    this.processingContext.push(
      `Applying function '${appliedFunction.function}'`,
    );
    if (appliedFunction.function === LET_FUNCTION) {
      const parameters = appliedFunction.parameters.map((expression) =>
        expression.accept_ValueSpecificationVisitor(
          new V1_ValueSpecificationBuilder(
            this.context,
            this.processingContext,
            this.openVariables,
          ),
        ),
      );
      const letName = guaranteeNonNullable(
        guaranteeType(appliedFunction.parameters[0], V1_CString).values[0],
      );
      const firstParam = guaranteeNonNullable(parameters[0]);
      const variableExpression = new VariableExpression(
        letName,
        firstParam.multiplicity,
      );
      variableExpression.genericType = firstParam.genericType;
      this.processingContext.addInferredVariables(letName, variableExpression);
    }
    const func = V1_buildFunctionExpression(
      appliedFunction.function,
      appliedFunction.parameters,
      this.openVariables,
      this.context,
      this.processingContext,
    );
    this.processingContext.pop();
    return func[0];
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

  // --------------------------------------------- Core ---------------------------------------------

  visit_Collection(valueSpecification: V1_Collection): ValueSpecification {
    const transformed = valueSpecification.values.map((v) =>
      v.accept_ValueSpecificationVisitor(
        new V1_ValueSpecificationBuilder(
          this.context,
          this.processingContext,
          this.openVariables,
        ),
      ),
    );
    const instance = new CollectionInstanceValue(
      this.context.graph.getMultiplicity(
        valueSpecification.multiplicity.lowerBound,
        valueSpecification.multiplicity.upperBound,
      ),
    );
    instance.values = transformed;
    // NOTE: Engine applies a more sophisticated `findMostCommon()` algorithm to find the collection's generic type. Here we only handle the case where the collection has one type.
    const typeValues = uniq(
      instance.values
        .map((v) => v.genericType?.value.rawType)
        .filter(isNonNullable),
    );
    if (typeValues.length === 1) {
      instance.genericType = GenericTypeExplicitReference.create(
        new GenericType(guaranteeNonNullable(typeValues[0])),
      );
    }
    return instance;
  }

  visit_Pair(valueSpecification: V1_Pair): ValueSpecification {
    const f = valueSpecification.first.accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        this.context,
        this.processingContext,
        [],
      ),
    );
    const s = valueSpecification.second.accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        this.context,
        this.processingContext,
        [],
      ),
    );
    const fv = guaranteeType(f, InstanceValue).values[0];
    const sv = guaranteeType(s, InstanceValue).values[0];
    const instance = new PairInstanceValue(
      this.context.graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONE),
    );
    instance.values = [new Pair(fv, sv)];
    return instance;
  }

  visit_PureList(valueSpecification: V1_PureList): ValueSpecification {
    const instance = new PureListInstanceValue(
      this.context.graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONE),
    );
    instance.values = valueSpecification.values.map((v) =>
      v.accept_ValueSpecificationVisitor(
        new V1_ValueSpecificationBuilder(
          this.context,
          this.processingContext,
          this.openVariables,
        ),
      ),
    );
    return instance;
  }

  visit_Path(valueSpecification: V1_Path): ValueSpecification {
    throw new UnsupportedOperationError();
  }

  // --------------------------------------------- Instance Value ---------------------------------------------

  visit_PackageableElementPtr(
    valueSpecification: V1_PackageableElementPtr,
  ): ValueSpecification {
    const instance = new InstanceValue(
      this.context.graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONE),
      this.context.resolveGenericType(valueSpecification.fullPath),
    );
    instance.values = [
      this.context.resolveElement(valueSpecification.fullPath, false),
    ];
    return instance;
  }

  visit_HackedClass(valueSpecification: V1_HackedClass): ValueSpecification {
    const instance = new InstanceValue(
      this.context.graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONE),
      this.context.resolveGenericType(valueSpecification.fullPath),
    );
    return instance;
  }

  visit_HackedUnit(valueSpecification: V1_HackedUnit): ValueSpecification {
    const instance = new InstanceValue(
      this.context.graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONE),
      this.context.resolveGenericType(valueSpecification.unitType),
    );
    return instance;
  }

  visit_EnumValue(valueSpecification: V1_EnumValue): ValueSpecification {
    const instance = new EnumValueInstanceValue(
      this.context.resolveGenericType(valueSpecification.fullPath),
      this.context.graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONE),
    );
    instance.values = [
      this.context.resolveEnumValue(
        valueSpecification.fullPath,
        valueSpecification.value,
      ),
    ];
    return instance;
  }

  // --------------------------------------------- Primitive Type ---------------------------------------------

  visit_CInteger(valueSpecification: V1_CInteger): ValueSpecification {
    return buildPrimtiveInstanceValue(
      PRIMITIVE_TYPE.INTEGER,
      valueSpecification.values,
      this.context,
      this.context.graph.getMultiplicity(
        valueSpecification.multiplicity.lowerBound,
        valueSpecification.multiplicity.upperBound,
      ),
    );
  }

  visit_CDecimal(valueSpecification: V1_CDecimal): ValueSpecification {
    return buildPrimtiveInstanceValue(
      PRIMITIVE_TYPE.DECIMAL,
      valueSpecification.values,
      this.context,
      this.context.graph.getMultiplicity(
        valueSpecification.multiplicity.lowerBound,
        valueSpecification.multiplicity.upperBound,
      ),
    );
  }

  visit_CString(valueSpecification: V1_CString): ValueSpecification {
    return buildPrimtiveInstanceValue(
      PRIMITIVE_TYPE.STRING,
      valueSpecification.values,
      this.context,
      this.context.graph.getMultiplicity(
        valueSpecification.multiplicity.lowerBound,
        valueSpecification.multiplicity.upperBound,
      ),
    );
  }

  visit_CBoolean(valueSpecification: V1_CBoolean): ValueSpecification {
    return buildPrimtiveInstanceValue(
      PRIMITIVE_TYPE.BOOLEAN,
      valueSpecification.values,
      this.context,
      this.context.graph.getMultiplicity(
        valueSpecification.multiplicity.lowerBound,
        valueSpecification.multiplicity.upperBound,
      ),
    );
  }

  visit_CFloat(valueSpecification: V1_CFloat): ValueSpecification {
    return buildPrimtiveInstanceValue(
      PRIMITIVE_TYPE.FLOAT,
      valueSpecification.values,
      this.context,
      this.context.graph.getMultiplicity(
        valueSpecification.multiplicity.lowerBound,
        valueSpecification.multiplicity.upperBound,
      ),
    );
  }

  visit_CDateTime(valueSpecification: V1_CDateTime): ValueSpecification {
    return buildPrimtiveInstanceValue(
      PRIMITIVE_TYPE.DATETIME,
      valueSpecification.values,
      this.context,
      this.context.graph.getMultiplicity(
        valueSpecification.multiplicity.lowerBound,
        valueSpecification.multiplicity.upperBound,
      ),
    );
  }

  visit_CStrictDate(valueSpecification: V1_CStrictDate): ValueSpecification {
    return buildPrimtiveInstanceValue(
      PRIMITIVE_TYPE.STRICTDATE,
      valueSpecification.values,
      this.context,
      this.context.graph.getMultiplicity(
        valueSpecification.multiplicity.lowerBound,
        valueSpecification.multiplicity.upperBound,
      ),
    );
  }

  visit_CStrictTime(valueSpecification: V1_CStrictTime): ValueSpecification {
    return buildPrimtiveInstanceValue(
      PRIMITIVE_TYPE.STRICTTIME,
      valueSpecification.values,
      this.context,
      this.context.graph.getMultiplicity(
        valueSpecification.multiplicity.lowerBound,
        valueSpecification.multiplicity.upperBound,
      ),
    );
  }

  visit_CLatestDate(valueSpecification: V1_CLatestDate): ValueSpecification {
    return buildPrimtiveInstanceValue(
      PRIMITIVE_TYPE.LATESTDATE,
      [],
      this.context,
      this.context.graph.getMultiplicity(
        valueSpecification.multiplicity.lowerBound,
        valueSpecification.multiplicity.upperBound,
      ),
    );
  }

  // --------------------------------------------- Graph Fetch Tree ---------------------------------------------

  visit_RootGraphFetchTree(
    valueSpecification: V1_RootGraphFetchTree,
  ): ValueSpecification {
    const tree = V1_buildGraphFetchTree(
      valueSpecification,
      this.context,
      this.context.resolveClass(valueSpecification.class).value,
      this.openVariables,
      this.processingContext,
    ) as RootGraphFetchTree;
    const instance = new RootGraphFetchTreeInstanceValue(
      this.context.graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONE),
    );
    instance.values = [tree];
    return instance;
  }

  visit_PropertyGraphFetchTree(
    valueSpecification: V1_PropertyGraphFetchTree,
  ): ValueSpecification {
    const tree = V1_buildGraphFetchTree(
      valueSpecification,
      this.context,
      undefined,
      this.openVariables,
      this.processingContext,
    ) as PropertyGraphFetchTree;
    const instance = new PropertyGraphFetchTreeInstanceValue(
      this.context.graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONE),
    );
    instance.values = [tree];
    return instance;
  }

  // --------------------------------------------- TODO ---------------------------------------------

  visit_RuntimeInstance(
    valueSpecification: V1_RuntimeInstance,
  ): ValueSpecification {
    throw new UnsupportedOperationError();
  }

  visit_AggregateValue(
    valueSpecification: V1_AggregateValue,
  ): ValueSpecification {
    throw new UnsupportedOperationError();
  }

  visit_SerializationConfig(
    valueSpecification: V1_SerializationConfig,
  ): ValueSpecification {
    throw new UnsupportedOperationError();
  }

  visit_UnitType(valueSpecification: V1_UnitType): ValueSpecification {
    throw new UnsupportedOperationError();
  }

  visit_UnitInstance(valueSpecification: V1_UnitInstance): ValueSpecification {
    throw new UnsupportedOperationError();
  }

  visit_KeyExpression(
    valueSpecification: V1_KeyExpression,
  ): ValueSpecification {
    throw new UnsupportedOperationError();
  }

  visit_ExecutionContextInstance(
    valueSpecification: V1_ExecutionContextInstance,
  ): ValueSpecification {
    throw new UnsupportedOperationError();
  }

  visit_PrimitiveType(
    valueSpecification: V1_PrimitiveType,
  ): ValueSpecification {
    throw new UnsupportedOperationError();
  }

  // Not Supported For NOW
  visit_TDSAggregateValue(
    valueSpecification: V1_TDSAggregateValue,
  ): ValueSpecification {
    throw new UnsupportedOperationError();
  }

  visit_TDSColumnInformation(
    valueSpecification: V1_TDSColumnInformation,
  ): ValueSpecification {
    throw new UnsupportedOperationError();
  }

  visit_TDSSortInformation(
    valueSpecification: V1_TDSSortInformation,
  ): ValueSpecification {
    throw new UnsupportedOperationError();
  }

  visit_TdsOlapRank(valueSpecification: V1_TdsOlapRank): ValueSpecification {
    throw new UnsupportedOperationError();
  }

  visit_TdsOlapAggregation(
    valueSpecification: V1_TdsOlapAggregation,
  ): ValueSpecification {
    throw new UnsupportedOperationError();
  }
}

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
  // Remove let variables
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
  _lambda.openVariables = [];
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

// --------------------------------------------- Graph Builder ---------------------------------------------

export function V1_buildGraphFetchTree(
  graphFetchTree: V1_GraphFetchTree,
  context: V1_GraphBuilderContext,
  parentClass: Class | undefined,
  openVariables: string[],
  processingContext: V1_ProcessingContext,
): GraphFetchTree {
  if (graphFetchTree instanceof V1_PropertyGraphFetchTree) {
    return buildPropertyGraphFetchTree(
      graphFetchTree,
      context,
      guaranteeNonNullable(parentClass),
      openVariables,
      processingContext,
    );
  } else if (graphFetchTree instanceof V1_RootGraphFetchTree) {
    return buildRootGraphFetchTree(
      graphFetchTree,
      context,
      openVariables,
      processingContext,
    );
  }
  throw new UnsupportedOperationError(
    `Can't build graph fetch tree`,
    graphFetchTree,
  );
}

// --------------------------------------------- Graph Fetch Tree ---------------------------------------------

const createThisVariableForClass = (
  context: V1_GraphBuilderContext,
  classPackageString: string,
): VariableExpression => {
  const _classGenericType = context.resolveGenericType(classPackageString);
  const _var = new VariableExpression(
    'this',
    context.graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONE),
  );
  _var.genericType = _classGenericType;
  return _var;
};

function buildPropertyGraphFetchTree(
  propertyGraphFetchTree: V1_PropertyGraphFetchTree,
  context: V1_GraphBuilderContext,
  parentClass: Class,
  openVariables: string[],
  processingContext: V1_ProcessingContext,
): PropertyGraphFetchTree {
  let property: AbstractProperty;
  let pureParameters: ValueSpecification[] = [];
  if (propertyGraphFetchTree.parameters.length) {
    const thisVariable = new V1_Variable();
    thisVariable.name = 'this';
    thisVariable.class = parentClass.path;
    const _multiplicity = new V1_Multiplicity();
    _multiplicity.lowerBound = 1;
    _multiplicity.upperBound = 1;
    thisVariable.multiplicity = _multiplicity;
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
    property = V1_getAppliedProperty(
      parentClass,
      undefined,
      propertyGraphFetchTree.property,
    );
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

function buildRootGraphFetchTree(
  rootGraphFetchTree: V1_RootGraphFetchTree,
  context: V1_GraphBuilderContext,
  openVariables: string[],
  processingContext: V1_ProcessingContext,
): RootGraphFetchTree {
  const _class = context.resolveClass(rootGraphFetchTree.class);
  const children = rootGraphFetchTree.subTrees.map((subTree) =>
    V1_buildGraphFetchTree(
      subTree,
      context,
      _class.value,
      openVariables,
      processingContext,
    ),
  );
  const _rootGraphFetchTree = new RootGraphFetchTree(
    PackageableElementExplicitReference.create(_class.value),
  );
  _rootGraphFetchTree.subTrees = children;
  return _rootGraphFetchTree;
}

// --------------------------------------------- Execution Context ---------------------------------------------

export function V1_processExecutionContext(
  executionContext: V1_ExecutionContext,
  context: V1_GraphBuilderContext,
): ExecutionContext {
  if (executionContext instanceof V1_BaseExecutionContext) {
    const _executioncontext = new BaseExecutionContext();
    _executioncontext.enableConstraints = executionContext.enableConstraints;
    _executioncontext.queryTimeOutInSeconds =
      executionContext.queryTimeOutInSeconds;
    return _executioncontext;
  } else if (executionContext instanceof V1_AnalyticsExecutionContext) {
    const vs =
      executionContext.toFlowSetFunction.accept_ValueSpecificationVisitor(
        new V1_ValueSpecificationBuilder(
          context,
          new V1_ProcessingContext(''),
          [],
        ),
      );
    const instance = guaranteeType(vs, InstanceValue);
    const lambdaFunc = guaranteeType(instance.values[0], LambdaFunction);
    const _analyticsExecutionContext = new AnalyticsExecutionContext(
      executionContext.useAnalytics,
      lambdaFunc,
    );
    _analyticsExecutionContext.enableConstraints =
      executionContext.enableConstraints;
    _analyticsExecutionContext.queryTimeOutInSeconds =
      executionContext.queryTimeOutInSeconds;
    return _analyticsExecutionContext;
  }
  // TODO add processor
  throw new UnsupportedOperationError(
    `Can't build execution context`,
    executionContext,
  );
}

// ------------------------------------------ PROPERTY -----------------------------------------

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
    const processedProperty = new AbstractPropertyExpression(
      '',
      context.graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONE),
    );
    processedProperty.func = PropertyExplicitReference.create(
      V1_getAppliedProperty(inferredType, undefined, property),
    );
    processedProperty.parametersValues = processedParameters;
    return processedProperty;
  } else if (inferredType instanceof Enumeration) {
    const enumValueInstanceValue = new EnumValueInstanceValue(
      GenericTypeExplicitReference.create(new GenericType(inferredType)),
      context.graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONE),
    );
    enumValueInstanceValue.values = [
      EnumValueExplicitReference.create(getEnumValue(inferredType, property)),
    ];
    return enumValueInstanceValue;
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
  const expression = new SimpleFunctionExpression(
    functionName,
    compileContext.graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONE),
  );
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
): [SimpleFunctionExpression, ValueSpecification[]] => {
  const processedParams = parameters.map((parameter) =>
    parameter.accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        compileContext,
        processingContext,
        openVariables,
      ),
    ),
  );
  return [
    V1_buildBaseSimpleFunctionExpression(
      processedParams,
      functionName,
      compileContext,
    ),
    processedParams,
  ];
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
): [SimpleFunctionExpression, ValueSpecification[]] {
  if (
    matchFunctionName(functionName, [
      SUPPORTED_FUNCTIONS.TODAY,
      SUPPORTED_FUNCTIONS.FIRST_DAY_OF_QUARTER,
    ])
  ) {
    const expression = V1_buildGenericFunctionExpression(
      functionName,
      parameters,
      openVariables,
      compileContext,
      processingContext,
    );
    expression[0].genericType = GenericTypeExplicitReference.create(
      new GenericType(
        compileContext.graph.getPrimitiveType(PRIMITIVE_TYPE.STRICTDATE),
      ),
    );
    return expression;
  } else if (matchFunctionName(functionName, SUPPORTED_FUNCTIONS.NOW)) {
    const expression = V1_buildGenericFunctionExpression(
      functionName,
      parameters,
      openVariables,
      compileContext,
      processingContext,
    );
    expression[0].genericType = GenericTypeExplicitReference.create(
      new GenericType(
        compileContext.graph.getPrimitiveType(PRIMITIVE_TYPE.DATETIME),
      ),
    );
    return expression;
  } else if (
    matchFunctionName(functionName, [
      SUPPORTED_FUNCTIONS.FIRST_DAY_OF_YEAR,
      SUPPORTED_FUNCTIONS.FIRST_DAY_OF_MONTH,
      SUPPORTED_FUNCTIONS.FIRST_DAY_OF_WEEK,
      SUPPORTED_FUNCTIONS.PREVIOUS_DAY_OF_WEEK,
      SUPPORTED_FUNCTIONS.ADJUST,
    ])
  ) {
    const expression = V1_buildGenericFunctionExpression(
      functionName,
      parameters,
      openVariables,
      compileContext,
      processingContext,
    );
    expression[0].genericType = GenericTypeExplicitReference.create(
      new GenericType(
        compileContext.graph.getPrimitiveType(PRIMITIVE_TYPE.DATE),
      ),
    );
    return expression;
  } else if (
    matchFunctionName(functionName, Object.values(SUPPORTED_FUNCTIONS))
  ) {
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
  throw new UnsupportedOperationError(
    `Can't infer type for variable '${inferredVariable}': no compatible property expression type inferrer available from plugins`,
  );
}
