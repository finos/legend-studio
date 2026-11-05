/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import type { JsonObject } from '@finos/legend-cube';
import type { CubeDataSpaceEdit } from '@finos/legend-cube-builder';
import {
  type DataSpaceQueryBuilderState,
  resolveExecutionContextMapping,
} from '@finos/legend-extension-dsl-data-space/graph';
import { type RawLambda, RuntimePointer } from '@finos/legend-graph';
import {
  QUERY_BUILDER_LAMBDA_WRITER_MODE,
  type QueryBuilderState,
} from '@finos/legend-query-builder';

// What a data space source holds (PLAN §11.25): the query builder's lambda,
// which its editor opens again, and the same query as a Relation, which Cube
// runs. The query builder writes both, so Cube writes no class query itself.

/** Why a query builder's query isn't a source Cube can run, in words a user can act on */
export const CUBE_DATA_SPACE_QUERY_PROBLEM = {
  UNSUPPORTED: "The query builder can't show this query, so Cube can't read it",
  NO_ENTITY: 'Pick an entity',
  NO_COLUMN: 'Pick at least one column',
  NO_MAPPING: (context: string): string =>
    `Execution context "${context}" reads its mapping from a data product: Cube can't run it yet`,
  NO_RUNTIME: 'Pick a runtime',
  AGGREGATE:
    "Aggregates are Cube's steps: group after this source, with Group by Column",
  WINDOW:
    "Window functions are Cube's steps: add them after this source, with Apply Window Functions",
  POST_FILTER:
    "Post-filters are Cube's steps: filter after this source, with Filter by Column",
  QUERY_OPTIONS:
    "Query options are Cube's steps: sort, take rows or remove duplicates after this source",
  GRAPH_FETCH: "A graph fetch isn't a table of rows: pick columns",
  CONSTANT: "Constants can't be used in a Cube source yet",
  PARAMETER: (name: string): string =>
    `Cube can't give a value to parameter "${name}" yet: use a value in its place`,
  DATE_WITHOUT_VALUE: (name: string): string =>
    `Date "${name}" has no value: give it one`,
  OTHER:
    'The query does more than a class, a filter and columns, which is all a Cube source can be',
} as const;

export type CubeDataSpaceQueryResult =
  | { readonly edit: CubeDataSpaceEdit }
  | { readonly problem: string };

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const functionOf = (expression: unknown): string | undefined =>
  isJsonObject(expression) &&
  expression._type === 'func' &&
  typeof expression.function === 'string'
    ? (expression.function.split('::').pop() ?? expression.function)
    : undefined;

const argumentsOf = (expression: JsonObject): unknown[] =>
  Array.isArray(expression.parameters) ? expression.parameters : [];

/** The functions that read every instance of a class, with a date for a date-versioned one */
const GET_ALL_FUNCTIONS = ['getAll', 'getAllVersions', 'getAllVersionsInRange'];

/** The functions a query option writes */
const QUERY_OPTION_FUNCTIONS = [
  'sort',
  'distinct',
  'take',
  'limit',
  'slice',
  'drop',
];

/**
 * Why a query of the query builder isn't a class, its filter and its
 * columns, if it isn't: `<class>.all()->filter(…)->project(…)`, the filter
 * left out or not; none when it is. Read from the lambda the query builder
 * writes, which is what Cube would run, rather than from its panels.
 */
