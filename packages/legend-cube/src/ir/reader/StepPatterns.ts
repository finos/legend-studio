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
  AggregationFunction,
  type ColumnAggregation,
  WindowRankFunction,
  WindowRowFunction,
} from '../../nodes/transforms/Aggregation.js';
import {
  DifferenceSuffix,
  type DifferenceSettings,
} from '../../nodes/transforms/Difference.js';
import { type JoinSettings, JoinType } from '../../nodes/transforms/Join.js';
import {
  type ColumnDirection,
  SortDirection,
} from '../../nodes/transforms/Sort.js';
import type { IR } from '../CubeIR.js';
import { CONCAT_CONVERTED_COLUMN_BASE } from '../emitters/ConcatEmitter.js';
import {
  JOIN_KINDS,
  LEFT_KEY_SUFFIX,
  RIGHT_KEY_SUFFIX,
} from '../emitters/JoinEmitter.js';
import { getCubeFunctionName } from './CubeIRComparison.js';

// The steps Cube writes as several functions (Import Pure, PLAN §11.18),
// recognised whole: the inverse of `emitJoinRelation` and `emitJoin`,
// `emitDifference`, a Concat's conversions and `emitPartition`. Each reads
// the IR into the step's settings and the IR of its inputs, below the parts
// Cube adds to them, or gives nothing when the IR isn't that step's.

type Call = Extract<IR, { readonly k: 'func' }>;

export const isCubeCall = (
  ir: IR | undefined,
  name: string,
  arity?: number,
): ir is Call =>
  ir?.k === 'func' &&
  getCubeFunctionName(ir.name) === name &&
  (arity === undefined || ir.params.length === arity);

const columnOf = (ir: IR | undefined, row: string): string | undefined =>
  ir?.k === 'property' && ir.receiver.k === 'var' && ir.receiver.name === row
    ? ir.name
    : undefined;

const escapeRegExp = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');

/** Whether a name is the temporary one Cube gives a column: `<base><suffix>`, then a number when that is taken */
const isTemporaryName = (name: string, base: string, suffix: string): boolean =>
  new RegExp(`^${escapeRegExp(`${base}${suffix}`)}\\d*$`, 'u').test(name);

/** The relation below a chain of renames to temporary names, and each temporary name's column */
const peelTemporaryRenames = (
  ir: IR,
  suffix: string,
): { readonly rows: IR; readonly names: Map<string, string> } => {
  const names = new Map<string, string>();
  let rows = ir;
  while (isCubeCall(rows, 'rename', 3)) {
    const [inner, from, to] = rows.params as [IR, IR, IR];
    if (
      from.k !== 'colSpec' ||
      to.k !== 'colSpec' ||
      from.fn1 ||
      to.fn1 ||
      !isTemporaryName(to.name, from.name, suffix)
    ) {
      break;
    }
    names.set(to.name, from.name);
    rows = inner;
  }
  return { rows, names };
};

const JOIN_TYPES: ReadonlyMap<string, JoinType> = new Map(
  Object.entries(JOIN_KINDS).map(([type, kind]) => [kind, type as JoinType]),
);

/** A Join's settings and inputs, read from its `join` */
export interface JoinReading {
  /** The inputs, below the renames Cube gives same-named keys */
  readonly left: IR;
  readonly right: IR;
  readonly settings: JoinSettings;
}

/**
 * `<left>->join(<right>, JoinKind.<kind>, {l, r | $l.a == $r.b && …})`, the
 * same-named keys renamed to temporary names on either side, as
 * `emitJoinRelation` writes them; `toOne()` on a left key, or the keys the
 * other way round, read too
 */
