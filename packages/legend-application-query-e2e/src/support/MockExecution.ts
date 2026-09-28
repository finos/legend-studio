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
  asGraphFetchTree,
  asLambda,
  at,
  getElementPath,
  getLambdaBody,
  getValue,
  type V1_AppliedFunction,
  type V1_AppliedProperty,
  type V1_ExecuteInput,
  type V1_Lambda,
  type V1_PropertyGraphFetchTree,
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
 * post-filters, sort, distinct, take and slice; aggregations (`groupBy`);
 * window columns (`olapGroupBy`); graph fetch; plus constants and parameters.
 * Anything else throws {@link UnsupportedQueryError}, which the engine mock
 * answers with an error naming what's missing — never with made-up rows, so a
 * test can't pass against a result its query didn't produce.
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

/**
 * Instances serialized along a graph fetch tree, e.g. by
 * `->graphFetch(#{...}#)->serialize(#{...}#)`: the result of a graph fetch
 * query, returned as JSON rather than a TDS.
 */
class SerializedInstances {
  constructor(readonly values: Instance[]) {}
}

/**
 * What an expression evaluates to: class instances, a TDS, a value, or
 * serialized instances.
 */
type Evaluated =
  | Instance[]
  | TDS
  | Value
  | Value[]
  | Instance
  | SerializedInstances;

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
  !(value instanceof SerializedInstances) &&
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
 * Order two values like the engine's SQL `ORDER BY`: empty values first,
 * then numbers numerically and strings and ISO dates lexically.
 */
const sortOrder = (left: Value, right: Value): number =>
  left === right
    ? 0
    : left === null
      ? -1
      : right === null
        ? 1
        : (compare(left, right) ?? 0);

// ------------------------------- aggregation -------------------------------

/** The non-empty values of a collection: SQL aggregates ignore NULLs. */
const presentValues = (value: Evaluated): Value[] =>
  asValues(value).filter((item) => item !== null);

const asNumbers = (value: Evaluated): number[] =>
  presentValues(value).map((item) =>
    typeof item === 'number'
      ? item
      : unsupported(`expected numbers to aggregate, got '${typeof item}'`),
  );

const sum = (values: number[]): number =>
  values.reduce((total, value) => total + value, 0);

const average = (values: number[]): number | null =>
  values.length ? sum(values) / values.length : null;

const standardDeviation = (values: number[], sample: boolean): Value => {
  const mean = average(values);
  const degreesOfFreedom = values.length - (sample ? 1 : 0);
  return mean === null || degreesOfFreedom <= 0
    ? null
    : Math.sqrt(
        sum(values.map((value) => (value - mean) ** 2)) / degreesOfFreedom,
      );
};

/**
 * The `fraction` (0..1) percentile of `values`: interpolated between the
 * closest ranks when `continuous` (SQL's `PERCENTILE_CONT`), otherwise the
 * first value at or past it (`PERCENTILE_DISC`).
 */
const percentile = (
  values: number[],
  fraction: number,
  ascending: boolean,
  continuous: boolean,
): Value => {
  if (!values.length) {
    return null;
  }
  const sorted = values.toSorted((a, b) => (ascending ? a - b : b - a));
  if (!continuous) {
    return at(sorted, Math.max(Math.ceil(fraction * sorted.length) - 1, 0));
  }
  const position = fraction * (sorted.length - 1);
  const lower = Math.floor(position);
  const lowerValue = at(sorted, lower);
  return (
    lowerValue +
    (at(sorted, Math.ceil(position)) - lowerValue) * (position - lower)
  );
};

/** The smallest or largest of values: numbers, strings or dates. */
const extreme = (value: Evaluated, pick: 'min' | 'max'): Value =>
  presentValues(value).reduce<Value>((best, item) => {
    if (best === null) {
      return item;
    }
    const order = sortOrder(item, best);
    return (pick === 'min' ? order < 0 : order > 0) ? item : best;
  }, null);

/**
 * The type of an aggregated value, for the aggregate functions whose result
 * type doesn't follow the aggregated values' — `count` of strings is still an
 * `Integer`, `average` of integers a `Float`.
 */
