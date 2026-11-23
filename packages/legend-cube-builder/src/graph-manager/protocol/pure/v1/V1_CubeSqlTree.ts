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

import {
  CubeSqlJoinType,
  CubeSqlStepKind,
  type CubeSqlStep,
} from '../../../CubeSqlStructure.js';
import { V1_findCubeSqlSources } from './V1_CubeSqlIsland.js';

// The engine's tree of the SQL of an island, `#SQL{…}#`, as its SQL grammar
// parses it (`POST sql/v1/grammar/grammarToJson`), read into the steps
// its clauses are, in the order they run: sources, joins, Where, Group by,
// Having, Select, Order by, Offset, Limit. Each step says what its clause
// says, printed back as SQL from the tree. Cube checks none of it; what it
// has no step for it refuses, and the island stays one box.

/** What of an island's SQL Cube has no step for, in words, after "Its SQL has" */
export const V1_CUBE_SQL_TREE_MESSAGE = {
  SHAPE: "a tree the engine wrote in a way Cube doesn't know",
  SUBQUERY: 'a query inside an expression',
  RECURSIVE: 'a recursive with',
  WINDOWS: 'a window clause',
  UNKNOWN: (type: string): string => `what the engine reads as "${type}"`,
};

/** Thrown for SQL Cube has no steps for: its message says what, in words */
export class V1_CubeSqlTreeError extends Error {}

type Json = Readonly<Record<string, unknown>>;

const refuse = (what: string): never => {
  throw new V1_CubeSqlTreeError(what);
};
const isJson = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const nodeOf = (value: unknown): Json =>
  isJson(value) ? value : refuse(V1_CUBE_SQL_TREE_MESSAGE.SHAPE);
const listOf = (value: unknown): readonly unknown[] =>
  Array.isArray(value) ? (value as readonly unknown[]) : [];
const typeOf = (node: Json): string =>
  typeof node._type === 'string' ? node._type : '';
const textOf = (value: unknown): string =>
  typeof value === 'string' ? value : refuse(V1_CUBE_SQL_TREE_MESSAGE.SHAPE);
const scalarOf = (value: unknown): string =>
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean'
    ? String(value)
    : refuse(V1_CUBE_SQL_TREE_MESSAGE.SHAPE);
const isPresent = (value: unknown): boolean =>
  value !== undefined && value !== null;
/** A qualified name's parts: `o`, `AMOUNT` of `o.AMOUNT` */
const partsOf = (name: unknown): string[] =>
  listOf(nodeOf(name).parts).map(textOf);
const nameOf = (name: unknown): string => partsOf(name).join('.');

// --------------------------------- Expressions ---------------------------------

/** How tightly an expression binds: one that binds less than what holds it is put in parentheses */
enum Precedence {
  OR = 1,
  AND,
  NOT,
  COMPARISON,
  ADD,
  MULTIPLY,
  POWER,
  UNARY,
  ATOM,
}

const COMPARISON_OPERATORS: Readonly<Record<string, string>> = {
  EQUAL: '=',
  NOT_EQUAL: '<>',
  GREATER_THAN: '>',
  LESS_THAN: '<',
  GREATER_THAN_OR_EQUAL: '>=',
  LESS_THAN_OR_EQUAL: '<=',
  IS_DISTINCT_FROM: 'is distinct from',
  IS_NOT_DISTINCT_FROM: 'is not distinct from',
  REGEX_MATCH: '~',
  REGEX_MATCH_CI: '~*',
  REGEX_NO_MATCH: '!~',
  REGEX_NO_MATCH_CI: '!~*',
  LIKE: '~~',
  ILIKE: '~~*',
  NOT_LIKE: '!~~',
  NOT_ILIKE: '!~~*',
};

const ARITHMETIC_OPERATORS: Readonly<Record<string, [string, Precedence]>> = {
  ADD: ['+', Precedence.ADD],
  SUBTRACT: ['-', Precedence.ADD],
  MULTIPLY: ['*', Precedence.MULTIPLY],
  DIVIDE: ['/', Precedence.MULTIPLY],
  MODULUS: ['%', Precedence.MULTIPLY],
  POWER: ['^', Precedence.POWER],
};

const LOGICAL_OPERATORS: Readonly<Record<string, [string, Precedence]>> = {
  AND: ['and', Precedence.AND],
  OR: ['or', Precedence.OR],
};

