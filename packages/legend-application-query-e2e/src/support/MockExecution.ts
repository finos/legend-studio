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
  TEST_DATA__COVIDData,
  TEST_DATA__COVIDDataPropertyTypes,
  TEST_DATA__IngestDefinitions,
  TEST_DATA__LakehouseAccessPoints,
  type TEST_DATA__Relation,
} from './TEST_DATA__EngineResponses.js';
import {
  asCollection,
  asFunction,
  asLambda,
  at,
  getElementPath,
  getValue,
  type V1_AppliedFunction,
  type V1_AppliedProperty,
  type V1_ExecuteInput,
  type V1_Lambda,
  type V1_ValueSpecification,
  type V1_Variable,
} from './QueryProtocol.js';

/**
 * Evaluates the queries the query builder sends to the engine against
 * {@link TEST_DATA__COVIDData}, so results depend on the query: filters drop
 * rows, limits truncate them, sorts reorder them, and so on.
 *
 * Only the subset of Pure the e2e tests exercise is supported — projections
 * of `test::COVIDData` (including nested properties) with filters,
 * post-filters, sort, distinct, take and slice, plus constants and
 * parameters. Anything else (aggregations, window columns, graph fetch...)
 * throws {@link UnsupportedQueryError}, and the engine mock falls back to its
 * canned result.
 */

const ROOT_CLASS_PATH = 'test::COVIDData';

type Value = string | number | boolean | null;
type Instance = Record<string, unknown>;
type Row = Record<string, Value>;

interface TDSColumn {
  name: string;
  type: string;
}

interface TDS {
  columns: TDSColumn[];
  rows: Row[];
}

/** What an expression evaluates to: class instances, a TDS, or a value. */
type Evaluated = Instance[] | TDS | Value | Value[] | Instance;

type Environment = Map<string, Evaluated>;

export class UnsupportedQueryError extends Error {
  constructor(message: string) {
    super(`[mock execution] ${message}`);
  }
}

const unsupported = (message: string): never => {
  throw new UnsupportedQueryError(message);
};

const isTDS = (value: Evaluated): value is TDS =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  'columns' in value &&
  'rows' in value;

const asInstances = (value: Evaluated): Instance[] =>
  Array.isArray(value) &&
  value.every((item) => typeof item === 'object' && item !== null)
    ? (value as Instance[])
    : unsupported('expected class instances');

const asTDS = (value: Evaluated): TDS =>
  isTDS(value) ? value : unsupported('expected a TDS');

/** Function names may come fully qualified, e.g. `meta::...::today`. */
const getFunctionName = (func: V1_AppliedFunction): string =>
  func.function.split('::').pop() ?? func.function;

const PRIMITIVE_TYPES = new Set([
  'string',
  'integer',
  'float',
  'decimal',
  'boolean',
  'strictDate',
  'dateTime',
  'date',
]);

/** TDS row accessors a post-filter reads columns with, e.g. `getFloat`. */
const ROW_ACCESSORS = new Set([
  'getString',
  'getInteger',
  'getFloat',
  'getDecimal',
  'getNumber',
  'getBoolean',
  'getDate',
  'getStrictDate',
  'getDateTime',
]);

const RELATIONAL_TYPES: Record<string, string> = {
  Integer: 'INTEGER',
  Float: 'DOUBLE',
  Boolean: 'BIT',
  StrictDate: 'DATE',
};

const today = (): string => {
  const now = new Date();
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/** Compare like Pure: numbers numerically, strings and ISO dates lexically. */
const compare = (left: Value, right: Value): number | undefined => {
  if (left === null || right === null) {
    return undefined;
  }
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }
  const [l, r] = [String(left), String(right)];
  return l < r ? -1 : l > r ? 1 : 0;
};

const asValue = (value: Evaluated): Value =>
  value === null ||
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean'
    ? value
    : unsupported('expected a primitive value');

const asValues = (value: Evaluated): Value[] =>
  Array.isArray(value) ? value.map((item) => asValue(item)) : [asValue(value)];

const asVariable = (node: V1_ValueSpecification | undefined): V1_Variable =>
  node?._type === 'var'
    ? (node as V1_Variable)
    : unsupported(`expected a variable, got '${node?._type ?? 'nothing'}'`);