const AGGREGATE_RESULT_TYPES: Record<string, string> = {
  count: 'Integer',
  average: 'Float',
  mean: 'Float',
  wavg: 'Float',
  percentile: 'Float',
  stdDevPopulation: 'Float',
  stdDevSample: 'Float',
  joinStrings: 'String',
  rank: 'Integer',
  denseRank: 'Integer',
  rowNumber: 'Integer',
  percentRank: 'Float',
  averageRank: 'Float',
};

/** The function applied by a reducer lambda, e.g. `sum` for `x|$x->sum()`. */
const getReducerName = (reducer: V1_ValueSpecification | undefined): string =>
  getFunctionName(asFunction(getLambdaBody(reducer)));

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

/** Evaluate a reducer lambda, e.g. `x|$x->sum()`, over collected values. */
const reduce = (
  reducer: V1_ValueSpecification | undefined,
  values: Evaluated[],
  environment: Environment,
): Value =>
  asValue(evaluateLambda(reducer, values as Value[] | Instance[], environment));

/**
 * `groupBy(<instances>, [<key lambdas>], [agg(<mapper>, <reducer>), ...],
 * [<column names>])`: one row per distinct key, in the order keys are first
 * seen, holding the key columns then each aggregation over the group.
 */
const evaluateGroupBy = (
  func: V1_AppliedFunction,
  instances: Instance[],
  environment: Environment,
): TDS => {
  const keyLambdas = asCollection(at(func.parameters, 1)).values;
  const aggregations = asCollection(at(func.parameters, 2)).values.map(
    (value) => {
      const aggregation = asFunction(value);
      if (getFunctionName(aggregation) !== 'agg') {
        unsupported(`unsupported aggregation '${aggregation.function}'`);
      }
      return {
        mapper: at(aggregation.parameters, 0),
        reducer: at(aggregation.parameters, 1),
      };
    },
  );
  const names = asCollection(at(func.parameters, 3)).values.map(
    (value) => getValue(value) as string,
  );
  const types = SOURCE_PROPERTY_TYPES.get(instances) ?? {};

  const groups = new Map<string, { key: Value[]; members: Instance[] }>();
  for (const instance of instances) {
    const key = keyLambdas.map((lambda) =>
      asValue(evaluateLambda(lambda, instance, environment)),
    );
    const id = JSON.stringify(key);
    const group = groups.get(id) ?? { key, members: [] };
    group.members.push(instance);
    groups.set(id, group);
  }
  // with no key, everything aggregates into a single row
  if (!keyLambdas.length && !groups.size) {
    groups.set('[]', { key: [], members: [] });
  }

  const aggregationNames = names.slice(keyLambdas.length);
  return {
    columns: [
      ...keyLambdas.map((lambda, idx) => {
        const path = getPropertyPath(asLambda(lambda)).join('.');
        return {
          name: at(names, idx),
          type: types[path] ?? unsupported(`unknown property '${path}'`),
        };
      }),
      ...aggregations.map(({ mapper, reducer }, idx) => {
        const mapped = getLambdaBody(mapper);
        return {
          name: at(aggregationNames, idx),
          type:
            AGGREGATE_RESULT_TYPES[getReducerName(reducer)] ??
            (mapped._type === 'property'
              ? types[getPropertyPath(asLambda(mapper)).join('.')]
              : undefined) ??
            'Float',
        };
      }),
    ],
    rows: [...groups.values()].map((group) => {
      const row: Row = {};
      group.key.forEach((value, idx) => {
        row[at(names, idx)] = value;
      });
      aggregations.forEach(({ mapper, reducer }, idx) => {
        row[at(aggregationNames, idx)] = reduce(
          reducer,
          group.members.map((member) =>
            evaluateLambda(mapper, member, environment),
          ),
          environment,
        );
      });
      return row;
    }),
  };
};

/**
 * `olapGroupBy(<tds>, [<partition columns>], [<sort>], <operation>, <name>)`:
 * adds a window column, computed over each row's partition like SQL's
 * `OVER (PARTITION BY ... ORDER BY ...)`. The operation is either an
 * aggregation of a column, `func('<column>', y|$y->sum())` — over the whole
 * partition, or with a sort, cumulatively up to the row and its peers — or a
 * ranking, `y|$y->rank()`.
 */
