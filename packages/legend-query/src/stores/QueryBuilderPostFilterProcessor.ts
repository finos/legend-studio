import type { SimpleFunctionExpression } from '@finos/legend-graph';
import { matchFunctionName } from '@finos/legend-graph';
import { ValueSpecification } from '@finos/legend-graph';
import {
  AbstractPropertyExpression,
  extractElementNameFromPath,
  PrimitiveInstanceValue,
} from '@finos/legend-graph';
import {
  assertIsString,
  assertTrue,
  guaranteeIsString,
  guaranteeNonEmptyString,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-shared';
import type { QueryBuilderFilterOperator } from './QueryBuilderFilterState';
import {
  PostFilterConditionState,
  type QueryBuilderPostFilterState,
} from './QueryBuilderPostFilterState';
import type { QueryBuilderProjectionColumnState } from './QueryBuilderProjectionState';

export const processLHSProstFilter = (
  propertyExpression: AbstractPropertyExpression,
  postFilterState: QueryBuilderPostFilterState,
): QueryBuilderProjectionColumnState => {
  const fetchStructureState =
    postFilterState.queryBuilderState.fetchStructureState;
  assertTrue(
    fetchStructureState.isProjectionMode(),
    'Post filter only supported with projection fetch structure',
  );
  const columnNameExpression = propertyExpression.parametersValues[1];
  const columnName = guaranteeIsString(
    guaranteeType(
      columnNameExpression,
      PrimitiveInstanceValue,
      'Can`t process column name expression. Column should be a primitive instance value',
    ).values[0],
    'Can`t process column name expression. Column should be a string primitive instance value',
  );
  const projectionState = guaranteeNonNullable(
    fetchStructureState.projectionState.columns.find(
      (c) => c.columnName === columnName,
    ),
  );
  // TODO Verify return type of projection state with expression
  return projectionState;
};

export const buildPostFilterConditionState = (
  postFilterState: QueryBuilderPostFilterState,
  expression: SimpleFunctionExpression,
  operatorFunctionFullPath: string,
  operator: QueryBuilderFilterOperator,
): PostFilterConditionState | undefined => {
  let postConditionState: PostFilterConditionState | undefined;
  if (matchFunctionName(expression.functionName, operatorFunctionFullPath)) {
    assertTrue(
      expression.parametersValues.length === 2,
      `Can't process ${extractElementNameFromPath(
        operatorFunctionFullPath,
      )}() expression: ${extractElementNameFromPath(
        operatorFunctionFullPath,
      )}() expects '1 argument'}`,
    );
    // get projection column
    const getColumnExpression = guaranteeType(
      expression.parametersValues[0],
      AbstractPropertyExpression,
      `Can't process ${extractElementNameFromPath(
        operatorFunctionFullPath,
      )}() expression: expects property expression in lambda body`,
    );
    // find corresponding projection column state
    const projectionState = processLHSProstFilter(
      getColumnExpression,
      postFilterState,
    );
    // get operation value specification
    const value = expression.parametersValues[1];
    postConditionState = new PostFilterConditionState(
      postFilterState,
      projectionState,
      value,
      operator,
    );
  }
  // TODO post check ?
  return postConditionState;
};
