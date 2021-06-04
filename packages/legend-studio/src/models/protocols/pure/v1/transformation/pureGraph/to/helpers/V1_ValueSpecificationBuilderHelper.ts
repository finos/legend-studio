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
  returnUndefOnError,
  UnsupportedOperationError,
  getClass,
} from '@finos/legend-studio-shared';
import {
  TYPICAL_MULTIPLICITY_TYPE,
  PRIMITIVE_TYPE,
} from '../../../../../../../MetaModelConst';
import { GraphError } from '../../../../../../../MetaModelUtility';
import {
  LambdaFunction,
  FunctionType,
  LambdaFunctionInstanceValue,
} from '../../../../../../../metamodels/pure/model/valueSpecification/LambdaFunction';
import type { ExecutionContext } from '../../../../../../../metamodels/pure/model/valueSpecification/ExecutionContext';
import {
  BaseExecutionContext,
  AnalyticsExecutionContext,
} from '../../../../../../../metamodels/pure/model/valueSpecification/ExecutionContext';
import { VariableExpression } from '../../../../../../../metamodels/pure/model/valueSpecification/VariableExpression';
import { Class } from '../../../../../../../metamodels/pure/model/packageableElements/domain/Class';
import type { GraphFetchTree } from '../../../../../../../metamodels/pure/model/valueSpecification/GraphFetchTree';
import type { AbstractProperty } from '../../../../../../../metamodels/pure/model/packageableElements/domain/AbstractProperty';
import {
  PropertyGraphFetchTree,
  RootGraphFetchTree,
  PropertyGraphFetchTreeInstanceValue,
  RootGraphFetchTreeInstanceValue,
} from '../../../../../../../metamodels/pure/model/valueSpecification/GraphFetchTree';
import { ValueSpecification } from '../../../../../../../metamodels/pure/model/valueSpecification/ValueSpecification';
import {
  AbstractPropertyExpression,
  SimpleFunctionExpression,
  SUPPORTED_FUNCTIONS,
} from '../../../../../../../metamodels/pure/model/valueSpecification/SimpleFunctionExpression';
import { GenericType } from '../../../../../../../metamodels/pure/model/packageableElements/domain/GenericType';
import { GenericTypeExplicitReference } from '../../../../../../../metamodels/pure/model/packageableElements/domain/GenericTypeReference';
import {
  InstanceValue,
  ClassInstanceValue,
  PrimitiveInstanceValue,
  EnumerationInstanceValue,
  EnumValueInstanceValue,
  PairInstanceValue,
  PureListInstanceValue,
  CollectionInstanceValue,
} from '../../../../../../../metamodels/pure/model/valueSpecification/InstanceValue';
import { Multiplicity } from '../../../../../../../metamodels/pure/model/packageableElements/domain/Multiplicity';
import type { Type } from '../../../../../../../metamodels/pure/model/packageableElements/domain/Type';
import { PropertyExplicitReference } from '../../../../../../../metamodels/pure/model/packageableElements/domain/PropertyReference';
import {
  OptionalPackageableElementExplicitReference,
  PackageableElementExplicitReference,
} from '../../../../../../../metamodels/pure/model/packageableElements/PackageableElementReference';
import type {
  V1_ValueSpecificationVisitor,
  V1_ValueSpecification,
} from '../../../../model/valueSpecification/V1_ValueSpecification';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext';
import { V1_Lambda } from '../../../../model/valueSpecification/raw/V1_Lambda';
import { V1_Variable } from '../../../../model/valueSpecification/V1_Variable';
import { V1_ProcessingContext } from './V1_ProcessingContext';
import type { V1_ExecutionContext } from '../../../../model/valueSpecification/raw/executionContext/V1_ExecutionContext';
import { V1_BaseExecutionContext } from '../../../../model/valueSpecification/raw/executionContext/V1_BaseExecutionContext';
import { V1_AnalyticsExecutionContext } from '../../../../model/valueSpecification/raw/executionContext/V1_AnalyticsExecutionContext';
import { V1_PropertyGraphFetchTree } from '../../../../model/valueSpecification/raw/graph/V1_PropertyGraphFetchTree';
import { V1_Multiplicity } from '../../../../model/packageableElements/domain/V1_Multiplicity';
import { V1_RootGraphFetchTree } from '../../../../model/valueSpecification/raw/graph/V1_RootGraphFetchTree';
import type { V1_GraphFetchTree } from '../../../../model/valueSpecification/raw/graph/V1_GraphFetchTree';
import { V1_AppliedFunction } from '../../../../model/valueSpecification/application/V1_AppliedFunction';
import type { V1_AppliedProperty } from '../../../../model/valueSpecification/application/V1_AppliedProperty';
import type { V1_AggregateValue } from '../../../../model/valueSpecification/raw/V1_AggregateValue';
import type { V1_CBoolean } from '../../../../model/valueSpecification/raw/V1_CBoolean';
import type { V1_CDateTime } from '../../../../model/valueSpecification/raw/V1_CDateTime';
import type { V1_CStrictTime } from '../../../../model/valueSpecification/raw/V1_CStrictTime';
import type { V1_CDecimal } from '../../../../model/valueSpecification/raw/V1_CDecimal';
import type { V1_CFloat } from '../../../../model/valueSpecification/raw/V1_CFloat';
import type { V1_CInteger } from '../../../../model/valueSpecification/raw/V1_CInteger';
import type { V1_Class } from '../../../../model/valueSpecification/raw/V1_Class';
import type { V1_CLatestDate } from '../../../../model/valueSpecification/raw/V1_CLatestDate';
import { V1_Collection } from '../../../../model/valueSpecification/raw/V1_Collection';
import type { V1_CStrictDate } from '../../../../model/valueSpecification/raw/V1_CStrictDate';
import { V1_CString } from '../../../../model/valueSpecification/raw/V1_CString';
import type { V1_Enum } from '../../../../model/valueSpecification/raw/V1_Enum';
import type { V1_EnumValue } from '../../../../model/valueSpecification/raw/V1_EnumValue';
import type { V1_ExecutionContextInstance } from '../../../../model/valueSpecification/raw/V1_ExecutionContextInstance';
import type { V1_KeyExpression } from '../../../../model/valueSpecification/raw/V1_KeyExpression';
import type { V1_MappingInstance } from '../../../../model/valueSpecification/raw/V1_MappingInstance';
import type { V1_Pair } from '../../../../model/valueSpecification/raw/V1_Pair';
import type { V1_Path } from '../../../../model/valueSpecification/raw/path/V1_Path';
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
import { V1_getAppliedProperty } from './V1_DomainBuilderHelper';
import { Enumeration } from '../../../../../../../metamodels/pure/model/packageableElements/domain/Enumeration';
import { EnumValueExplicitReference } from '../../../../../../../metamodels/pure/model/packageableElements/domain/EnumValueReference';

