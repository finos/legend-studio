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

import type { Type, ValueSpecification } from '@finos/legend-studio';
import {
  AbstractPropertyExpression,
  GenericType,
  GenericTypeExplicitReference,
  PrimitiveInstanceValue,
  EnumValueInstanceValue,
  PRIMITIVE_TYPE,
  SimpleFunctionExpression,
  TYPICAL_MULTIPLICITY_TYPE,
} from '@finos/legend-studio';
import {
  guaranteeType,
  UnsupportedOperationError,
  guaranteeNonNullable,
} from '@finos/legend-studio-shared';
import type {
  QueryBuilderFilterState,
  QueryBuilderOperator,
} from '../QueryBuilderFilterState';
import { FilterConditionState } from '../QueryBuilderFilterState';
import format from 'date-fns/format';
import { DATE_FORMAT } from '@finos/legend-studio/lib/const';
import { NOT_FUNCTION_NAME } from '../../QueryBuilder_Constants';

export const getDefaultPrimitiveInstanceValueForType = (
  type: PRIMITIVE_TYPE,
): unknown => {
  switch (type) {
    case PRIMITIVE_TYPE.STRING:
      return '';
    case PRIMITIVE_TYPE.BOOLEAN:
      return false;
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.DECIMAL:
    case PRIMITIVE_TYPE.FLOAT:
    case PRIMITIVE_TYPE.INTEGER:
      return 0;
    case PRIMITIVE_TYPE.STRICTDATE:
      return format(new Date(Date.now()), DATE_FORMAT);
    default:
      throw new UnsupportedOperationError(
        `Can't get default value for primitive instance of type '${type}'`,
      );
  }
};

export const buildPrimitiveInstanceValue = (
  filterConditionState: FilterConditionState,
  type: PRIMITIVE_TYPE,
  value: unknown,
): PrimitiveInstanceValue => {
  const multiplicityOne = filterConditionState.editorStore.graphState.graph.getTypicalMultiplicity(
    TYPICAL_MULTIPLICITY_TYPE.ONE,
  );
  const instance = new PrimitiveInstanceValue(
    GenericTypeExplicitReference.create(
      new GenericType(
        filterConditionState.editorStore.graphState.graph.getPrimitiveType(
          type,
        ),
      ),
    ),
    multiplicityOne,
  );
  instance.values = [value];
  return instance;
};

export const buildFilterConditionExpression = (
  filterConditionState: FilterConditionState,
  functionName: string,
): ValueSpecification => {
  // TODO: handle `exists`
  const multiplicityOne = filterConditionState.editorStore.graphState.graph.getTypicalMultiplicity(
    TYPICAL_MULTIPLICITY_TYPE.ONE,
  );
  const expression = new SimpleFunctionExpression(
    functionName,
    multiplicityOne,
  );
  expression.parametersValues.push(
    filterConditionState.propertyEditorState.propertyExpression,
  );
  // NOTE: there are simple operators which do not require any params (e.g. isEmpty)
  if (filterConditionState.value) {
    expression.parametersValues.push(filterConditionState.value);
  }
  return expression;
};