export const getCubeDataSpaceQueryShapeProblem = (
  body: unknown,
): string | undefined => {
  if (!Array.isArray(body) || body.length !== 1) {
    // a let before the query: a constant
    return Array.isArray(body) && body.length > 1
      ? CUBE_DATA_SPACE_QUERY_PROBLEM.CONSTANT
      : CUBE_DATA_SPACE_QUERY_PROBLEM.OTHER;
  }
  const [query] = body as unknown[];
  const outer = functionOf(query);
  if (outer === undefined || !isJsonObject(query)) {
    return CUBE_DATA_SPACE_QUERY_PROBLEM.OTHER;
  }
  // the class, filtered or not, with no column yet
  const [input] = argumentsOf(query);
  if (
    GET_ALL_FUNCTIONS.includes(outer) ||
    (outer === 'filter' && GET_ALL_FUNCTIONS.includes(functionOf(input) ?? ''))
  ) {
    return CUBE_DATA_SPACE_QUERY_PROBLEM.NO_COLUMN;
  }
  if (outer === 'groupBy') {
    return CUBE_DATA_SPACE_QUERY_PROBLEM.AGGREGATE;
  }
  if (outer === 'olapGroupBy') {
    return CUBE_DATA_SPACE_QUERY_PROBLEM.WINDOW;
  }
  if (outer === 'filter') {
    return CUBE_DATA_SPACE_QUERY_PROBLEM.POST_FILTER;
  }
  if (QUERY_OPTION_FUNCTIONS.includes(outer)) {
    return CUBE_DATA_SPACE_QUERY_PROBLEM.QUERY_OPTIONS;
  }
  if (outer === 'serialize' || outer === 'graphFetch') {
    return CUBE_DATA_SPACE_QUERY_PROBLEM.GRAPH_FETCH;
  }
  if (outer !== 'project') {
    return CUBE_DATA_SPACE_QUERY_PROBLEM.OTHER;
  }
  const [rows] = argumentsOf(query);
  const source =
    functionOf(rows) === 'filter' && isJsonObject(rows)
      ? argumentsOf(rows)[0]
      : rows;
  return GET_ALL_FUNCTIONS.includes(functionOf(source) ?? '')
    ? undefined
    : CUBE_DATA_SPACE_QUERY_PROBLEM.OTHER;
};

/**
 * The JSON with each variable named in `values` in its place, but where a
 * lambda declares a parameter of that name, which hides it
 */
export const substituteCubeDataSpaceVariables = (
  json: unknown,
  values: ReadonlyMap<string, JsonObject>,
): unknown => {
  if (Array.isArray(json)) {
    return json.map((item) => substituteCubeDataSpaceVariables(item, values));
  }
  if (!isJsonObject(json)) {
    return json;
  }
  if (json._type === 'var' && typeof json.name === 'string') {
    return values.get(json.name) ?? json;
  }
  let inner = values;
  if (json._type === 'lambda' && Array.isArray(json.parameters)) {
    const declared = json.parameters
      .filter(isJsonObject)
      .map((parameter) => parameter.name)
      .filter((name): name is string => typeof name === 'string');
    if (declared.some((name) => values.has(name))) {
      inner = new Map([...values].filter(([name]) => !declared.includes(name)));
    }
  }
  return Object.fromEntries(
    Object.entries(json).map(([key, value]) => [
      key,
      key === 'parameters' && json._type === 'lambda'
        ? value
        : substituteCubeDataSpaceVariables(value, inner),
    ]),
  );
};

const lambdaJsonOf = (lambda: RawLambda): JsonObject => ({
  _type: 'lambda',
  body: (lambda.body ?? []) as JsonObject[],
  parameters: (lambda.parameters ?? []) as JsonObject[],
});

/**
 * The query in the query builder's typed form, `…->project(~[…])`, with its
 * `from(mapping, runtime)`, as Data Cube's "Open in DataCube" writes it: the
 * writer is switched to typed for the one build, then back, with the
 * execution context the switch replaced put back too. Run it in an action.
 */
const buildTypedQuery = (queryBuilderState: QueryBuilderState): RawLambda => {
  const mode = queryBuilderState.lambdaWriteMode;
  const { executionContextState } = queryBuilderState;
  try {
    queryBuilderState.setLambdaWriteMode(
      QUERY_BUILDER_LAMBDA_WRITER_MODE.TYPED_FETCH_STRUCTURE,
    );
    return queryBuilderState.buildQuery();
  } finally {
    queryBuilderState.setLambdaWriteMode(mode);
    if (queryBuilderState.executionContextState !== executionContextState) {
      queryBuilderState.setExecutionContextState(executionContextState);
    }
  }
};