/** An expression as SQL, in parentheses when it binds less than what holds it */
const print = (value: unknown, holder: Precedence = Precedence.OR): string => {
  const [text, precedence] = printExpression(nodeOf(value));
  return precedence < holder ? `(${text})` : text;
};

const printList = (values: unknown): string =>
  listOf(values)
    .map((value) => print(value))
    .join(', ');

const printSortItem = (value: unknown): string => {
  const item = nodeOf(value);
  return `${print(item.sortKey)}${item.ordering === 'DESCENDING' ? ' desc' : ''}${
    item.nullOrdering === 'FIRST'
      ? ' nulls first'
      : item.nullOrdering === 'LAST'
        ? ' nulls last'
        : ''
  }`;
};

const printSortItems = (values: unknown): string =>
  listOf(values).map(printSortItem).join(', ');

const printWindow = (value: unknown): string => {
  const window = nodeOf(value);
  if (isPresent(window.windowRef)) {
    return textOf(window.windowRef);
  }
  if (isPresent(window.windowFrame)) {
    return refuse(V1_CUBE_SQL_TREE_MESSAGE.UNKNOWN('windowFrame'));
  }
  return [
    ...(listOf(window.partitions).length
      ? [`partition by ${printList(window.partitions)}`]
      : []),
    ...(listOf(window.orderBy).length
      ? [`order by ${printSortItems(window.orderBy)}`]
      : []),
  ].join(' ');
};

const printFunctionCall = (call: Json): string => {
  if (isPresent(call.filter) || isPresent(call.group)) {
    return refuse(
      V1_CUBE_SQL_TREE_MESSAGE.UNKNOWN(
        isPresent(call.filter) ? 'filter' : 'group',
      ),
    );
  }
  const name = nameOf(call.name);
  const values = listOf(call.arguments);
  return `${name}(${call.distinct === true ? 'distinct ' : ''}${
    // the tree keeps no `*`: `count(*)` is a count of nothing
    values.length || name.toLowerCase() !== 'count' ? printList(values) : '*'
  }${
    listOf(call.orderBy).length
      ? ` order by ${printSortItems(call.orderBy)}`
      : ''
  })${isPresent(call.window) ? ` over (${printWindow(call.window)})` : ''}`;
};

const printType = (value: unknown): string => {
  const type = nodeOf(value);
  if (typeOf(type) !== 'columnType') {
    return refuse(V1_CUBE_SQL_TREE_MESSAGE.UNKNOWN(typeOf(type)));
  }
  const parameters = listOf(type.parameters).map(scalarOf);
  return `${textOf(type.name)}${parameters.length ? `(${parameters.join(', ')})` : ''}`;
};

const printWhens = (expression: Json): string =>
  [
    ...listOf(expression.whenClauses).map((value) => {
      const when = nodeOf(value);
      return `when ${print(when.operand)} then ${print(when.result)}`;
    }),
    ...(isPresent(expression.defaultValue)
      ? [`else ${print(expression.defaultValue)}`]
      : []),
    'end',
  ].join(' ');