const evaluateOLAPGroupBy = (
  func: V1_AppliedFunction,
  source: TDS,
  environment: Environment,
): TDS => {
  const hasSort = func.parameters.length === 5;
  const partitionColumns = asCollection(at(func.parameters, 1)).values.map(
    (value) => getValue(value) as string,
  );
  const sortFunction = hasSort ? asFunction(at(func.parameters, 2)) : undefined;
  const sortColumn = sortFunction
    ? (getValue(at(sortFunction.parameters, 0)) as string)
    : undefined;
  const descending = sortFunction
    ? getFunctionName(sortFunction) === 'desc'
    : false;
  const operation = at(func.parameters, hasSort ? 3 : 2);
  const name = getValue(at(func.parameters, hasSort ? 4 : 3)) as string;

  // `func('<column>', <reducer>)` aggregates a column, a bare lambda ranks
  const aggregation =
    operation._type === 'func' ? asFunction(operation, 'func') : undefined;
  const aggregatedColumn = aggregation
    ? (getValue(at(aggregation.parameters, 0)) as string)
    : undefined;
  const reducer = aggregation ? at(aggregation.parameters, 1) : operation;
  const operatorName = getReducerName(reducer);

  // compare rows by the sort column; without one, every row is a peer
  const orderOf = (left: Row, right: Row): number => {
    if (!sortColumn) {
      return 0;
    }
    const order = sortOrder(
      left[sortColumn] ?? null,
      right[sortColumn] ?? null,
    );
    return descending ? -order : order;
  };

  const partitions = new Map<string, number[]>();
  source.rows.forEach((row, idx) => {
    const key = JSON.stringify(
      partitionColumns.map((column) => row[column] ?? null),
    );
    partitions.set(key, [...(partitions.get(key) ?? []), idx]);
  });

  const values = new Map<number, Value>();
  for (const members of partitions.values()) {
    // a stable sort: peers keep their original order
    const ordered = members.toSorted((a, b) =>
      orderOf(at(source.rows, a), at(source.rows, b)),
    );
    const orderedRows = ordered.map((idx) => at(source.rows, idx));
    ordered.forEach((rowIdx, position) => {
      const row = at(orderedRows, position);
      const peersBefore = orderedRows.filter(
        (other) => orderOf(other, row) < 0,
      ).length;
      const peers = orderedRows.filter(
        (other) => orderOf(other, row) === 0,
      ).length;
      if (aggregatedColumn) {
        // with a sort, the frame runs up to the row and its peers
        const frame = sortColumn
          ? orderedRows.slice(0, peersBefore + peers)
          : orderedRows;
        values.set(
          rowIdx,
          reduce(
            reducer,
            frame.map((other) => other[aggregatedColumn] ?? null),
            environment,
          ),
        );
        return;
      }
      const rank = peersBefore + 1;
      const denseRank =
        new Set(
          orderedRows
            .filter((other) => orderOf(other, row) < 0)
            .map((other) =>
              JSON.stringify(sortColumn ? other[sortColumn] : null),
            ),
        ).size + 1;
      const ranks: Record<string, Value> = {
        rowNumber: position + 1,
        rank,
        denseRank,
        // the average of the positions the row's peers occupy
        averageRank: peersBefore + (peers + 1) / 2,
        percentRank:
          orderedRows.length > 1 ? (rank - 1) / (orderedRows.length - 1) : 0,
      };
      values.set(
        rowIdx,
        operatorName in ranks
          ? (ranks[operatorName] as Value)
          : unsupported(`unsupported window operation '${operatorName}'`),
      );
    });
  }

  const sourceType = aggregatedColumn
    ? source.columns.find((column) => column.name === aggregatedColumn)?.type
    : undefined;
  return {
    columns: [
      ...source.columns,
      {
        name,
        type: AGGREGATE_RESULT_TYPES[operatorName] ?? sourceType ?? 'Float',
      },
    ],
    rows: source.rows.map((row, idx) => ({
      ...row,
      [name]: values.get(idx) ?? null,
    })),
  };
};

/** Serialize an instance along a graph fetch (sub-)tree. */
const serializeInstance = (
  instance: Instance,
  subTrees: V1_PropertyGraphFetchTree[],
): Instance =>
  Object.fromEntries(
    subTrees.map((subTree) => {
      const value = instance[subTree.property];
      if (!subTree.subTrees.length || typeof value !== 'object' || !value) {
        return [subTree.property, value ?? null];
      }
      return [
        subTree.property,
        Array.isArray(value)
          ? value.map((item) =>
              serializeInstance(item as Instance, subTree.subTrees),
            )
          : serializeInstance(value as Instance, subTree.subTrees),
      ];
    }),
  );

