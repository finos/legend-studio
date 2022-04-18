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
  type ValueSpecification,
  type PureModel,
  type Type,
  PrimitiveInstanceValue,
  PRIMITIVE_TYPE,
  EnumValueInstanceValue,
  CollectionInstanceValue,
  VariableExpression,
} from '@finos/legend-graph';
import {
  BooleanPrimitiveInstanceValueEditor,
  CollectionValueInstanceValueEditor,
  DateInstanceValueEditor,
  EnumValueInstanceValueEditor,
  NumberPrimitiveInstanceValueEditor,
  QueryBuilderUnsupportedValueSpecificationEditor,
  StringPrimitiveInstanceValueEditor,
  VariableExpressionParameterEditor,
} from '../components/QueryBuilderValueSpecificationEditor';
import {
  propagateDefaultDates,
  removePropagatedDates,
} from './QueryBuilderMilestoningHelper';
import type { QueryBuilderDerivedPropertyExpressionState } from './QueryBuilderPropertyEditorState';

export const QueryBuilderMilestoningValueSpecificationEditor: React.FC<{
  valueSpecification: ValueSpecification;
  graph: PureModel;
  expectedType: Type;
  className?: string | undefined;
  idx?: number | undefined;
  derivedPropertyExpressionState?:
    | QueryBuilderDerivedPropertyExpressionState
    | undefined;
  derivedPropertyExpressionStates?:
    | QueryBuilderDerivedPropertyExpressionState[]
    | undefined;
}> = (props) => {
  const {
    valueSpecification,
    graph,
    expectedType,
    className,
    idx,
    derivedPropertyExpressionState,
    derivedPropertyExpressionStates,
  } = props;
  if (valueSpecification instanceof PrimitiveInstanceValue) {
    const _type = valueSpecification.genericType.value.rawType;
    switch (_type.path) {
      case PRIMITIVE_TYPE.STRING:
        return (
          <StringPrimitiveInstanceValueEditor
            valueSpecification={valueSpecification}
            className={className}
          />
        );
      case PRIMITIVE_TYPE.BOOLEAN:
        return (
          <BooleanPrimitiveInstanceValueEditor
            valueSpecification={valueSpecification}
            className={className}
          />
        );
      case PRIMITIVE_TYPE.NUMBER:
      case PRIMITIVE_TYPE.FLOAT:
      case PRIMITIVE_TYPE.DECIMAL:
      case PRIMITIVE_TYPE.INTEGER:
        return (
          <NumberPrimitiveInstanceValueEditor
            valueSpecification={valueSpecification}
            isInteger={_type.path === PRIMITIVE_TYPE.INTEGER}
            className={className}
          />
        );
      case PRIMITIVE_TYPE.DATE:
      case PRIMITIVE_TYPE.STRICTDATE:
      case PRIMITIVE_TYPE.DATETIME:
      case PRIMITIVE_TYPE.LATESTDATE:
        if (
          derivedPropertyExpressionState &&
          idx !== undefined &&
          derivedPropertyExpressionStates
        ) {
          propagateDefaultDates(
            derivedPropertyExpressionStates,
            derivedPropertyExpressionState,
            idx,
          );
        }
        return (
          <DateInstanceValueEditor
            valueSpecification={valueSpecification}
            graph={graph}
            expectedType={expectedType}
            className={className}
          />
        );
      default:
        return <QueryBuilderUnsupportedValueSpecificationEditor />;
    }
  } else if (valueSpecification instanceof EnumValueInstanceValue) {
    return (
      <EnumValueInstanceValueEditor
        valueSpecification={valueSpecification}
        className={className}
      />
    );
  } else if (
    valueSpecification instanceof CollectionInstanceValue &&
    valueSpecification.genericType
  ) {
    // NOTE: since when we fill in the arguments, `[]` (or `nullish` value in Pure)
    // is used for parameters we don't handle, we should not attempt to support empty collection
    // without generic type here as that  is equivalent to `[]`
    return (
      <CollectionValueInstanceValueEditor
        valueSpecification={valueSpecification}
        graph={graph}
        expectedType={expectedType}
        className={className}
      />
    );
  }
  // property expression
  else if (valueSpecification instanceof VariableExpression) {
    if (derivedPropertyExpressionStates?.length) {
      removePropagatedDates(derivedPropertyExpressionStates);
    }
    return (
      <VariableExpressionParameterEditor
        valueSpecification={valueSpecification}
        className={className}
      />
    );
  }
  return <QueryBuilderUnsupportedValueSpecificationEditor />;
};
