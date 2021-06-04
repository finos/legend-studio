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
} from '@finos/legend-studio-shared';
import { PRIMITIVE_TYPE } from '../../../../../../MetaModelConst';
import type { AlloySerializationConfigInstanceValue } from '../../../../../../metamodels/pure/model/valueSpecification/AlloySerializationConfig';
import type {
  GraphFetchTree,
  PropertyGraphFetchTreeInstanceValue,
  RootGraphFetchTreeInstanceValue,
} from '../../../../../../metamodels/pure/model/valueSpecification/GraphFetchTree';
import {
  PropertyGraphFetchTree,
  RootGraphFetchTree,
} from '../../../../../../metamodels/pure/model/valueSpecification/GraphFetchTree';
import type {
  PrimitiveInstanceValue,
  ClassInstanceValue,
  EnumerationInstanceValue,
  EnumValueInstanceValue,
  RuntimeInstanceValue,
  PairInstanceValue,
  MappingInstanceValue,
  PureListInstanceValue,
  CollectionInstanceValue,
  InstanceValue,
} from '../../../../../../metamodels/pure/model/valueSpecification/InstanceValue';
import type {
  LambdaFunction,
  LambdaFunctionInstanceValue,
} from '../../../../../../metamodels/pure/model/valueSpecification/LambdaFunction';
import type {
  AbstractPropertyExpression,
  FunctionExpression,
  SimpleFunctionExpression,
} from '../../../../../../metamodels/pure/model/valueSpecification/SimpleFunctionExpression';
import type { ValueSpecificationVisitor } from '../../../../../../metamodels/pure/model/valueSpecification/ValueSpecification';
import { ValueSpecification } from '../../../../../../metamodels/pure/model/valueSpecification/ValueSpecification';
import type { VariableExpression } from '../../../../../../metamodels/pure/model/valueSpecification/VariableExpression';
import { V1_Lambda } from '../../../model/valueSpecification/raw/V1_Lambda';
import type { V1_ValueSpecification } from '../../../model/valueSpecification/V1_ValueSpecification';
import { V1_Variable } from '../../../model/valueSpecification/V1_Variable';
import { V1_Class } from '../../../model/valueSpecification/raw/V1_Class';
import { V1_AppliedFunction } from '../../../model/valueSpecification/application/V1_AppliedFunction';
import { V1_AppliedProperty } from '../../../model/valueSpecification/application/V1_AppliedProperty';
import { V1_CString } from '../../../model/valueSpecification/raw/V1_CString';
import { V1_CInteger } from '../../../model/valueSpecification/raw/V1_CInteger';
import { V1_CDecimal } from '../../../model/valueSpecification/raw/V1_CDecimal';
import { V1_CBoolean } from '../../../model/valueSpecification/raw/V1_CBoolean';
import { V1_CFloat } from '../../../model/valueSpecification/raw/V1_CFloat';
import { V1_CDateTime } from '../../../model/valueSpecification/raw/V1_CDateTime';
import { V1_CStrictDate } from '../../../model/valueSpecification/raw/V1_CStrictDate';
import { V1_CStrictTime } from '../../../model/valueSpecification/raw/V1_CStrictTime';
import { V1_CLatestDate } from '../../../model/valueSpecification/raw/V1_CLatestDate';
import { V1_Multiplicity } from '../../../model/packageableElements/domain/V1_Multiplicity';
import { V1_Enum } from '../../../model/valueSpecification/raw/V1_Enum';
import { V1_EnumValue } from '../../../model/valueSpecification/raw/V1_EnumValue';
import { V1_PropertyGraphFetchTree } from '../../../model/valueSpecification/raw/graph/V1_PropertyGraphFetchTree';
import { V1_RootGraphFetchTree } from '../../../model/valueSpecification/raw/graph/V1_RootGraphFetchTree';
import type { V1_GraphFetchTree } from '../../../model/valueSpecification/raw/graph/V1_GraphFetchTree';
import { V1_Collection } from '../../../model/valueSpecification/raw/V1_Collection';