/** Keep rows `[start, end)` of a TDS or a collection of instances. */
const sliceSource = (
  source: Evaluated,
  start: number,
  end?: number,
): Evaluated => {
  if (isTDS(source)) {
    return { ...source, rows: source.rows.slice(start, end) };
  }
  const instances = asInstances(source);
  return withPropertyTypes(
    instances.slice(start, end),
    SOURCE_PROPERTY_TYPES.get(instances),
  );
};

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
    case 'limit':
      return sliceSource(parameter(0), 0, asValue(parameter(1)) as number);
    case 'slice':
      return sliceSource(
        parameter(0),
        asValue(parameter(1)) as number,
        asValue(parameter(2)) as number,
      );
    case 'groupBy':
      return evaluateGroupBy(func, asInstances(parameter(0)), environment);
    case 'olapGroupBy':
      return evaluateOLAPGroupBy(func, asTDS(parameter(0)), environment);
    // what a graph fetch fetches only shapes what `serialize()` returns
    case 'graphFetch':
      return parameter(0);
    case 'serialize':
      return new SerializedInstances(
        asInstances(parameter(0)).map((instance) =>
          serializeInstance(
            instance,
            asGraphFetchTree(at(func.parameters, 1)).subTrees,
          ),
        ),
      );
    case 'distinct': {
      const source = parameter(0);
      // the collection form, e.g. counting distinct values: `$x->distinct()`
      if (!isTDS(source)) {
        return [...new Set(asValues(source))];
      }
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
            const order = sortOrder(
              a[key.column] ?? null,
              b[key.column] ?? null,
            );
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

    // aggregations, over the values collected for a group or window
    case 'count': {
      const source = parameter(0);
      return Array.isArray(source)
        ? source.filter((item) => item !== null).length
        : source === null
          ? 0
          : 1;
    }
    case 'sum':
      return sum(asNumbers(parameter(0)));
    case 'average':
    case 'mean':
      return average(asNumbers(parameter(0)));
    case 'min':
    case 'max':
      return extreme(parameter(0), getFunctionName(func) as 'min' | 'max');
    case 'stdDevPopulation':
    case 'stdDevSample':
      return standardDeviation(
        asNumbers(parameter(0)),
        getFunctionName(func) === 'stdDevSample',
      );
    case 'uniqueValueOnly': {
      const values = [...new Set(presentValues(parameter(0)))];
      return values.length === 1 ? at(values, 0) : null;
    }
    case 'joinStrings':
      return presentValues(parameter(0))
        .map(String)
        .join(func.parameters.length > 1 ? String(asValue(parameter(1))) : '');
    case 'percentile':
      return percentile(
        asNumbers(parameter(0)),
        asValue(parameter(1)) as number,
        func.parameters.length > 2 ? isTrue(parameter(2)) : true,
        func.parameters.length > 3 ? isTrue(parameter(3)) : true,
      );
    // a weighted average maps each row to its value and weight first
    case 'wavgRowMapper':
      return { value: asValue(parameter(0)), weight: asValue(parameter(1)) };
    case 'wavg': {
      const rows = asInstances(parameter(0)).filter(
        (row) =>
          typeof row.value === 'number' && typeof row.weight === 'number',
      ) as { value: number; weight: number }[];
      const totalWeight = sum(rows.map((row) => row.weight));
      return totalWeight
        ? sum(rows.map((row) => row.value * row.weight)) / totalWeight
        : null;
    }
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

/** An engine JSON execution result, e.g. of a graph fetch query. */
export interface JSONExecutionResult {
  builder: { _type: 'json' };
  values: Instance[];
}

export type MockExecutionResult = TDSExecutionResult | JSONExecutionResult;

export const isTDSExecutionResult = (
  result: MockExecutionResult,
): result is TDSExecutionResult => result.builder._type === 'tdsBuilder';

/**
 * Evaluate the query posted to the execute endpoint.
 *
 * @throws {UnsupportedQueryError} if the query uses Pure this mock can't
 * evaluate
 */
export const executeQuery = (input: V1_ExecuteInput): MockExecutionResult => {
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
  if (result instanceof SerializedInstances) {
    return { builder: { _type: 'json' }, values: result.values };
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