export const readJoinCall = (ir: IR): JoinReading | undefined => {
  if (!isCubeCall(ir, 'join', 4)) {
    return undefined;
  }
  const [leftIr, rightIr, kind, condition] = ir.params as [IR, IR, IR, IR];
  const joinType =
    kind.k === 'enumValue' ? JOIN_TYPES.get(kind.value) : undefined;
  if (
    joinType === undefined ||
    condition.k !== 'lambda' ||
    condition.params.length !== 2 ||
    condition.body.length !== 1
  ) {
    return undefined;
  }
  const [l, r] = condition.params as [string, string];
  const pairs: { left: string; right: string }[] = [];
  const readPairs = (predicate: IR): boolean => {
    if (isCubeCall(predicate, 'and', 2)) {
      return predicate.params.every(readPairs);
    }
    if (!isCubeCall(predicate, 'equal', 2)) {
      return false;
    }
    const [a, b] = (predicate as Call).params as [IR, IR];
    const side = (key: IR, row: string): string | undefined =>
      columnOf(key, row) ??
      (isCubeCall(key, 'toOne', 1) ? columnOf(key.params[0], row) : undefined);
    const left = side(a, l) ?? side(b, l);
    const right = side(b, r) ?? side(a, r);
    if (left === undefined || right === undefined) {
      return false;
    }
    pairs.push({ left, right });
    return true;
  };
  if (!readPairs(condition.body[0] as IR) || !pairs.length) {
    return undefined;
  }
  const left = peelTemporaryRenames(leftIr, LEFT_KEY_SUFFIX);
  const right = peelTemporaryRenames(rightIr, RIGHT_KEY_SUFFIX);
  return {
    left: left.rows,
    right: right.rows,
    settings: {
      joinType,
      leftColumns: pairs.map(({ left: key }) => left.names.get(key) ?? key),
      rightColumns: pairs.map(({ right: key }) => right.names.get(key) ?? key),
    },
  };
};

/**
 * The `join` below a FULL join's merge of its same-named keys,
 * `->extend(~[k: x | $x.k__cube_l->coalesce($x.k__cube_r)], …)`, the merge
 * cast to the keys' common type or not; or the IR itself when it is no merge
 */
export const withoutJoinMerge = (ir: IR): IR => {
  if (!isCubeCall(ir, 'extend', 2)) {
    return ir;
  }
  const [joined, specs] = ir.params as [IR, IR];
  const isMerge = (spec: IR): boolean => {
    if (spec.k !== 'colSpec' || spec.fn2 || spec.fn1?.k !== 'lambda') {
      return false;
    }
    const [row] = spec.fn1.params;
    let value = spec.fn1.body[0];
    if (isCubeCall(value, 'cast', 2)) {
      value = value.params[0];
    }
    if (!isCubeCall(value, 'coalesce', 2) || row === undefined) {
      return false;
    }
    const [a, b] = value.params.map((each) => columnOf(each, row));
    return (
      a !== undefined &&
      b !== undefined &&
      isTemporaryName(a, spec.name, LEFT_KEY_SUFFIX) &&
      isTemporaryName(b, spec.name, RIGHT_KEY_SUFFIX)
    );
  };
  return specs.k === 'colSpecArray' &&
    specs.specs.length &&
    specs.specs.every(isMerge) &&
    isCubeCall(joined, 'join', 4)
    ? joined
    : ir;
};

/** A Difference's settings and inputs, read from its `select` */
export interface DifferenceReading {
  /** The inputs, below the renames of their difference columns */
  readonly left: IR;
  readonly right: IR;
  readonly settings: DifferenceSettings;
}

/**
 * As `emitDifference` writes a Difference: each input's difference columns
 * renamed `x_1` and `x_2`, a FULL join on the keys, one extend of
 * `x_valueDifference: x | [$x.x_1->coalesce(0), $x.x_2->coalesce(0)]->minus()`
 * per column, then a `select` of the columns
 */
