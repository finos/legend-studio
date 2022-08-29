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
  filterByType,
  guaranteeNonNullable,
  guaranteeType,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { PRIMITIVE_TYPE } from '../../../../../../../graph/MetaModelConst.js';
import type { AlloySerializationConfigInstanceValue } from '../../../../../../../graph/metamodel/pure/valueSpecification/AlloySerializationConfig.js';
import {
  type GraphFetchTree,
  type PropertyGraphFetchTreeInstanceValue,
  type RootGraphFetchTreeInstanceValue,
  PropertyGraphFetchTree,
  RootGraphFetchTree,
} from '../../../../../../../graph/metamodel/pure/valueSpecification/GraphFetchTree.js';
import type {
  PrimitiveInstanceValue,
  EnumValueInstanceValue,
  RuntimeInstanceValue,
  PairInstanceValue,
  MappingInstanceValue,
  PureListInstanceValue,
  CollectionInstanceValue,
  InstanceValue,
} from '../../../../../../../graph/metamodel/pure/valueSpecification/InstanceValue.js';
import {
  LambdaFunctionInstanceValue,
  type LambdaFunction,
} from '../../../../../../../graph/metamodel/pure/valueSpecification/LambdaFunction.js';
import type {
  AbstractPropertyExpression,
  FunctionExpression,
  SimpleFunctionExpression,
} from '../../../../../../../graph/metamodel/pure/valueSpecification/SimpleFunctionExpression.js';
import {
  type ValueSpecificationVisitor,
  ValueSpecification,
} from '../../../../../../../graph/metamodel/pure/valueSpecification/ValueSpecification.js';
import type { VariableExpression } from '../../../../../../../graph/metamodel/pure/valueSpecification/VariableExpression.js';
import { V1_Lambda } from '../../../model/valueSpecification/raw/V1_Lambda.js';
import type { V1_ValueSpecification } from '../../../model/valueSpecification/V1_ValueSpecification.js';
import { V1_Variable } from '../../../model/valueSpecification/V1_Variable.js';
import { V1_AppliedFunction } from '../../../model/valueSpecification/application/V1_AppliedFunction.js';
import { V1_AppliedProperty } from '../../../model/valueSpecification/application/V1_AppliedProperty.js';
import { V1_CString } from '../../../model/valueSpecification/raw/V1_CString.js';
import { V1_CInteger } from '../../../model/valueSpecification/raw/V1_CInteger.js';
import { V1_CDecimal } from '../../../model/valueSpecification/raw/V1_CDecimal.js';
import { V1_CBoolean } from '../../../model/valueSpecification/raw/V1_CBoolean.js';
import { V1_CFloat } from '../../../model/valueSpecification/raw/V1_CFloat.js';
import { V1_CDateTime } from '../../../model/valueSpecification/raw/V1_CDateTime.js';
import { V1_CStrictDate } from '../../../model/valueSpecification/raw/V1_CStrictDate.js';
import { V1_CStrictTime } from '../../../model/valueSpecification/raw/V1_CStrictTime.js';
import { V1_CLatestDate } from '../../../model/valueSpecification/raw/V1_CLatestDate.js';
import { V1_Multiplicity } from '../../../model/packageableElements/domain/V1_Multiplicity.js';
import { V1_EnumValue } from '../../../model/valueSpecification/raw/V1_EnumValue.js';
import { V1_PropertyGraphFetchTree } from '../../../model/valueSpecification/raw/graph/V1_PropertyGraphFetchTree.js';
import { V1_RootGraphFetchTree } from '../../../model/valueSpecification/raw/graph/V1_RootGraphFetchTree.js';
import type { V1_GraphFetchTree } from '../../../model/valueSpecification/raw/graph/V1_GraphFetchTree.js';
import { V1_Collection } from '../../../model/valueSpecification/raw/V1_Collection.js';
import { V1_PackageableElementPtr } from '../../../model/valueSpecification/raw/V1_PackageableElementPtr.js';
import { PackageableElementReference } from '../../../../../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';
import { Unit } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Measure.js';
import { Class } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Class.js';
import { V1_HackedUnit } from '../../../model/valueSpecification/raw/V1_HackedUnit.js';
import { V1_HackedClass } from '../../../model/valueSpecification/raw/V1_HackedClass.js';
import type { PackageableElement } from '../../../../../../../graph/metamodel/pure/packageableElements/PackageableElement.js';
import type { INTERNAL__UnknownValueSpecification } from '../../../../../../../graph/metamodel/pure/valueSpecification/INTERNAL__UnknownValueSpecification.js';
import { V1_INTERNAL__UnknownValueSpecification } from '../../../model/valueSpecification/V1_INTERNAL__UnknownValueSpecfication.js';
import type { INTERNAL__PropagatedValue } from '../../../../../../../graph/metamodel/pure/valueSpecification/INTERNAL__PropagatedValue.js';