/** An expression as SQL, and how tightly it binds */
function printExpression(expression: Json): [string, Precedence] {
  const type = typeOf(expression);
  // what a comparison compares binds tighter than it
  const operand = (value: unknown): string => print(value, Precedence.ADD);
  switch (type) {
    case 'qualifiedNameReference':
      return [nameOf(expression.name), Precedence.ATOM];
    case 'stringLiteral':
      return [
        `'${textOf(expression.value).replaceAll("'", "''")}'`,
        Precedence.ATOM,
      ];
    case 'integerLiteral':
    case 'longLiteral':
    case 'doubleLiteral':
    case 'booleanLiteral':
      return [scalarOf(expression.value), Precedence.ATOM];
    case 'nullLiteral':
      return ['null', Precedence.ATOM];
    case 'allColumns':
      return [
        isPresent(expression.prefix) ? `${textOf(expression.prefix)}.*` : '*',
        Precedence.ATOM,
      ];
    case 'functionCall':
      return [printFunctionCall(expression), Precedence.ATOM];
    case 'cast':
      return [
        `cast(${print(expression.expression)} as ${printType(expression.type)})`,
        Precedence.ATOM,
      ];
    case 'extract':
      return [
        `extract(${textOf(expression.field).toLowerCase()} from ${print(expression.expression)})`,
        Precedence.ATOM,
      ];
    case 'searchedCaseExpression':
      return [`case ${printWhens(expression)}`, Precedence.ATOM];
    case 'simpleCaseExpression':
      return [
        `case ${print(expression.operand)} ${printWhens(expression)}`,
        Precedence.ATOM,
      ];
    case 'namedArgumentExpression':
      return [
        `${textOf(expression.name)} => ${print(expression.expression)}`,
        Precedence.OR,
      ];
    case 'negativeExpression':
      return [
        `-${print(expression.value, Precedence.UNARY)}`,
        Precedence.UNARY,
      ];
    case 'notExpression':
      return [`not ${print(expression.value, Precedence.NOT)}`, Precedence.NOT];
    case 'arithmeticExpression': {
      const [operator, precedence] =
        ARITHMETIC_OPERATORS[textOf(expression.type)] ??
        refuse(V1_CUBE_SQL_TREE_MESSAGE.UNKNOWN(textOf(expression.type)));
      return [
        // `a - (b - c)`: the right side keeps its parentheses
        `${print(expression.left, precedence)} ${operator} ${print(expression.right, precedence + 1)}`,
        precedence,
      ];
    }
    case 'stringConcatenate':
      return [
        listOf(expression.values)
          .map((value) => print(value, Precedence.ADD + 1))
          .join(' || '),
        Precedence.ADD,
      ];
    case 'logicalBinaryExpression': {
      const [operator, precedence] =
        LOGICAL_OPERATORS[textOf(expression.type)] ??
        refuse(V1_CUBE_SQL_TREE_MESSAGE.UNKNOWN(textOf(expression.type)));
      return [
        `${print(expression.left, precedence)} ${operator} ${print(expression.right, precedence)}`,
        precedence,
      ];
    }
    case 'comparisonExpression':
      return [
        `${operand(expression.left)} ${
          COMPARISON_OPERATORS[textOf(expression.operator)] ??
          refuse(V1_CUBE_SQL_TREE_MESSAGE.UNKNOWN(textOf(expression.operator)))
        } ${operand(expression.right)}`,
        Precedence.COMPARISON,
      ];
    case 'betweenPredicate':
      return [
        `${operand(expression.value)} between ${operand(expression.min)} and ${operand(expression.max)}`,
        Precedence.COMPARISON,
      ];
    case 'inPredicate': {
      const values = nodeOf(expression.valueList);
      if (typeOf(values) !== 'inListExpression') {
        return refuse(V1_CUBE_SQL_TREE_MESSAGE.SUBQUERY);
      }
      return [
        `${operand(expression.value)} in (${printList(values.values)})`,
        Precedence.COMPARISON,
      ];
    }
    case 'likePredicate':
      return [
        `${operand(expression.value)} ${expression.ignoreCase === true ? 'ilike' : 'like'} ${operand(expression.pattern)}${
          isPresent(expression.escape)
            ? ` escape ${operand(expression.escape)}`
            : ''
        }`,
        Precedence.COMPARISON,
      ];
    case 'isNullPredicate':
      return [`${operand(expression.value)} is null`, Precedence.COMPARISON];
    case 'isNotNullPredicate':
      return [
        `${operand(expression.value)} is not null`,
        Precedence.COMPARISON,
      ];
    case 'subqueryExpression':
    case 'existsPredicate':
    case 'quantifiedComparisonExpression':
      return refuse(V1_CUBE_SQL_TREE_MESSAGE.SUBQUERY);
    default:
      return refuse(V1_CUBE_SQL_TREE_MESSAGE.UNKNOWN(type));
  }
}

// ---------------------------------- Relations ----------------------------------

/** The queries a `with` names, each with the names it may read itself */
type Scope = ReadonlyMap<
  string,
  { readonly name: string; readonly query: unknown; readonly scope: Scope }
>;

const SOURCE_KINDS: readonly CubeSqlStepKind[] = [
  CubeSqlStepKind.DATA_SET,
  CubeSqlStepKind.VARIABLE,
  CubeSqlStepKind.SOURCE,
];

const SET_OPERATIONS: Readonly<Record<string, string>> = {
  union: 'union',
  intersect: 'intersect',
  except: 'except',
};

const clause = (
  kind: CubeSqlStepKind,
  text: string,
  input: CubeSqlStep | undefined,
  more: Partial<CubeSqlStep> = {},
): CubeSqlStep => ({ kind, text, inputs: input ? [input] : [], ...more });