/**
 * The Pure type of each property of a source's instances, keyed by dotted
 * path, so a projection can type its columns — sources are either class
 * instances or the rows of a relation (an access point or ingest data set).
 */
const SOURCE_PROPERTY_TYPES = new WeakMap<Instance[], Record<string, string>>();

const withPropertyTypes = (
  instances: Instance[],
  types: Record<string, string> | undefined,
): Instance[] => {
  if (types) {
    SOURCE_PROPERTY_TYPES.set(instances, types);
  }
  return instances;
};

/** A projected column: its name, and the property path it reads. */
interface ColumnSpec {
  name: string;
  path: string[];
}

/**
 * The columns of a `project()`, in either of its forms: lambdas and names as
 * two collections, or a column spec array (`~[name: x | ...]`).
 */
const getProjectedColumns = (func: V1_AppliedFunction): ColumnSpec[] => {
  const columns = at(func.parameters, 1) as V1_ValueSpecification & {
    type?: string;
    value?: { colSpecs: { name: string; function1: V1_ValueSpecification }[] };
  };
  if (columns._type === 'classInstance' && columns.type === 'colSpecArray') {
    return (columns.value?.colSpecs ?? []).map((colSpec) => ({
      name: colSpec.name,
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      path: getPropertyPath(asLambda(colSpec.function1)),
    }));
  }
  const names = asCollection(at(func.parameters, 2)).values.map(
    (value) => getValue(value) as string,
  );
  return asCollection(columns).values.map((value, idx) => ({
    name: at(names, idx),
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    path: getPropertyPath(asLambda(value)),
  }));
};

/** The chain of properties a column lambda navigates, e.g. `demographics.state`. */
const getPropertyPath = (lambda: V1_Lambda): string[] => {
  const variable = asVariable(at(lambda.parameters, 0)).name;
  const path: string[] = [];
  let current: V1_ValueSpecification | undefined = at(lambda.body, 0);
  while (current?._type === 'property') {
    const property = current as V1_AppliedProperty;
    path.unshift(property.property);
    current = property.parameters[0];
  }
  if (current?._type !== 'var' || (current as V1_Variable).name !== variable) {
    unsupported('expected a column to navigate properties of its variable');
  }
  return path;
};

const navigate = (instance: Instance, path: string[]): Value => {
  let current: unknown = instance;
  for (const property of path) {
    current =
      typeof current === 'object' && current !== null
        ? (current as Instance)[property]
        : undefined;
  }
  return current === undefined ? null : asValue(current as Evaluated);
};

/** Evaluate a one-parameter lambda, binding its parameter to `argument`. */
const evaluateLambda = (
  node: V1_ValueSpecification | undefined,
  argument: Evaluated,
  environment: Environment,
): Evaluated => {
  const lambda = asLambda(node);
  const scope = new Map(environment);
  scope.set(asVariable(at(lambda.parameters, 0)).name, argument);
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return evaluate(at(lambda.body, 0), scope);
};

const isTrue = (value: Evaluated): boolean => value === true;