export const readDifferenceSelect = (ir: IR): DifferenceReading | undefined => {
  if (!isCubeCall(ir, 'select', 2)) {
    return undefined;
  }
  const [extended] = ir.params as [IR];
  if (!isCubeCall(extended, 'extend', 2)) {
    return undefined;
  }
  const [joined, specs] = extended.params as [IR, IR];
  if (specs.k !== 'colSpecArray' || !specs.specs.length) {
    return undefined;
  }
  const differenceColumns: string[] = [];
  for (const spec of specs.specs) {
    if (
      spec.k !== 'colSpec' ||
      spec.fn2 ||
      spec.fn1?.k !== 'lambda' ||
      !spec.name.endsWith(DifferenceSuffix.DIFFERENCE)
    ) {
      return undefined;
    }
    const name = spec.name.slice(0, -DifferenceSuffix.DIFFERENCE.length);
    const [row] = spec.fn1.params;
    const [difference] = spec.fn1.body;
    const values =
      isCubeCall(difference, 'minus', 1) &&
      difference.params[0]?.k === 'collection'
        ? difference.params[0].values
        : [];
    const read = values.map((value) =>
      isCubeCall(value, 'coalesce', 2) && row !== undefined
        ? columnOf(value.params[0], row)
        : undefined,
    );
    if (
      read.length !== 2 ||
      read[0] !== `${name}${DifferenceSuffix.LEFT}` ||
      read[1] !== `${name}${DifferenceSuffix.RIGHT}`
    ) {
      return undefined;
    }
    differenceColumns.push(name);
  }
  const join = readJoinCall(withoutJoinMerge(joined));
  if (join?.settings.joinType !== JoinType.FULL_OUTER) {
    return undefined;
  }
  /** The input below its difference columns' renames to `x_1` or `x_2` */
  const peel = (rows: IR, suffix: DifferenceSuffix): IR | undefined => {
    let current = rows;
    const renamed = new Set<string>();
    while (isCubeCall(current, 'rename', 3)) {
      const [inner, from, to] = current.params as [IR, IR, IR];
      if (
        from.k !== 'colSpec' ||
        to.k !== 'colSpec' ||
        to.name !== `${from.name}${suffix}` ||
        !differenceColumns.includes(from.name)
      ) {
        break;
      }
      renamed.add(from.name);
      current = inner;
    }
    return renamed.size === differenceColumns.length ? current : undefined;
  };
  const left = peel(join.left, DifferenceSuffix.LEFT);
  const right = peel(join.right, DifferenceSuffix.RIGHT);
  return left && right
    ? {
        left,
        right,
        settings: {
          leftColumns: join.settings.leftColumns,
          rightColumns: join.settings.rightColumns,
          differenceColumns,
        },
      }
    : undefined;
};

/**
 * A Concat's input below the conversion of its columns to the types of the
 * other's (`emitConcat`'s Convert types): `->extend(~[cube_cast: x | $x.c->cast(@T), …])`,
 * a `select` with each in the place of its column, then
 * `->rename(~cube_cast, ~c)` each; or nothing when the input isn't converted
 */
export const peelConcatConversion = (ir: IR): IR | undefined => {
  let current = ir;
  let renames = 0;
  while (isCubeCall(current, 'rename', 3)) {
    const [inner, from] = current.params as [IR, IR];
    if (
      from.k !== 'colSpec' ||
      !from.name.startsWith(CONCAT_CONVERTED_COLUMN_BASE)
    ) {
      return undefined;
    }
    renames += 1;
    current = inner;
  }
  if (!renames || !isCubeCall(current, 'select', 2)) {
    return undefined;
  }
  const extended = (current as Call).params[0];
  if (!isCubeCall(extended, 'extend', 2)) {
    return undefined;
  }
  const [rows, specs] = extended.params as [IR, IR];
  const isConversion = (spec: IR): boolean =>
    spec.k === 'colSpec' &&
    spec.name.startsWith(CONCAT_CONVERTED_COLUMN_BASE) &&
    spec.fn1?.k === 'lambda' &&
    isCubeCall(spec.fn1.body[0], 'cast', 2);
  return specs.k === 'colSpecArray' &&
    specs.specs.length === renames &&
    specs.specs.every(isConversion)
    ? rows
    : undefined;
};

/** The window of `over(~[<columns>], [<sorts>])`, either list there or not */
const readOver = (
  ir: IR,
): { columns: string[]; sorts: ColumnDirection[] } | undefined => {
  if (!isCubeCall(ir, 'over') || ir.params.length > 2) {
    return undefined;
  }
  let columns: string[] = [];
  let sorts: ColumnDirection[] = [];
  for (const param of ir.params) {
    if (param.k === 'colSpecArray' || param.k === 'colSpec') {
      const specs = param.k === 'colSpec' ? [param] : param.specs;
      if (specs.some((spec) => spec.k !== 'colSpec' || spec.fn1)) {
        return undefined;
      }
      columns = specs.map((spec) => (spec as { name: string }).name);
    } else {
      const keys = param.k === 'collection' ? param.values : [param];
      const read = keys.map((key): ColumnDirection | undefined => {
        const column =
          isCubeCall(key, 'ascending', 1) || isCubeCall(key, 'descending', 1)
            ? key.params[0]
            : undefined;
        return column?.k === 'colSpec'
          ? {
              column: column.name,
              direction: isCubeCall(key, 'ascending', 1)
                ? SortDirection.ASC
                : SortDirection.DESC,
            }
          : undefined;
      });
      if (read.some((key) => key === undefined)) {
        return undefined;
      }
      sorts = read as ColumnDirection[];
    }
  }
  return { columns, sorts };
};

