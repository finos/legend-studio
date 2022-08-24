import {
  extractElementNameFromPath,
  SimpleFunctionExpression,
  TYPICAL_MULTIPLICITY_TYPE,
  type LambdaFunction,
  type ValueSpecification,
} from '@finos/legend-graph';
import {
  assertTrue,
  guaranteeNonNullable,
  isNonNullable,
} from '@finos/legend-shared';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../QueryBuilder_Const.js';
import { fromGroupOperation } from '../../../QueryBuilderOperatorsHelper.js';
import { buildGenericLambdaFunctionInstanceValue } from '../../../QueryBuilderValueSpecificationBuilderHelper.js';
import { FETCH_STRUCTURE_MODE } from '../../QueryBuilderFetchStructureState.js';
import {
  QueryBuilderPostFilterTreeConditionNodeData,
  QueryBuilderPostFilterTreeGroupNodeData,
  type QueryBuilderPostFilterTreeNodeData,
  type QueryBuilderPostFilterState,
} from './QueryBuilderPostFilterState.js';

const buildPostFilterExpression = (
  filterState: QueryBuilderPostFilterState,
  node: QueryBuilderPostFilterTreeNodeData,
): ValueSpecification | undefined => {
  if (node instanceof QueryBuilderPostFilterTreeConditionNodeData) {
    return node.condition.operator.buildPostFilterConditionExpression(
      node.condition,
    );
  } else if (node instanceof QueryBuilderPostFilterTreeGroupNodeData) {
    const multiplicityOne =
      filterState.projectionState.queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
        TYPICAL_MULTIPLICITY_TYPE.ONE,
      );
    const func = new SimpleFunctionExpression(
      extractElementNameFromPath(fromGroupOperation(node.groupOperation)),
      multiplicityOne,
    );
    const clauses = node.childrenIds
      .map((e) => filterState.nodes.get(e))
      .filter(isNonNullable)
      .map((e) => buildPostFilterExpression(filterState, e))
      .filter(isNonNullable);
    /**
     * NOTE: Due to a limitation (or perhaps design decision) in the engine, group operations
     * like and/or do not take more than 2 parameters, as such, if we have more than 2, we need
     * to create a chain of this operation to accomondate.
     *
     * This means that in the read direction, we might need to flatten the chains down to group with
     * multiple clauses. This means user's intended grouping will not be kept.
     */
    if (clauses.length > 2) {
      const firstClause = clauses[0] as ValueSpecification;
      let currentClause: ValueSpecification = clauses[
        clauses.length - 1
      ] as ValueSpecification;
      for (let i = clauses.length - 2; i > 0; --i) {
        const clause1 = clauses[i] as ValueSpecification;
        const clause2 = currentClause;
        const groupClause = new SimpleFunctionExpression(
          extractElementNameFromPath(fromGroupOperation(node.groupOperation)),
          multiplicityOne,
        );
        groupClause.parametersValues = [clause1, clause2];
        currentClause = groupClause;
      }
      func.parametersValues = [firstClause, currentClause];
    } else {
      func.parametersValues = clauses;
    }
    return func.parametersValues.length ? func : undefined;
  }
  return undefined;
};

export const appendPostFilter = (
  postFilterState: QueryBuilderPostFilterState,
  lambda: LambdaFunction,
): LambdaFunction => {
  const postFilterConditionExpressions = postFilterState.rootIds
    .map((e) => guaranteeNonNullable(postFilterState.nodes.get(e)))
    .map((e) => buildPostFilterExpression(postFilterState, e))
    .filter(isNonNullable);
  if (
    !postFilterConditionExpressions.length ||
    lambda.expressionSequence.length !== 1
  ) {
    return lambda;
  }
  assertTrue(
    postFilterState.projectionState.fetchStructureState.fetchStructureMode ===
      FETCH_STRUCTURE_MODE.PROJECTION,
    'Can only apply post-filter while fetching projection columns',
  );
  const multiplicityOne =
    postFilterState.projectionState.queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    );
  const filterLambda = buildGenericLambdaFunctionInstanceValue(
    postFilterState.lambdaParameterName,
    postFilterConditionExpressions,
    postFilterState.projectionState.queryBuilderState.graphManagerState.graph,
  );
  // main filter expression
  const filterExpression = new SimpleFunctionExpression(
    extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_FILTER),
    multiplicityOne,
  );
  const currentExpression = guaranteeNonNullable(lambda.expressionSequence[0]);
  filterExpression.parametersValues = [currentExpression, filterLambda];
  lambda.expressionSequence[0] = filterExpression;
  return lambda;
};