class V1_ValueSpecificationTransformer
  implements ValueSpecificationVisitor<V1_ValueSpecification>
{
  inScope: string[] = [];
  open: Map<string, unknown[]>;
  isParameter: boolean;
  useAppliedFunction: boolean;

  constructor(
    inScope: string[],
    open: Map<string, unknown[]>,
    isParameter: boolean,
    useAppliedFunction: boolean,
  ) {
    this.inScope = inScope;
    this.open = open;
    this.isParameter = isParameter;
    this.useAppliedFunction = useAppliedFunction;
  }

  visit_INTERNAL__UnknownValueSpecification(
    valueSpecification: INTERNAL__UnknownValueSpecification,
  ): V1_ValueSpecification {
    const protocol = new V1_INTERNAL__UnknownValueSpecification();
    protocol.content = valueSpecification.content;
    return protocol;
  }

  visit_RootGraphFetchTreeInstanceValue(
    valueSpecification: RootGraphFetchTreeInstanceValue,
  ): V1_ValueSpecification {
    return V1_transformGraphFetchTree(
      guaranteeNonNullable(valueSpecification.values[0]),
      this.inScope,
      this.open,
      this.isParameter,
      this.useAppliedFunction,
    );
  }

  visit_PropertyGraphFetchTreeInstanceValue(
    valueSpecification: PropertyGraphFetchTreeInstanceValue,
  ): V1_ValueSpecification {
    return V1_transformGraphFetchTree(
      guaranteeNonNullable(valueSpecification.values[0]),
      this.inScope,
      this.open,
      this.isParameter,
      this.useAppliedFunction,
    );
  }

  visit_AlloySerializationConfigInstanceValue(
    valueSpecification: AlloySerializationConfigInstanceValue,
  ): V1_ValueSpecification {
    throw new UnsupportedOperationError();
  }

  visit_PrimitiveInstanceValue(
    valueSpecification: PrimitiveInstanceValue,
  ): V1_ValueSpecification {
    const type = valueSpecification.genericType.value.rawType;
    const multiplicity = new V1_Multiplicity();
    multiplicity.lowerBound = valueSpecification.multiplicity.lowerBound;
    multiplicity.upperBound = valueSpecification.multiplicity.upperBound;
    switch (type.name) {
      case PRIMITIVE_TYPE.INTEGER: {
        const cInteger = new V1_CInteger();
        cInteger.values = valueSpecification.values as number[];
        cInteger.multiplicity = multiplicity;
        return cInteger;
      }
      case PRIMITIVE_TYPE.FLOAT: {
        const cFloat = new V1_CFloat();
        cFloat.values = valueSpecification.values as number[];
        cFloat.multiplicity = multiplicity;
        return cFloat;
      }
      // since we don't have a corresponding protocol for abstract type `Number`, we will default to use `Decimal`
      case PRIMITIVE_TYPE.NUMBER:
      case PRIMITIVE_TYPE.DECIMAL: {
        const cDecimal = new V1_CDecimal();
        cDecimal.values = valueSpecification.values as number[];
        cDecimal.multiplicity = multiplicity;
        return cDecimal;
      }
      case PRIMITIVE_TYPE.STRING: {
        const cString = new V1_CString();
        cString.values = valueSpecification.values as string[];
        cString.multiplicity = multiplicity;
        return cString;
      }
      case PRIMITIVE_TYPE.BOOLEAN: {
        const cBoolean = new V1_CBoolean();
        cBoolean.values = valueSpecification.values as boolean[];
        cBoolean.multiplicity = multiplicity;
        return cBoolean;
      }
      // since we don't have a corresponding protocol for abstract type `Date`, we will default to use `DateTime`
      case PRIMITIVE_TYPE.DATE:
      case PRIMITIVE_TYPE.DATETIME: {
        const cDateTime = new V1_CDateTime();
        cDateTime.values = valueSpecification.values as string[];
        cDateTime.multiplicity = multiplicity;
        return cDateTime;
      }
      case PRIMITIVE_TYPE.STRICTDATE: {
        const cStrictDate = new V1_CStrictDate();
        cStrictDate.values = valueSpecification.values as string[];
        cStrictDate.multiplicity = multiplicity;
        return cStrictDate;
      }
      case PRIMITIVE_TYPE.STRICTTIME: {
        const cStrictTime = new V1_CStrictTime();
        cStrictTime.values = valueSpecification.values as string[];
        cStrictTime.multiplicity = multiplicity;
        return cStrictTime;
      }
      case PRIMITIVE_TYPE.LATESTDATE: {
        const cPrimitiveType = new V1_CLatestDate();
        cPrimitiveType.multiplicity = multiplicity;
        return cPrimitiveType;
      }
      default:
        throw new UnsupportedOperationError(
          `Can't transform primtive instance value of type '${type.name}'`,
        );
    }
  }

  visit_InstanceValue(
    valueSpecification: InstanceValue,
  ): V1_ValueSpecification {
    if (
      valueSpecification.values.length === 1 &&
      valueSpecification.values[0] instanceof PackageableElementReference
    ) {
      const protocol = new V1_PackageableElementPtr();
      protocol.fullPath = (
        valueSpecification
          .values[0] as PackageableElementReference<PackageableElement>
      ).value.path;
      return protocol;
    } else if (
      valueSpecification.values.length === 0 &&
      valueSpecification.genericType
    ) {
      if (valueSpecification.genericType.value.rawType instanceof Unit) {
        const protocol = new V1_HackedUnit();
        protocol.unitType =
          valueSpecification.genericType.ownerReference.valueForSerialization ??
          '';
        return protocol;
      } else if (
        valueSpecification.genericType.value.rawType instanceof Class
      ) {
        const protocol = new V1_HackedClass();
        protocol.fullPath =
          valueSpecification.genericType.ownerReference.valueForSerialization ??
          '';
        return protocol;
      }
    }
    throw new UnsupportedOperationError(
      `Can't transform instance value`,
      valueSpecification,
    );
  }

  visit_EnumValueInstanceValue(
    valueSpecification: EnumValueInstanceValue,
  ): V1_ValueSpecification {
    const _enumValue = new V1_EnumValue();
    const _enum = guaranteeNonNullable(valueSpecification.values[0]).value;
    _enumValue.value = _enum.name;
    _enumValue.fullPath = _enum._OWNER.path;
    return _enumValue;
  }

  visit_RuntimeInstanceValue(
    valueSpecification: RuntimeInstanceValue,
  ): V1_ValueSpecification {
    throw new UnsupportedOperationError();
  }

  visit_PairInstanceValue(
    valueSpecification: PairInstanceValue,
  ): V1_ValueSpecification {
    throw new UnsupportedOperationError();
  }

  visit_MappingInstanceValue(
    valueSpecification: MappingInstanceValue,
  ): V1_ValueSpecification {
    throw new UnsupportedOperationError();
  }

  visit_PureListInstanceValue(
    valueSpecification: PureListInstanceValue,
  ): V1_ValueSpecification {
    throw new UnsupportedOperationError();
  }

  visit_CollectionInstanceValue(
    valueSpecification: CollectionInstanceValue,
  ): V1_ValueSpecification {
    const collection = new V1_Collection();
    collection.multiplicity = new V1_Multiplicity();
    collection.multiplicity.lowerBound =
      valueSpecification.multiplicity.lowerBound;
    collection.multiplicity.upperBound =
      valueSpecification.multiplicity.upperBound;
    collection.values = valueSpecification.values
      .filter(filterByType(ValueSpecification))
      .map((value) =>
        value.accept_ValueSpecificationVisitor(
          new V1_ValueSpecificationTransformer(
            this.inScope,
            this.open,
            this.isParameter,
            this.useAppliedFunction,
          ),
        ),
      );
    return collection;
  }

  visit_FunctionExpression(
    valueSpecification: FunctionExpression,
  ): V1_ValueSpecification {
    const appliedFunc = new V1_AppliedFunction();
    appliedFunc.function = valueSpecification.functionName;
    appliedFunc.parameters = valueSpecification.parametersValues.map((value) =>
      value.accept_ValueSpecificationVisitor(
        new V1_ValueSpecificationTransformer(
          this.inScope,
          this.open,
          this.isParameter,
          this.useAppliedFunction,
        ),
      ),
    );
    return appliedFunc;
  }

  visit_SimpleFunctionExpression(
    valueSpecification: SimpleFunctionExpression,
  ): V1_ValueSpecification {
    const appliedFunc = new V1_AppliedFunction();
    appliedFunc.function = valueSpecification.functionName;
    appliedFunc.parameters = valueSpecification.parametersValues.map((value) =>
      value.accept_ValueSpecificationVisitor(
        new V1_ValueSpecificationTransformer(
          this.inScope,
          this.open,
          this.isParameter,
          this.useAppliedFunction,
        ),
      ),
    );
    return appliedFunc;
  }

  visit_VariableExpression(
    valueSpecification: VariableExpression,
  ): V1_ValueSpecification {
    const _variable = new V1_Variable();
    _variable.name = valueSpecification.name;
    const genericType = valueSpecification.genericType;
    if (this.isParameter && genericType) {
      const multiplicity = new V1_Multiplicity();
      multiplicity.lowerBound = valueSpecification.multiplicity.lowerBound;
      multiplicity.upperBound = valueSpecification.multiplicity.upperBound;
      _variable.multiplicity = multiplicity;
      _variable.class = genericType.value.rawType.path;
    }
    return _variable;
  }

  visit_LambdaFunctionInstanceValue(
    valueSpecification: LambdaFunctionInstanceValue,
  ): V1_ValueSpecification {
    return V1_transformLambdaFunctionInstanceValue(valueSpecification);
  }

  visit_AbstractPropertyExpression(
    valueSpecification: AbstractPropertyExpression,
  ): V1_ValueSpecification {
    const _property = new V1_AppliedProperty();
    _property.property = valueSpecification.func.name;
    _property.parameters = valueSpecification.parametersValues.map((value) =>
      value.accept_ValueSpecificationVisitor(
        new V1_ValueSpecificationTransformer(
          this.inScope,
          this.open,
          this.isParameter,
          this.useAppliedFunction,
        ),
      ),
    );
    return _property;
  }

  visit_INTERNAL__PropagatedValue(
    valueSpecification: INTERNAL__PropagatedValue,
  ): V1_ValueSpecification {
    throw new UnsupportedOperationError();
  }
}