const evaluateFunction = (
  func: V1_AppliedFunction,
  environment: Environment,
): Evaluated => {
  const parameter = (index: number): Evaluated =>
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    evaluate(at(func.parameters, index), environment);

  switch (getFunctionName(func)) {
    // sources and TDS operations
    case 'getAll': {
      const path = getElementPath(at(func.parameters, 0));
      return path === ROOT_CLASS_PATH
        ? withPropertyTypes(
            structuredClone(TEST_DATA__COVIDData),
            TEST_DATA__COVIDDataPropertyTypes,
          )
        : unsupported(`no instances of '${path}'`);
    }
    case 'filter': {
      const source = parameter(0);
      if (isTDS(source)) {
        return {
          columns: source.columns,
          rows: source.rows.filter((row) =>
            isTrue(evaluateLambda(func.parameters[1], row, environment)),
          ),
        };
      }
      const instances = asInstances(source);
      return withPropertyTypes(
        instances.filter((instance) =>
          isTrue(evaluateLambda(func.parameters[1], instance, environment)),
        ),
        SOURCE_PROPERTY_TYPES.get(instances),
      );
    }
    case 'project': {
      const instances = asInstances(parameter(0));
      const types = SOURCE_PROPERTY_TYPES.get(instances) ?? {};
      const columns = getProjectedColumns(func);
      return {
        columns: columns.map((column) => ({
          name: column.name,
          type:
            types[column.path.join('.')] ??
            unsupported(`unknown property '${column.path.join('.')}'`),
        })),
        rows: instances.map((instance) =>
          Object.fromEntries(
            columns.map((column) => [
              column.name,
              navigate(instance, column.path),
            ]),
          ),
        ),
      };
    }
    // `limit` is the relation form, e.g. of a query reloaded from its text
    case 'take':
    case 'limit': {
      const source = asTDS(parameter(0));
      return {
        ...source,
        rows: source.rows.slice(0, asValue(parameter(1)) as number),
      };
    }
    case 'slice': {
      const source = asTDS(parameter(0));
      return {
        ...source,
        rows: source.rows.slice(
          asValue(parameter(1)) as number,
          asValue(parameter(2)) as number,
        ),
      };
    }
    case 'distinct': {
      const source = asTDS(parameter(0));
      const seen = new Set<string>();
      return {
        ...source,
        rows: source.rows.filter((row) => {
          const key = JSON.stringify(
            source.columns.map((column) => row[column.name]),
          );
          return seen.has(key) ? false : (seen.add(key), true);
        }),
      };
    }
    case 'sort': {
      const source = asTDS(parameter(0));
      const keys = asCollection(at(func.parameters, 1)).values.map((value) => {
        const direction = asFunction(value);
        return {
          column: getValue(at(direction.parameters, 0)) as string,
          descending: getFunctionName(direction) === 'desc',
        };
      });
      return {
        ...source,
        rows: source.rows.toSorted((a, b) => {
          for (const key of keys) {
            // empty values sort first, as in the engine's SQL
            const [left, right] = [
              a[key.column] ?? null,
              b[key.column] ?? null,
            ];
            const order =
              left === right
                ? 0
                : left === null
                  ? -1
                  : right === null
                    ? 1
                    : (compare(left, right) ?? 0);
            if (order !== 0) {
              return key.descending ? -order : order;
            }
          }
          return 0;
        }),
      };
    }
    // where the query runs — e.g. `->with(<data product>)->from(<runtime>)`
    // — doesn't change what it returns
    case 'with':
    case 'from':
      return parameter(0);
    case 'letFunction': {
      const value = parameter(1);
      environment.set(getValue(at(func.parameters, 0)) as string, value);
      return value;
    }

    // conditions
    case 'and':
      return isTrue(parameter(0)) && isTrue(parameter(1));
    case 'or':
      return isTrue(parameter(0)) || isTrue(parameter(1));
    case 'not':
      return !isTrue(parameter(0));
    case 'equal':
      return asValue(parameter(0)) === asValue(parameter(1));
    case 'greaterThan':
    case 'greaterThanEqual':
    case 'lessThan':
    case 'lessThanEqual': {
      const order = compare(asValue(parameter(0)), asValue(parameter(1)));
      if (order === undefined) {
        return false;
      }
      return {
        greaterThan: order > 0,
        greaterThanEqual: order >= 0,
        lessThan: order < 0,
        lessThanEqual: order <= 0,
      }[getFunctionName(func)] as boolean;
    }
    case 'in':
      return asValues(parameter(1)).includes(asValue(parameter(0)));
    case 'isEmpty':
      return asValue(parameter(0)) === null;
    case 'isNotEmpty':
      return asValue(parameter(0)) !== null;
    case 'contains':
    case 'startsWith':
    case 'endsWith': {
      const [text, search] = [asValue(parameter(0)), asValue(parameter(1))];
      if (typeof text !== 'string' || typeof search !== 'string') {
        return false;
      }
      return getFunctionName(func) === 'contains'
        ? text.includes(search)
        : getFunctionName(func) === 'startsWith'
          ? text.startsWith(search)
          : text.endsWith(search);
    }
    case 'today':
      return today();
    default:
      return unsupported(`unsupported function '${func.function}'`);
  }
};

/** The data behind a relation accessor, by its type and path. */
const getRelation = (
  type: string,
  path: string[],
): TEST_DATA__Relation | undefined => {
  switch (type) {
    case 'P':
      return TEST_DATA__LakehouseAccessPoints[path.join('.')];
    case 'I': {
      const [ingestPath, dataSet] = path;
      return dataSet === undefined
        ? undefined
        : TEST_DATA__IngestDefinitions.find(
            (ingest) => ingest.path === ingestPath,
          )?.dataSets[dataSet];
    }
    default:
      return undefined;
  }
};