const WINDOW_REDUCES: ReadonlyMap<string, AggregationFunction> = new Map([
  ['size', AggregationFunction.COUNT],
  ['uniqueValueOnly', AggregationFunction.DISTINCT_VALUE],
  ['sum', AggregationFunction.SUM],
  ['average', AggregationFunction.AVERAGE],
  ['min', AggregationFunction.MIN],
  ['max', AggregationFunction.MAX],
]);

const RANKS: ReadonlyMap<string, WindowRankFunction> = new Map([
  ['rank', WindowRankFunction.RANK],
  ['denseRank', WindowRankFunction.DENSE_RANK],
  ['rowNumber', WindowRankFunction.ROW_NUMBER],
  ['ntile', WindowRankFunction.NTILE],
  ['percentRank', WindowRankFunction.PERCENT_RANK],
  ['cumulativeDistribution', WindowRankFunction.CUMULATIVE_DISTRIBUTION],
]);

const settingOf = (ir: IR | undefined): number | undefined => {
  if (ir?.k !== 'literal' || ir.value.kind !== 'integer') {
    return undefined;
  }
  const value = Number(ir.value.value);
  return Number.isSafeInteger(value) ? value : undefined;
};

/**
 * A window function, as `emitWindowFunction` writes one: an aggregate
 * `~n: {p, w, r | $r.c} : y | $y->sum()` (or `1`, counting every row), a
 * rank `~n: {p, w, r | $p->rank($w, $r)}`, a row
 * `~n: {p, w, r | $p->lag($r, 1).c}`; `first`, over a reversed window, is
 * Last's
 */
const readWindowFunction = (
  spec: IR,
  reversed: boolean,
): ColumnAggregation | undefined => {
  if (spec.k !== 'colSpec' || spec.fn1?.k !== 'lambda') {
    return undefined;
  }
  const { name, fn1, fn2 } = spec;
  const [p, w, r] = fn1.params;
  const [value] = fn1.body;
  if (fn1.params.length !== 3 || value === undefined || r === undefined) {
    return undefined;
  }
  if (fn2) {
    const [values] = fn2.k === 'lambda' ? fn2.params : [];
    const [reduced] = fn2.k === 'lambda' ? fn2.body : [];
    if (reduced?.k !== 'func' || reduced.params.length !== 1) {
      return undefined;
    }
    const [argument] = reduced.params as [IR];
    const reads = (ir: IR | undefined): boolean =>
      ir?.k === 'var' && ir.name === values;
    let fn: AggregationFunction | undefined;
    if (
      isCubeCall(reduced, 'size', 1) &&
      isCubeCall(argument, 'distinct', 1) &&
      reads(argument.params[0])
    ) {
      fn = AggregationFunction.DISTINCT_COUNT;
    } else if (reads(argument)) {
      fn = WINDOW_REDUCES.get(getCubeFunctionName(reduced.name));
    }
    if (fn === undefined) {
      return undefined;
    }
    if (
      value.k === 'literal' &&
      value.value.kind === 'integer' &&
      value.value.value === '1' &&
      fn === AggregationFunction.COUNT
    ) {
      return {
        name,
        column: undefined,
        function: AggregationFunction.COUNT_ROWS,
      };
    }
    const column = columnOf(value, r);
    return column === undefined ? undefined : { name, column, function: fn };
  }
  const isVar = (ir: IR | undefined, variable: string | undefined): boolean =>
    ir?.k === 'var' && ir.name === variable;
  if (value.k === 'func') {
    const rank = RANKS.get(getCubeFunctionName(value.name));
    const [pIr, second, third] = value.params;
    if (rank === undefined || !isVar(pIr, p)) {
      return undefined;
    }
    switch (rank) {
      case WindowRankFunction.ROW_NUMBER:
        return value.params.length === 2 && isVar(second, r)
          ? { name, column: undefined, function: rank }
          : undefined;
      case WindowRankFunction.NTILE: {
        const buckets = settingOf(third);
        return value.params.length === 3 &&
          isVar(second, r) &&
          buckets !== undefined
          ? { name, column: undefined, function: rank, buckets }
          : undefined;
      }
      default:
        return value.params.length === 3 && isVar(second, w) && isVar(third, r)
          ? { name, column: undefined, function: rank }
          : undefined;
    }
  }
  // a row function: a column of another row
  if (value.k !== 'property' || value.receiver.k !== 'func') {
    return undefined;
  }
  const row = value.receiver;
  const [pIr, second, third] = row.params;
  if (!isVar(pIr, p)) {
    return undefined;
  }
  const rowName = getCubeFunctionName(row.name);
  if ((rowName === 'lag' || rowName === 'lead') && row.params.length === 3) {
    const offset = settingOf(third);
    return isVar(second, r) && offset !== undefined
      ? {
          name,
          column: value.name,
          function:
            rowName === 'lag' ? WindowRowFunction.LAG : WindowRowFunction.LEAD,
          offset,
        }
      : undefined;
  }
  return rowName === 'first' &&
    row.params.length === 3 &&
    isVar(second, w) &&
    isVar(third, r)
    ? {
        name,
        column: value.name,
        function: reversed ? WindowRowFunction.LAST : WindowRowFunction.FIRST,
      }
    : undefined;
};