const LET_FUNCTION = 'letFunction';

const getPrimtiveInstanceValue = (
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

  // Function val specs
  visit_Variable(variable: V1_Variable): ValueSpecification {
    this.openVariables.push(variable.name);
    if (variable.class && variable.multiplicity) {
      const multiplicity = new Multiplicity(
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
        throw new GraphError(
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
    this.processingContext.push(`Applying ${appliedFunction.function}`);
    if (appliedFunction.function === LET_FUNCTION) {
      const vs = appliedFunction.parameters.map((expression) =>
        expression.accept_ValueSpecificationVisitor(
          new V1_ValueSpecificationBuilder(
            this.context,
            this.processingContext,
            this.openVariables,
          ),
        ),
      );
      const letName = guaranteeType(appliedFunction.parameters[0], V1_CString)
        .values[0];
      const ve = new VariableExpression(letName, vs[0].multiplicity);
      ve.genericType = vs[0].genericType;
      this.processingContext.addInferredVariables(letName, ve);
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

  // core value specs
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
      new Multiplicity(
        valueSpecification.multiplicity.lowerBound,
        valueSpecification.multiplicity.upperBound,
      ),
    );
    instance.values = transformed;
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
    throw new Error('Method not implemented.');
  }

  // Instance Types
  visit_Class(valueSpecification: V1_Class): ValueSpecification {
    const genricTypeRef = this.context.resolveGenericType(
      valueSpecification.fullPath,
    );
    const instance = new ClassInstanceValue(
      genricTypeRef,
      this.context.graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONE),
    );
    instance.values = [this.context.resolveType(valueSpecification.fullPath)];
    return instance;
  }

  visit_Enum(valueSpecification: V1_Enum): ValueSpecification {
    const instance = new EnumerationInstanceValue(
      this.context.resolveGenericType(valueSpecification.fullPath),
      this.context.graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONE),
    );
    instance.values = [
      this.context.resolveEnumeration(valueSpecification.fullPath),
    ];
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

  // Primitive Type
  visit_CInteger(valueSpecification: V1_CInteger): ValueSpecification {
    return getPrimtiveInstanceValue(
      PRIMITIVE_TYPE.INTEGER,
      valueSpecification.values,
      this.context,
      new Multiplicity(
        valueSpecification.multiplicity.lowerBound,
        valueSpecification.multiplicity.upperBound,
      ),
    );
  }

  visit_CDecimal(valueSpecification: V1_CDecimal): ValueSpecification {
    return getPrimtiveInstanceValue(
      PRIMITIVE_TYPE.DECIMAL,
      valueSpecification.values,
      this.context,
      new Multiplicity(
        valueSpecification.multiplicity.lowerBound,
        valueSpecification.multiplicity.upperBound,
      ),
    );
  }

  visit_CString(valueSpecification: V1_CString): ValueSpecification {
    return getPrimtiveInstanceValue(
      PRIMITIVE_TYPE.STRING,
      valueSpecification.values,
      this.context,
      new Multiplicity(
        valueSpecification.multiplicity.lowerBound,
        valueSpecification.multiplicity.upperBound,
      ),
    );
  }

  visit_CBoolean(valueSpecification: V1_CBoolean): ValueSpecification {
    return getPrimtiveInstanceValue(
      PRIMITIVE_TYPE.BOOLEAN,
      valueSpecification.values,
      this.context,
      new Multiplicity(
        valueSpecification.multiplicity.lowerBound,
        valueSpecification.multiplicity.upperBound,
      ),
    );
  }

  visit_CFloat(valueSpecification: V1_CFloat): ValueSpecification {
    return getPrimtiveInstanceValue(
      PRIMITIVE_TYPE.FLOAT,
      valueSpecification.values,
      this.context,
      new Multiplicity(
        valueSpecification.multiplicity.lowerBound,
        valueSpecification.multiplicity.upperBound,
      ),
    );
  }

  visit_CDateTime(valueSpecification: V1_CDateTime): ValueSpecification {
    return getPrimtiveInstanceValue(
      PRIMITIVE_TYPE.DATETIME,
      valueSpecification.values,
      this.context,
      new Multiplicity(
        valueSpecification.multiplicity.lowerBound,
        valueSpecification.multiplicity.upperBound,
      ),
    );
  }

  visit_CStrictDate(valueSpecification: V1_CStrictDate): ValueSpecification {
    return getPrimtiveInstanceValue(
      PRIMITIVE_TYPE.STRICTDATE,
      valueSpecification.values,
      this.context,
      new Multiplicity(
        valueSpecification.multiplicity.lowerBound,
        valueSpecification.multiplicity.upperBound,
      ),
    );
  }

  visit_CStrictTime(valueSpecification: V1_CStrictTime): ValueSpecification {
    return getPrimtiveInstanceValue(
      PRIMITIVE_TYPE.STRICTTIME,
      valueSpecification.values,
      this.context,
      new Multiplicity(
        valueSpecification.multiplicity.lowerBound,
        valueSpecification.multiplicity.upperBound,
      ),
    );
  }

  visit_CLatestDate(valueSpecification: V1_CLatestDate): ValueSpecification {
    return getPrimtiveInstanceValue(
      PRIMITIVE_TYPE.LATESTDATE,
      [],
      this.context,
      new Multiplicity(
        valueSpecification.multiplicity.lowerBound,
        valueSpecification.multiplicity.upperBound,
      ),
    );
  }

  // Graph Fetch Tree
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

  // TODO
  visit_MappingInstance(
    valueSpecification: V1_MappingInstance,
  ): ValueSpecification {
    throw new Error('Method not implemented.');
  }

  visit_RuntimeInstance(
    valueSpecification: V1_RuntimeInstance,
  ): ValueSpecification {
    throw new Error('Method not implemented.');
  }

  visit_AggregateValue(
    valueSpecification: V1_AggregateValue,
  ): ValueSpecification {
    throw new Error('Method not implemented.');
  }

  visit_SerializationConfig(
    valueSpecification: V1_SerializationConfig,
  ): ValueSpecification {
    throw new Error('Method not implemented.');
  }

  visit_UnitType(valueSpecification: V1_UnitType): ValueSpecification {
    throw new Error('Method not implemented.');
  }

  visit_UnitInstance(valueSpecification: V1_UnitInstance): ValueSpecification {
    throw new Error('Method not implemented.');
  }

  visit_KeyExpression(
    valueSpecification: V1_KeyExpression,
  ): ValueSpecification {
    throw new Error('Method not implemented.');
  }

  visit_ExecutionContextInstance(
    valueSpecification: V1_ExecutionContextInstance,
  ): ValueSpecification {
    throw new Error('Method not implemented.');
  }

  visit_PrimitiveType(
    valueSpecification: V1_PrimitiveType,
  ): ValueSpecification {
    throw new Error('Method not implemented.');
  }

  // Not Supported For NOW
  visit_TDSAggregateValue(
    valueSpecification: V1_TDSAggregateValue,
  ): ValueSpecification {
    throw new Error('Method not implemented.');
  }

  visit_TDSColumnInformation(
    valueSpecification: V1_TDSColumnInformation,
  ): ValueSpecification {
    throw new Error('Method not implemented.');
  }

  visit_TDSSortInformation(
    valueSpecification: V1_TDSSortInformation,
  ): ValueSpecification {
    throw new Error('Method not implemented.');
  }

  visit_TdsOlapRank(valueSpecification: V1_TdsOlapRank): ValueSpecification {
    throw new Error('Method not implemented.');
  }

  visit_TdsOlapAggregation(
    valueSpecification: V1_TdsOlapAggregation,
  ): ValueSpecification {
    throw new Error('Method not implemented.');
  }
}

const buildFunctionType = (
  parameters: VariableExpression[],
  returnType: Type | undefined,
  returnMultiplicity: Multiplicity,
): FunctionType => {
  const _funcType = new FunctionType(returnType, returnMultiplicity);
  _funcType.parameters = parameters;
  return _funcType;
};

export function V1_buildLambdaBody(
  expressions: V1_ValueSpecification[],
  parameters: V1_Variable[],
  context: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): LambdaFunction {
  processingContext.push('new V1_Lambda');
  const pureParameters = parameters.map(
    (p) =>
      p.accept_ValueSpecificationVisitor(
        new V1_ValueSpecificationBuilder(context, processingContext, []),
      ) as VariableExpression,
  );
  const openVariables: string[] = [];
  const valueSpecifications = expressions.map((e) =>
    e.accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        context,
        processingContext,
        openVariables,
      ),
    ),
  );
  // Remove let variables
  const functionType = buildFunctionType(
    pureParameters,
    valueSpecifications[0].genericType?.value.rawType,
    valueSpecifications[0].multiplicity,
  );
  processingContext.pop();
  const _lambda = new LambdaFunction(functionType);
  _lambda.openVariables = [];
  _lambda.expressionSequence = valueSpecifications;
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
    `Can't build graph fetch tree node of type '${
      getClass(graphFetchTree).name
    }'`,
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
  if (!propertyGraphFetchTree.parameters.length) {
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
    processingContext.push('PropertyTree');
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
  );
  _propertyGraphFetchTree.parameters = pureParameters;
  _propertyGraphFetchTree.alias = propertyGraphFetchTree.alias;
  _propertyGraphFetchTree.subType =
    OptionalPackageableElementExplicitReference.create<Class>(_subType?.value);
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
    `Can't build execution context of type '${
      getClass(executionContext).name
    }'`,
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
  const processedParameters = parameters.map((p) =>
    p.accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        context,
        processingContext,
        openVariables,
      ),
    ),
  );
  let inferredVariable: ValueSpecification;
  if (firstParameter instanceof V1_Variable) {
    inferredVariable = guaranteeType(
      processingContext.getInferredVariable(firstParameter.name),
      ValueSpecification,
    );
  } else {
    inferredVariable = processedParameters[0];
  }
  let inferredType: Type | undefined =
    inferredVariable.genericType?.value.rawType;
  if (inferredVariable instanceof AbstractPropertyExpression) {
    inferredType = inferredVariable.func.genericType.value.rawType;
  }
  if (inferredType instanceof Class) {
    const processedProperty = new AbstractPropertyExpression(
      '',
      context.graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONE),
    );
    processedProperty.func = V1_getAppliedProperty(
      inferredType,
      undefined,
      property,
    );
    processedProperty.parametersValues = processedParameters;
    return processedProperty;
  } else if (inferredType instanceof Enumeration) {
    const enumValueInstanceValue = new EnumValueInstanceValue(
      GenericTypeExplicitReference.create(new GenericType(inferredType)),
      context.graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONE),
    );
    enumValueInstanceValue.values = [
      EnumValueExplicitReference.create(inferredType.getValue(property)),
    ];
    return enumValueInstanceValue;
  }
  throw new Error(
    `Unable to resolve property '${property}' of type '${inferredType?.name}'`,
  );
}