/** The relation of a typed query's body: its expression, without the `from(…)` that ends it */
const relationOf = (body: unknown): JsonObject | undefined => {
  const [expression] = Array.isArray(body) ? (body as unknown[]) : [];
  if (functionOf(expression) === 'from' && isJsonObject(expression)) {
    const [relation] = argumentsOf(expression);
    return isJsonObject(relation) ? relation : undefined;
  }
  return isJsonObject(expression) ? expression : undefined;
};

/**
 * The data space source the query builder's query is (PLAN §11.25), or why
 * it isn't one: its entity, the query builder's lambda, which its editor
 * opens again, and the same query as a Relation, which Cube runs. A
 * date-versioned class's dates are parameters in the query builder; the
 * Relation has their values in their place, the current date unless the
 * user gave another, so a cube reads the class as of the day it runs. Any
 * other parameter is refused: a Cube run has no parameter to give.
 *
 * Builds the query twice, the second time switching the writer to typed and
 * back: run it in an action, outside a computed value.
 */
export const buildCubeDataSpaceQuery = (
  queryBuilderState: DataSpaceQueryBuilderState,
): CubeDataSpaceQueryResult => {
  const problem = (text: string): CubeDataSpaceQueryResult => ({
    problem: text,
  });
  if (!queryBuilderState.isQuerySupported) {
    return problem(CUBE_DATA_SPACE_QUERY_PROBLEM.UNSUPPORTED);
  }
  const entity = queryBuilderState.sourceClass;
  if (!entity) {
    return problem(CUBE_DATA_SPACE_QUERY_PROBLEM.NO_ENTITY);
  }
  const { executionContext, dataSpace } = queryBuilderState;
  const mapping = resolveExecutionContextMapping(executionContext);
  if (!mapping) {
    return problem(
      CUBE_DATA_SPACE_QUERY_PROBLEM.NO_MAPPING(executionContext.name),
    );
  }
  const { runtimeValue } = queryBuilderState.executionContextState;
  if (!(runtimeValue instanceof RuntimePointer)) {
    return problem(CUBE_DATA_SPACE_QUERY_PROBLEM.NO_RUNTIME);
  }
  const [issue] = queryBuilderState.allValidationIssues;
  if (issue !== undefined) {
    return problem(issue);
  }
  // the dates of a date-versioned class, with their values; no other parameter
  const values = new Map<string, JsonObject>();
  for (const parameterState of queryBuilderState.parametersState
    .parameterStates) {
    const { parameter, value } = parameterState;
    if (!queryBuilderState.milestoningState.isMilestoningParameter(parameter)) {
      return problem(CUBE_DATA_SPACE_QUERY_PROBLEM.PARAMETER(parameter.name));
    }
    if (!value) {
      return problem(
        CUBE_DATA_SPACE_QUERY_PROBLEM.DATE_WITHOUT_VALUE(parameter.name),
      );
    }
    values.set(
      parameter.name,
      queryBuilderState.graphManagerState.graphManager.serializeValueSpecification(
        value,
      ) as JsonObject,
    );
  }
  let query: JsonObject;
  let relation: JsonObject | undefined;
  try {
    query = lambdaJsonOf(queryBuilderState.buildQuery());
    const shapeProblem = getCubeDataSpaceQueryShapeProblem(query.body);
    if (shapeProblem !== undefined) {
      return problem(shapeProblem);
    }
    relation = relationOf(buildTypedQuery(queryBuilderState).body);
  } catch (error) {
    // e.g. a derived column whose type the engine hasn't given yet
    return problem(error instanceof Error ? error.message : String(error));
  }
  if (!relation) {
    return problem(CUBE_DATA_SPACE_QUERY_PROBLEM.OTHER);
  }
  return {
    edit: {
      coordinates: {
        dataSpace: dataSpace.path,
        executionContext: executionContext.name,
        entity: entity.path,
        query,
        relation: {
          _type: 'lambda',
          body: [
            substituteCubeDataSpaceVariables(relation, values) as JsonObject,
          ],
          parameters: [],
        },
      },
      mapping: mapping.path,
      runtime: runtimeValue.packageableRuntime.value.path,
    },
  };
};