/** What comes after a query's rows are made: its order, then the rows it skips and keeps */
const readTrailing = (rows: CubeSqlStep, query: Json): CubeSqlStep => {
  let last = rows;
  if (listOf(query.orderBy).length) {
    last = clause(
      CubeSqlStepKind.ORDER_BY,
      printSortItems(query.orderBy),
      last,
    );
  }
  if (isPresent(query.offset)) {
    last = clause(CubeSqlStepKind.OFFSET, print(query.offset), last);
  }
  if (isPresent(query.limit)) {
    last = clause(CubeSqlStepKind.LIMIT, print(query.limit), last);
  }
  return last;
};

/** A table function of a `from`: `i('…')`, `var('…')`, `tb('…')`, `func('…', name => value)`… */
const readTableFunction = (call: Json): CubeSqlStep => {
  const name = nameOf(call.name).toLowerCase();
  const values = listOf(call.arguments).map(nodeOf);
  const [first] = values;
  const path =
    first && typeOf(first) === 'stringLiteral'
      ? textOf(first.value)
      : undefined;
  if (path !== undefined && values.length === 1) {
    if (name === 'i') {
      // a data set's path is split as legend-graph splits one in an SQL's text
      const [dataSet] = V1_findCubeSqlSources(`i('${path}')`).dataSets;
      if (dataSet) {
        return {
          kind: CubeSqlStepKind.DATA_SET,
          text: path,
          inputs: [],
          dataSet,
        };
      }
    }
    if (name === 'var') {
      return {
        kind: CubeSqlStepKind.VARIABLE,
        text: path,
        inputs: [],
        variable: path,
      };
    }
  }
  return {
    kind: CubeSqlStepKind.SOURCE,
    // a path is shown as it is, without its quotes
    text: values
      .map((value, index) =>
        index === 0 && path !== undefined ? path : print(value),
      )
      .join(', '),
    inputs: [],
    variant: name,
  };
};

const readRelation = (value: unknown, scope: Scope): CubeSqlStep => {
  const relation = nodeOf(value);
  const type = typeOf(relation);
  switch (type) {
    case 'aliasedRelation': {
      const columns = listOf(relation.columnNames).map(textOf);
      const alias = `${textOf(relation.alias)}${columns.length ? ` (${columns.join(', ')})` : ''}`;
      const named = readRelation(relation.relation, scope);
      return SOURCE_KINDS.includes(named.kind) ||
        (named.kind === CubeSqlStepKind.NAMED && named.alias === undefined)
        ? { ...named, alias }
        : // a query, or a join, in parentheses
          clause(CubeSqlStepKind.NAMED, alias, named, { variant: 'subquery' });
    }
    case 'tableFunction':
      return readTableFunction(nodeOf(relation.functionCall));
    case 'table': {
      const parts = partsOf(relation.name);
      const named =
        parts.length === 1
          ? scope.get((parts[0] as string).toLowerCase())
          : undefined;
      return named
        ? clause(
            CubeSqlStepKind.NAMED,
            named.name,
            readQuery(named.query, named.scope),
            { variant: 'with' },
          )
        : {
            kind: CubeSqlStepKind.SOURCE,
            text: parts.join('.'),
            inputs: [],
            variant: 'table',
          };
    }
    case 'join': {
      const joinType = Object.values(CubeSqlJoinType).find(
        (each) => each === relation.type,
      );
      if (!joinType) {
        return refuse(
          V1_CUBE_SQL_TREE_MESSAGE.UNKNOWN(scalarOf(relation.type)),
        );
      }
      const criteria = isPresent(relation.criteria)
        ? nodeOf(relation.criteria)
        : undefined;
      const criteriaType = criteria ? typeOf(criteria) : undefined;
      return {
        kind: CubeSqlStepKind.JOIN,
        text:
          criteria === undefined
            ? ''
            : criteriaType === 'joinOn'
              ? `on ${print(criteria.expression)}`
              : criteriaType === 'joinUsing'
                ? `using (${listOf(criteria.columns).map(textOf).join(', ')})`
                : criteriaType === 'naturalJoin'
                  ? 'natural'
                  : refuse(
                      V1_CUBE_SQL_TREE_MESSAGE.UNKNOWN(criteriaType ?? ''),
                    ),
        inputs: [
          readRelation(relation.left, scope),
          readRelation(relation.right, scope),
        ],
        variant: joinType,
      };
    }
    case 'tableSubquery':
      return readQuery(relation.query, scope);
    default:
      return refuse(V1_CUBE_SQL_TREE_MESSAGE.UNKNOWN(type));
  }
};