const resolveFunctionReturnType = (
  functionName: string,
  _function: SimpleFunctionExpression,
): void => {
  if (functionName === SUPPORTED_FUNCTIONS.GET_ALL) {
    const first = _function.parametersValues[0];
    if (first instanceof InstanceValue) {
      _function.genericType = first.genericType;
      _function.multiplicity = first.multiplicity;
    }
  }
};

const processSimpleFunctionExpression = (
  processedParameters: ValueSpecification[],
  functionName: string,
  compileContext: V1_GraphBuilderContext,
): SimpleFunctionExpression => {
  const _function = new SimpleFunctionExpression(
    functionName,
    compileContext.graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONE),
  );
  const _func = returnUndefOnError(() =>
    compileContext.resolveFunction(functionName),
  );
  _function.func = _func;
  if (_func) {
    const val = _func.value;
    _function.genericType = GenericTypeExplicitReference.create(
      new GenericType(val.returnType.value),
    );
    _function.multiplicity = val.returnMultiplicity;
  }
  _function.parametersValues = processedParameters;
  resolveFunctionReturnType(functionName, _function);
  return _function;
};

export function V1_buildFunctionExpression(
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): [SimpleFunctionExpression, ValueSpecification[]] {
  switch (functionName) {
    case SUPPORTED_FUNCTIONS.FILTER: {
      return V1_buildFilterFunctionExpression(
        functionName,
        parameters,
        openVariables,
        compileContext,
        processingContext,
      );
    }
    case SUPPORTED_FUNCTIONS.PROJECT: {
      return V1_buildProjectFunctionExpression(
        functionName,
        parameters,
        openVariables,
        compileContext,
        processingContext,
      );
    }
    case SUPPORTED_FUNCTIONS.EXISTS: {
      return V1_buildExistsFunctionExpression(
        functionName,
        parameters,
        openVariables,
        compileContext,
        processingContext,
      );
    }
    default: {
      const processed = parameters.map((p) =>
        p.accept_ValueSpecificationVisitor(
          new V1_ValueSpecificationBuilder(
            compileContext,
            processingContext,
            openVariables,
          ),
        ),
      );
      const simpleFunction = processSimpleFunctionExpression(
        processed,
        functionName,
        compileContext,
      );
      return [simpleFunction, processed];
    }
  }
}