export function V1_transformGraphFetchTree(
  value: GraphFetchTree,
  inScope: string[],
  open: Map<string, unknown[]>,
  isParameter: boolean,
  useAppliedFunction: boolean,
): V1_GraphFetchTree {
  if (value instanceof RootGraphFetchTree) {
    const _root = new V1_RootGraphFetchTree();
    _root.class = value.class.value.path;
    _root.subTrees = value.subTrees.map((e) =>
      V1_transformGraphFetchTree(
        e,
        inScope,
        open,
        isParameter,
        useAppliedFunction,
      ),
    );
    return _root;
  } else if (value instanceof PropertyGraphFetchTree) {
    const _propertyGraphTree = new V1_PropertyGraphFetchTree();
    _propertyGraphTree.alias = value.alias;
    _propertyGraphTree.parameters = value.parameters.map((parameter) =>
      parameter.accept_ValueSpecificationVisitor(
        new V1_ValueSpecificationTransformer(
          inScope,
          open,
          isParameter,
          useAppliedFunction,
        ),
      ),
    );
    _propertyGraphTree.property = value.property.value.name;
    _propertyGraphTree.subType = value.subType?.value.path;
    _propertyGraphTree.subTrees = value.subTrees.map((subTree) =>
      V1_transformGraphFetchTree(
        subTree,
        inScope,
        open,
        isParameter,
        useAppliedFunction,
      ),
    );
    return _propertyGraphTree;
  }
  throw new UnsupportedOperationError(
    `Can't build graph fetch tree node of type '${value.toString()}'`,
  );
}