/** A Select's columns: what each says, and the name its rows give it */
const readSelectItems = (
  select: Json,
): { readonly text: string; readonly columns: string[] } => {
  const items = listOf(select.selectItems).map((value) => {
    const item = nodeOf(value);
    if (typeOf(item) === 'allColumns') {
      const all = print(item);
      return { text: all, column: all };
    }
    if (typeOf(item) !== 'singleColumn') {
      return refuse(V1_CUBE_SQL_TREE_MESSAGE.UNKNOWN(typeOf(item)));
    }
    const expression = nodeOf(item.expression);
    const text = print(expression);
    const alias = isPresent(item.alias) ? textOf(item.alias) : undefined;
    return {
      text: alias === undefined ? text : `${text} as ${alias}`,
      column:
        alias ??
        (typeOf(expression) === 'qualifiedNameReference'
          ? partsOf(expression.name).at(-1)
          : undefined) ??
        text,
    };
  });
  return {
    text: items.map((item) => item.text).join(', '),
    columns: items.map((item) => item.column),
  };
};

/** A `select … from …`: its sources joined, then its clauses in the order they run */
const readSpecification = (query: Json, scope: Scope): CubeSqlStep => {
  if (listOf(query.windows).length) {
    return refuse(V1_CUBE_SQL_TREE_MESSAGE.WINDOWS);
  }
  let last = listOf(query.from)
    .map((relation) => readRelation(relation, scope))
    .reduce<CubeSqlStep | undefined>(
      (left, right) =>
        left
          ? {
              // `from a, b`: every row of one with every row of the other
              kind: CubeSqlStepKind.JOIN,
              text: '',
              inputs: [left, right],
              variant: CubeSqlJoinType.CROSS,
            }
          : right,
      undefined,
    );
  if (isPresent(query.where)) {
    last = clause(CubeSqlStepKind.WHERE, print(query.where), last);
  }
  if (listOf(query.groupBy).length) {
    last = clause(CubeSqlStepKind.GROUP_BY, printList(query.groupBy), last);
  }
  if (isPresent(query.having)) {
    last = clause(CubeSqlStepKind.HAVING, print(query.having), last);
  }
  const select = nodeOf(query.select);
  const { text, columns } = readSelectItems(select);
  return readTrailing(
    clause(CubeSqlStepKind.SELECT, text, last, {
      columns,
      ...(select.distinct === true ? { variant: 'distinct' } : {}),
    }),
    query,
  );
};

function readQuery(value: unknown, scope: Scope): CubeSqlStep {
  const query = nodeOf(value);
  const type = typeOf(query);
  switch (type) {
    case 'query':
      return readTrailing(readQuery(query.queryBody, scope), query);
    case 'querySpecification':
      return readSpecification(query, scope);
    case 'queryWithScope': {
      const names = new Map(scope);
      if (isPresent(query.with)) {
        const scoped = nodeOf(query.with);
        if (scoped.recursive === true) {
          return refuse(V1_CUBE_SQL_TREE_MESSAGE.RECURSIVE);
        }
        listOf(scoped.withQueries).forEach((each) => {
          const named = nodeOf(each);
          const columns = listOf(named.columns).map(textOf);
          const name = textOf(named.name);
          // it may read the names before it, not itself
          names.set(name.toLowerCase(), {
            name: `${name}${columns.length ? ` (${columns.join(', ')})` : ''}`,
            query: named.query,
            scope: new Map(names),
          });
        });
      }
      return readQuery(query.queryBody, names);
    }
    case 'tableSubquery':
      return readQuery(query.query, scope);
    default: {
      const operation = SET_OPERATIONS[type];
      return operation === undefined
        ? refuse(V1_CUBE_SQL_TREE_MESSAGE.UNKNOWN(type))
        : readTrailing(
            {
              kind: CubeSqlStepKind.SET,
              text: '',
              inputs: [
                readQuery(query.left, scope),
                readQuery(query.right, scope),
              ],
              variant: `${operation}${query.distinct === true ? '' : ' all'}`,
            },
            query,
          );
    }
  }
}

/**
 * The steps of an island's SQL, from the engine's tree of it: the last step,
 * which reads the steps before it. Throws a `V1_CubeSqlTreeError` saying what
 * Cube has no step for.
 */
export const V1_readCubeSqlTree = (tree: unknown): CubeSqlStep =>
  readQuery(tree, new Map());