// ------------------------------------------ RESOLVE SUPPORTED FUNCTIONS -----------------------------------------

export function V1_buildExistsFunctionExpression(
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): [SimpleFunctionExpression, ValueSpecification[]] {
  if (parameters.length === 2) {
    const processedValue = parameters[0].accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        compileContext,
        processingContext,
        openVariables,
      ),
    );
    processedValue.genericType = guaranteeType(
      processedValue,
      AbstractPropertyExpression,
    ).func.genericType;
    const lambda = parameters[1];
    if (lambda instanceof V1_Lambda) {
      lambda.parameters.forEach((p): void => {
        if (p.name && !p.class) {
          const _var = new VariableExpression(
            p.name,
            compileContext.graph.getTypicalMultiplicity(
              TYPICAL_MULTIPLICITY_TYPE.ONE,
            ),
          );
          _var.genericType = processedValue.genericType;
          processingContext.addInferredVariables(p.name, _var);
        }
      });
    }
    const _processed = [
      processedValue,
      parameters[1].accept_ValueSpecificationVisitor(
        new V1_ValueSpecificationBuilder(
          compileContext,
          processingContext,
          openVariables,
        ),
      ),
    ];
    const _simpleFunction = processSimpleFunctionExpression(
      _processed,
      functionName,
      compileContext,
    );
    return [_simpleFunction, _processed];
  }
  const processed = parameters.map((p) =>
    p.accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        compileContext,
        processingContext,
        openVariables,
      ),
    ),
  );
  const simpleFunction = processSimpleFunctionExpression(
    processed,
    functionName,
    compileContext,
  );
  return [simpleFunction, processed];
}