export const V1_transformLambdaBody = (
  lambdaFunc: LambdaFunction,
  useAppliedFunction: boolean,
): V1_ValueSpecification[] => {
  const inScope = lambdaFunc.functionType.parameters.map((p) => p.name);
  return lambdaFunc.expressionSequence.map((expression) =>
    expression.accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationTransformer(
        inScope,
        new Map<string, unknown[]>(),
        false,
        useAppliedFunction,
      ),
    ),
  );
};

export function V1_transformLambdaFunctionInstanceValue(
  valueSpecification: LambdaFunctionInstanceValue,
  isRootLambda?: boolean,
): V1_Lambda {
  const lambdaFunc = guaranteeNonNullable(valueSpecification.values[0]);
  const lambda = new V1_Lambda();
  lambda.parameters = lambdaFunc.functionType.parameters.map((parameter) =>
    guaranteeType(
      parameter.accept_ValueSpecificationVisitor(
        new V1_ValueSpecificationTransformer(
          [],
          new Map<string, unknown[]>(),
          Boolean(isRootLambda),
          false,
        ),
      ),
      V1_Variable,
    ),
  );
  lambda.body = V1_transformLambdaBody(lambdaFunc, false);
  return lambda;
}

export function V1_transformRootValueSpecification(
  valueSpecification: ValueSpecification,
): V1_ValueSpecification {
  if (valueSpecification instanceof LambdaFunctionInstanceValue) {
    return V1_transformLambdaFunctionInstanceValue(valueSpecification, true);
  } else {
    return valueSpecification.accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationTransformer(
        [],
        new Map<string, unknown[]>(),
        true,
        false,
      ),
    );
  }
}