/** Whether `extend(<rows>, over(…), ~[…])`: a window */
export const isWindowExtend = (ir: IR): boolean =>
  isCubeCall(ir, 'extend', 3) && isCubeCall(ir.params[1], 'over');

/** A Partition's settings and input, read from its window extends */
export interface PartitionReading {
  readonly input: IR;
  readonly columns: readonly string[];
  readonly sorts: readonly ColumnDirection[];
  /** In the order the extends write them: aggregates, ranks and rows, lasts */
  readonly aggregations: readonly ColumnAggregation[];
}

/**
 * The window extends `emitPartition` writes, the outermost given: one, two
 * or three over the same window, Last's over that window with every sort
 * reversed. Nothing when they aren't over one window.
 */
export const readWindowExtends = (ir: IR): PartitionReading | undefined => {
  const extends_: { over: IR; specs: readonly IR[] }[] = [];
  let current = ir;
  while (isWindowExtend(current) && extends_.length < 3) {
    const [rows, over, specs] = (current as Call).params as [IR, IR, IR];
    extends_.unshift({
      over,
      specs:
        specs.k === 'colSpecArray'
          ? specs.specs
          : specs.k === 'colSpec'
            ? [specs]
            : [],
    });
    current = rows;
  }
  const windows = extends_.map(({ over }) => readOver(over));
  const [first] = windows;
  if (!first || windows.some((window) => window === undefined)) {
    return undefined;
  }
  const sameColumns = (a: readonly string[], b: readonly string[]): boolean =>
    a.length === b.length && a.every((column, index) => column === b[index]);
  const sameSorts = (
    a: readonly ColumnDirection[],
    b: readonly ColumnDirection[],
    reversed: boolean,
  ): boolean =>
    a.length === b.length &&
    a.every(
      (key, index) =>
        key.column === b[index]?.column &&
        (key.direction === b[index]?.direction) !== reversed,
    );
  const aggregations: ColumnAggregation[] = [];
  for (let index = 0; index < extends_.length; index += 1) {
    const window = windows[index] as NonNullable<(typeof windows)[number]>;
    if (!sameColumns(window.columns, first.columns)) {
      return undefined;
    }
    // the first extend's window is the Partition's; one with every sort
    // reversed, after it, is Last's
    const reversed =
      index > 0 &&
      first.sorts.length > 0 &&
      !sameSorts(window.sorts, first.sorts, false) &&
      sameSorts(window.sorts, first.sorts, true);
    if (!reversed && !sameSorts(window.sorts, first.sorts, false)) {
      return undefined;
    }
    for (const spec of (extends_[index] as { specs: readonly IR[] }).specs) {
      const aggregation = readWindowFunction(spec, reversed);
      if (!aggregation) {
        return undefined;
      }
      aggregations.push(aggregation);
    }
  }
  return aggregations.length
    ? {
        input: current,
        columns: first.columns,
        sorts: first.sorts,
        aggregations,
      }
    : undefined;
};