export function V1_buildFilterFunctionExpression(
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): [SimpleFunctionExpression, ValueSpecification[]] {
  if (parameters.length === 2) {
    const processedValue = parameters[0].accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        compileContext,
        processingContext,
        openVariables,
      ),
    );
    if (processedValue.genericType) {
      const func = parameters[1];
      if (func instanceof V1_Lambda) {
        func.parameters.forEach((p): void => {
          if (p.name && !p.class) {
            const _var = new VariableExpression(
              p.name,
              processedValue.multiplicity,
            );
            _var.genericType = processedValue.genericType;
            processingContext.addInferredVariables(p.name, _var);
          }
        });
      }
    }
    const _processed = [
      processedValue,
      parameters[1].accept_ValueSpecificationVisitor(
        new V1_ValueSpecificationBuilder(
          compileContext,
          processingContext,
          openVariables,
        ),
      ),
    ];
    const _simpleFunction = processSimpleFunctionExpression(
      _processed,
      functionName,
      compileContext,
    );
    // return type of filtered is of type of param 0 - filter_T_MANY__Function_1__T_MANY_
    _simpleFunction.genericType = processedValue.genericType;
    _simpleFunction.multiplicity = processedValue.multiplicity;
    return [_simpleFunction, _processed];
  }
  const processed = parameters.map((p) =>
    p.accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        compileContext,
        processingContext,
        openVariables,
      ),
    ),
  );
  const simpleFunction = processSimpleFunctionExpression(
    processed,
    functionName,
    compileContext,
  );
  return [simpleFunction, processed];
}