export const buildFilterConditionState = (
  filterState: QueryBuilderFilterState,
  expression: SimpleFunctionExpression,
  functionName: string,
  operator: QueryBuilderOperator,
  /**
   * Use this flag for operator that does not require any param (e.g. isEmpty)
   * NOTE: this is not the cleanest way to do this, if we find ourselves adding more and more customization
   * to this utility function, we should just create a bunch of different methods
   */
  hasNoValue = false,
): FilterConditionState | undefined => {
  // const chainList: string[] = [];
  // const currentPropertyExpression: AbstractPropertyExpression | undefined = undefined;
  // Handling `exists`
  // if (expression.functionName === EXISTS_FUNCTION_NAME) {
  // the first param
  // expression.parametersValues[0], -> the lambda
  // the second param
  // expression.
  // Handling the actual function
  // }
  // } else
  if (expression.functionName === functionName) {
    const propertyExpression = guaranteeType(
      expression.parametersValues[0],
      AbstractPropertyExpression,
    );
    // WIP-QB: support `exists()`
    // NOTE: right now we're blocked by the faulty handling of scoped variables in core Studio
    /**
     * model::target::_Firm.all()
   ->filter
    (
      x|$x.employees->exists(c | $c.fullName == '')
    )

    model::target::_Firm.all()
   ->filter
    (
      x|$x.employees->exists(x |$x.fullName == '')
    )
    the variable in the `exists` lambda will not be recognised properly
     */
    // const variable = guaranteeType(
    //   propertyExpression.parametersValues[0],
    //   VariableExpression,
    // );
    // chainList.push(variable.name);
    // columnState.setLambdaVariableName(variable.name);
    const filterConditionState = new FilterConditionState(
      filterState.editorStore,
      filterState,
      propertyExpression,
    );
    if (
      !operator.isCompatibleWithFilterConditionProperty(filterConditionState)
    ) {
      return undefined;
    }
    filterConditionState.setOperator(operator);
    if (!hasNoValue && expression.parametersValues.length < 2) {
      return undefined;
    }
    filterConditionState.setValue(
      hasNoValue ? undefined : expression.parametersValues[1],
    );
    if (!operator.isCompatibleWithFilterConditionValue(filterConditionState)) {
      filterConditionState.setValue(
        operator.getDefaultFilterConditionValue(filterConditionState),
      );
    }
    return filterConditionState;
  }
  return undefined;
};

export const buildNotExpression = (
  filterConditionState: FilterConditionState,
  expression: ValueSpecification,
): ValueSpecification => {
  const multiplicityOne = filterConditionState.editorStore.graphState.graph.getTypicalMultiplicity(
    TYPICAL_MULTIPLICITY_TYPE.ONE,
  );
  const expressionNot = new SimpleFunctionExpression(
    NOT_FUNCTION_NAME,
    multiplicityOne,
  );
  expressionNot.parametersValues.push(expression);
  return expressionNot;
};

export const unwrapNotExpression = (
  expression: SimpleFunctionExpression,
): SimpleFunctionExpression | undefined => {
  if (expression.functionName === NOT_FUNCTION_NAME) {
    return guaranteeType(
      expression.parametersValues[0],
      SimpleFunctionExpression,
    );
  }
  return undefined;
};

export interface QueryBuilderValueSpecificationInfo {
  type: Type;
  isCollection: boolean;
}

export const getValueSpecificationTypeInfo = (
  valueSpecification: ValueSpecification,
): QueryBuilderValueSpecificationInfo | undefined => {
  if (valueSpecification instanceof PrimitiveInstanceValue) {
    return {
      type: valueSpecification.genericType.value.rawType,
      isCollection: false,
    };
  } else if (valueSpecification instanceof EnumValueInstanceValue) {
    return {
      type: guaranteeNonNullable(valueSpecification.values[0]).value.owner,
      isCollection: false,
    };
  }
  // TODO: support collection here
  return undefined;
};

// TODO: we might want to check and make sure lambda variable name is preserved in `filter()`

// export const buildExistsExpression = (
//   filterConditionState: FilterConditionState,
//   expression: ValueSpecification,
// ): ValueSpecification => {
//   const multiplicityOne = filterConditionState.editorStore.graphState.graph.getTypicalMultiplicity(
//     TYPICAL_MULTIPLICITY_TYPE.ONE,
//   );
//   const expressionNot = new SimpleFunctionExpression(
//     NOT_FUNCTION_NAME,
//     multiplicityOne,
//   );
//   expressionNot.parametersValues.push(expression);
//   return expressionNot;
// };

// export const unwrapExistsExpression = (
//   expression: SimpleFunctionExpression,
// ): SimpleFunctionExpression | undefined => {
//   if (expression.functionName === NOT_FUNCTION_NAME) {
//     return guaranteeType(
//       expression.parametersValues[0],
//       SimpleFunctionExpression,
//     );
//   }
//   return undefined;
// };