const evaluate = (
  node: V1_ValueSpecification,
  environment: Environment,
): Evaluated => {
  if (PRIMITIVE_TYPES.has(node._type)) {
    return getValue(node);
  }
  switch (node._type) {
    case 'func':
      return evaluateFunction(node as V1_AppliedFunction, environment);
    case 'var': {
      const { name } = node as V1_Variable;
      return environment.has(name)
        ? (environment.get(name) as Evaluated)
        : unsupported(`unbound variable '${name}'`);
    }
    // a relation to query: a Lakehouse access point, e.g.
    // `#P{test::CovidDataProduct.confirmed_cases}#`, or an ingest data set,
    // e.g. `#I{test::CovidIngest.CovidCases}#`
    case 'classInstance': {
      const accessor = node as V1_ValueSpecification & {
        type: string;
        value: { path: string[] };
      };
      const relation = getRelation(accessor.type, accessor.value.path);
      return relation
        ? withPropertyTypes(structuredClone(relation.rows), relation.columns)
        : unsupported(`unsupported class instance '${accessor.type}'`);
    }
    case 'enumValue':
      return (node as V1_ValueSpecification & { value: string }).value;
    case 'collection':
      return asCollection(node).values.map((value) =>
        asValue(evaluate(value, environment)),
      );
    case 'property': {
      const property = node as V1_AppliedProperty;
      const owner = evaluate(at(property.parameters, 0), environment);
      // a post-filter reads a TDS row column, e.g. `$row.getFloat('Cases')`
      if (ROW_ACCESSORS.has(property.property)) {
        const column = getValue(at(property.parameters, 1)) as string;
        return (owner as Row)[column] ?? null;
      }
      // otherwise it navigates an instance, possibly to a nested one
      if (typeof owner !== 'object' || owner === null || Array.isArray(owner)) {
        return null;
      }
      const value = (owner as Instance)[property.property];
      return value === undefined ? null : (value as Evaluated);
    }
    default:
      return unsupported(`unsupported value specification '${node._type}'`);
  }
};

/** An engine TDS execution result, as the execute endpoint returns it. */
export interface TDSExecutionResult {
  builder: {
    _type: 'tdsBuilder';
    columns: { name: string; type: string; relationalType: string }[];
  };
  activities: { _type: string; sql: string }[];
  result: { columns: string[]; rows: { values: Value[] }[] };
}

/**
 * Evaluate the query posted to the execute endpoint.
 *
 * @throws {UnsupportedQueryError} if the query uses Pure this mock can't
 * evaluate
 */
export const executeQuery = (input: V1_ExecuteInput): TDSExecutionResult => {
  const environment: Environment = new Map();
  (
    (
      input as {
        parameterValues?: { name: string; value: V1_ValueSpecification }[];
      }
    ).parameterValues ?? []
  ).forEach((parameter) =>
    environment.set(parameter.name, evaluate(parameter.value, environment)),
  );
  // a query with constants binds each with a leading `let`
  let result: Evaluated = null;
  for (const expression of input.function.body) {
    result = evaluate(expression, environment);
  }
  const tds = asTDS(result);
  return {
    builder: {
      _type: 'tdsBuilder',
      columns: tds.columns.map((column) => ({
        ...column,
        relationalType: RELATIONAL_TYPES[column.type] ?? 'VARCHAR(200)',
      })),
    },
    activities: [
      {
        _type: 'relational',
        sql: `select ${tds.columns
          .map((column) => `"${column.name}"`)
          .join(', ')} from COVID_DATA -- evaluated by the e2e engine mock`,
      },
    ],
    result: {
      columns: tds.columns.map((column) => column.name),
      rows: tds.rows.map((row) => ({
        values: tds.columns.map((column) => row[column.name] ?? null),
      })),
    },
  };
};

/** Serialize a TDS result as CSV, as the engine does when exporting. */
export const toCSV = (result: TDSExecutionResult): string => {
  const escape = (value: Value): string => {
    const text = value === null ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [result.result.columns, ...result.result.rows.map((row) => row.values)]
    .map((values) => values.map(escape).join(','))
    .join('\n')
    .concat('\n');
};