export function V1_buildProjectFunctionExpression(
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): [SimpleFunctionExpression, ValueSpecification[]] {
  let lambdasVariables: V1_Variable[] = [];
  if (parameters.length === 2 || parameters.length === 3) {
    const processedValue = parameters[0].accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        compileContext,
        processingContext,
        openVariables,
      ),
    );
    const func = parameters[1];
    if (processedValue.genericType) {
      if (parameters.length === 2 && func instanceof V1_Collection) {
        lambdasVariables = func.values
          .filter(
            (v: V1_ValueSpecification): v is V1_AppliedFunction =>
              v instanceof V1_AppliedFunction &&
              v.function === SUPPORTED_FUNCTIONS.COL,
          )
          .map((v) => v.parameters)
          .flat()
          .filter(
            (v: V1_ValueSpecification): v is V1_Lambda =>
              v instanceof V1_Lambda,
          )
          .map((l) => l.parameters)
          .flat();
      } else if (parameters.length === 3 && func instanceof V1_Collection) {
        lambdasVariables = func.values
          .filter(
            (v: V1_ValueSpecification): v is V1_Lambda =>
              v instanceof V1_Lambda,
          )
          .map((l) => l.parameters)
          .flat();
      }
      const variables = new Set<string>();
      lambdasVariables.forEach((v) => {
        if (!variables.has(v.name) && !v.class) {
          const _var = new VariableExpression(
            v.name,
            processedValue.multiplicity,
          );
          _var.genericType = processedValue.genericType;
          processingContext.addInferredVariables(v.name, _var);
        }
      });
      const _processed = [
        processedValue,
        ...parameters
          .slice(1)
          .map((e) =>
            e.accept_ValueSpecificationVisitor(
              new V1_ValueSpecificationBuilder(
                compileContext,
                processingContext,
                openVariables,
              ),
            ),
          ),
      ];
      const _simpleFunction = processSimpleFunctionExpression(
        _processed,
        functionName,
        compileContext,
      );
      return [_simpleFunction, _processed];
    }
  }
  const processed = parameters.map((p) =>
    p.accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        compileContext,
        processingContext,
        openVariables,
      ),
    ),
  );
  const simpleFunction = processSimpleFunctionExpression(
    processed,
    functionName,
    compileContext,
  );
  return [simpleFunction, processed];
}