export class V1_ValueSpecificationTransformer
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

  visit_RootGraphFetchTreeInstanceValue(
    valueSpecification: RootGraphFetchTreeInstanceValue,
  ): V1_ValueSpecification {
    return V1_transformGraphFetchTree(
      valueSpecification.values[0],
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
      valueSpecification.values[0],
      this.inScope,
      this.open,
      this.isParameter,
      this.useAppliedFunction,
    );
  }

  visit_AlloySerializationConfigInstanceValue(
    valueSpecification: AlloySerializationConfigInstanceValue,
  ): V1_ValueSpecification {
    throw new Error('Method not implemented.');
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
      case PRIMITIVE_TYPE.FLOAT: {
        const cFloat = new V1_CFloat();
        cFloat.values = valueSpecification.values as number[];
        cFloat.multiplicity = multiplicity;
        return cFloat;
      }
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
        return cPrimitiveType;
      }
      default:
        throw new Error(`value ${type.name} is supported`);
    }
  }

  visit_ClassInstanceValue(
    valueSpecification: ClassInstanceValue,
  ): V1_ValueSpecification {
    const _class = new V1_Class();
    _class.fullPath = valueSpecification.values[0].value.path;
    return _class;
  }

  visit_EnumerationInstanceValue(
    valueSpecification: EnumerationInstanceValue,
  ): V1_ValueSpecification {
    const _enum = new V1_Enum();
    _enum.fullPath = valueSpecification.values[0].value.path;
    return _enum;
  }

  visit_EnumValueInstanceValue(
    valueSpecification: EnumValueInstanceValue,
  ): V1_ValueSpecification {
    const _enumValue = new V1_EnumValue();
    const _enum = valueSpecification.values[0].value;
    _enumValue.value = _enum.name;
    _enumValue.fullPath = _enum.owner.path;
    return _enumValue;
  }

  visit_RuntimeInstanceValue(
    valueSpecification: RuntimeInstanceValue,
  ): V1_ValueSpecification {
    throw new Error('Method not implemented.');
  }

  visit_PairInstanceValue(
    valueSpecification: PairInstanceValue,
  ): V1_ValueSpecification {
    throw new Error('Method not implemented.');
  }

  visit_MappingInstanceValue(
    valueSpecification: MappingInstanceValue,
  ): V1_ValueSpecification {
    throw new Error('Method not implemented.');
  }

  visit_PureListInsanceValue(
    valueSpecification: PureListInstanceValue,
  ): V1_ValueSpecification {
    throw new Error('Method not implemented.');
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
      .filter(
        (type: unknown): type is ValueSpecification =>
          type instanceof ValueSpecification,
      )
      .map((e) =>
        e.accept_ValueSpecificationVisitor(
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
    appliedFunc.parameters = valueSpecification.parametersValues.map((e) =>
      e.accept_ValueSpecificationVisitor(
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
    appliedFunc.parameters = valueSpecification.parametersValues.map((e) =>
      e.accept_ValueSpecificationVisitor(
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
    return _variable;
  }

  visit_LambdaFunctionInstanceValue(
    valueSpecification: LambdaFunctionInstanceValue,
  ): V1_ValueSpecification {
    const _lambda = guaranteeNonNullable(valueSpecification.values[0]);
    return V1_transformLambdaFunction(_lambda);
  }

  visit_InstanceValue(
    valueSpecification: InstanceValue,
  ): V1_ValueSpecification {
    throw new Error('Method not implemented.');
  }

  visit_AbstractPropertyExpression(
    valueSpecification: AbstractPropertyExpression,
  ): V1_ValueSpecification {
    const _property = new V1_AppliedProperty();
    _property.property = valueSpecification.func.name;
    _property.parameters = valueSpecification.parametersValues.map((e) =>
      e.accept_ValueSpecificationVisitor(
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
    _propertyGraphTree.parameters = value.parameters.map((e) =>
      e.accept_ValueSpecificationVisitor(
        new V1_ValueSpecificationTransformer(
          inScope,
          open,
          isParameter,
          useAppliedFunction,
        ),
      ),
    );
    _propertyGraphTree.property = value.property.value.name;
    _propertyGraphTree.subType = value.subType.value?.path;
    _propertyGraphTree.subTrees = value.subTrees.map((e) =>
      V1_transformGraphFetchTree(
        e,
        inScope,
        open,
        isParameter,
        useAppliedFunction,
      ),
    );
    return _propertyGraphTree;
  }
  throw new Error(
    `Can't build graph fetch tree node of type ${value.toString()}`,
  );
}

export const V1_transformLambdaBody = (
  lambdaFunc: LambdaFunction,
  useAppliedFunction: boolean,
): V1_ValueSpecification[] => {
  const inScope = lambdaFunc.functionType.parameters.map((p) => p.name);
  return lambdaFunc.expressionSequence.map((p) =>
    p.accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationTransformer(
        inScope,
        new Map<string, unknown[]>(),
        false,
        useAppliedFunction,
      ),
    ),
  );
};

export function V1_transformLambdaFunction(
  lambdaFunc: LambdaFunction,
): V1_Lambda {
  const lambda = new V1_Lambda();
  lambda.parameters = lambdaFunc.functionType.parameters.map((p) =>
    guaranteeType(
      p.accept_ValueSpecificationVisitor(
        new V1_ValueSpecificationTransformer(
          [],
          new Map<string, unknown[]>(),
          true,
          false,
        ),
      ),
      V1_Variable,
    ),
  );
  lambda.body = V1_transformLambdaBody(lambdaFunc, false);
  return lambda;
}
