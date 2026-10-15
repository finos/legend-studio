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

import type { CubeResultValue } from '../../graph-manager/CubeEngine.js';
import { type CubeJsonNode, readCubeJson } from './CubeJson.js';

// What a Variant column's documents hold (PLAN §11.20), inferred from a
// sample of them, as legend-lite's Data Cube does: nothing in the model says,
// since the column is declared only SEMISTRUCTURED. The inferred type only
// picks the `to(@T)` an offer writes; the engine then types the column. A
// wrong pick isn't always an error, though: on Snowflake, DuckDB, Postgres
// and Databricks `to(@Integer)` of `1.5` returns a value, so the type is
// picked conservatively (`getCubeJsonScalarType`).

/** What a scalar looked like, which picks its `to(@T)` */
export enum CubeJsonScalarKind {
  INTEGER = 'integer',
  FLOAT = 'float',
  BOOLEAN = 'boolean',
  DATE = 'date',
  DATETIME = 'datetime',
  TEXT = 'text',
}

/** The Pure type each kind is read as */
export const CUBE_JSON_PURE_TYPE: Record<CubeJsonScalarKind, string> = {
  [CubeJsonScalarKind.INTEGER]: 'Integer',
  [CubeJsonScalarKind.FLOAT]: 'Float',
  [CubeJsonScalarKind.BOOLEAN]: 'Boolean',
  [CubeJsonScalarKind.DATE]: 'StrictDate',
  [CubeJsonScalarKind.DATETIME]: 'DateTime',
  [CubeJsonScalarKind.TEXT]: 'String',
};

/** A kind as the dialog names it */
export const CUBE_JSON_KIND_LABEL: Record<CubeJsonScalarKind, string> = {
  [CubeJsonScalarKind.INTEGER]: 'whole number',
  [CubeJsonScalarKind.FLOAT]: 'number',
  [CubeJsonScalarKind.BOOLEAN]: 'true or false',
  [CubeJsonScalarKind.DATE]: 'date',
  [CubeJsonScalarKind.DATETIME]: 'date and time',
  [CubeJsonScalarKind.TEXT]: 'text',
};

const DATE = /^\d{4}-\d{2}-\d{2}$/u;
const DATETIME =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/u;
const WHOLE_NUMBER = /^-?\d+$/u;
/** The largest whole number a 64-bit `to(@Integer)` holds */
const MAX_INTEGER = 9223372036854775807n;

/** At most this many distinct values of a position are counted */
const MAX_VALUES = 50;

const kindOf = (node: CubeJsonNode): CubeJsonScalarKind | undefined => {
  switch (node.kind) {
    case 'number':
      // a whole number past 64 bits would overflow `to(@Integer)`: text
      return WHOLE_NUMBER.test(node.text)
        ? BigInt(node.text) <= MAX_INTEGER && BigInt(node.text) >= -MAX_INTEGER
          ? CubeJsonScalarKind.INTEGER
          : CubeJsonScalarKind.TEXT
        : CubeJsonScalarKind.FLOAT;
    case 'boolean':
      return CubeJsonScalarKind.BOOLEAN;
    case 'string':
      return DATE.test(node.value)
        ? CubeJsonScalarKind.DATE
        : DATETIME.test(node.value)
          ? CubeJsonScalarKind.DATETIME
          : CubeJsonScalarKind.TEXT;
    default:
      return undefined;
  }
};

/** A scalar's text, as it is shown and counted */
const textOf = (node: CubeJsonNode): string =>
  node.kind === 'number'
    ? node.text
    : node.kind === 'string'
      ? node.value
      : node.kind === 'boolean'
        ? String(node.value)
        : '';

/** Everything seen at one position of the documents */
export interface CubeJsonShape {
  /** Times the position was there, empty included */
  present: number;
  /** Times it held null */
  nulls: number;
  /** The kinds of scalar seen, and how often */
  readonly scalars: Map<CubeJsonScalarKind, number>;
  /** Distinct scalar values and how often, up to `MAX_VALUES` of them */
  readonly values: Map<string, number>;
  /** Times it held an object */
  objects: number;
  /** The objects' fields, in the order first seen */
  readonly fields: Map<string, CubeJsonShape>;
  /** Times it held an array */
  arrays: number;
  /** Every element of every array seen here */
  element: CubeJsonShape | undefined;
  minLength: number;
  maxLength: number;
}

const emptyShape = (): CubeJsonShape => ({
  present: 0,
  nulls: 0,
  scalars: new Map(),
  values: new Map(),
  objects: 0,
  fields: new Map(),
  arrays: 0,
  element: undefined,
  minLength: Infinity,
  maxLength: 0,
});

const observe = (shape: CubeJsonShape, node: CubeJsonNode): void => {
  shape.present += 1;
  if (node.kind === 'null') {
    shape.nulls += 1;
    return;
  }
  if (node.kind === 'object') {
    shape.objects += 1;
    node.entries.forEach(([key, value]) => {
      let field = shape.fields.get(key);
      if (!field) {
        field = emptyShape();
        shape.fields.set(key, field);
      }
      observe(field, value);
    });
    return;
  }
  if (node.kind === 'array') {
    shape.arrays += 1;
    shape.minLength = Math.min(shape.minLength, node.items.length);
    shape.maxLength = Math.max(shape.maxLength, node.items.length);
    const element = shape.element ?? emptyShape();
    shape.element = element;
    node.items.forEach((item) => observe(element, item));
    return;
  }
  const kind = kindOf(node);
  if (kind) {
    shape.scalars.set(kind, (shape.scalars.get(kind) ?? 0) + 1);
  }
  const text = textOf(node);
  if (shape.values.has(text) || shape.values.size < MAX_VALUES) {
    shape.values.set(text, (shape.values.get(text) ?? 0) + 1);
  }
};

/** What a sample of a column showed */
export interface CubeJsonSample {
  /** The shape of the column's documents */
  readonly shape: CubeJsonShape;
  /** Cells read, empty ones included */
  readonly rows: number;
  /** Cells that couldn't be read as JSON */
  readonly unreadable: number;
  /** Every row of the column was read: the shape is the whole column's */
  readonly complete: boolean;
}

/** A column's shape, built as its cells arrive */
export class CubeJsonShapeReader {
  private readonly shape = emptyShape();
  private rows = 0;
  private unreadable = 0;

  /** A cell as the grid receives it: the document's JSON text, or null */
  add(cell: CubeResultValue): void {
    this.rows += 1;
    if (cell === null) {
      return;
    }
    const node = readCubeJson(String(cell));
    if (node) {
      observe(this.shape, node);
    } else {
      this.unreadable += 1;
    }
  }

  result(complete: boolean): CubeJsonSample {
    return {
      shape: this.shape,
      rows: this.rows,
      unreadable: this.unreadable,
      complete,
    };
  }
}

/** The shape of a sample of a column's cells */
export const inferCubeJsonShape = (
  cells: readonly CubeResultValue[],
  complete = false,
): CubeJsonSample => {
  const reader = new CubeJsonShapeReader();
  cells.forEach((cell) => reader.add(cell));
  return reader.result(complete);
};

/**
 * The one scalar type a position is read as, picked so a wrong guess can't
 * give wrong rows: one kind is that kind; whole numbers and fractions
 * together are numbers (`Float`); any other mix, dates with date-times
 * included, is text, which every value reads as. `undefined` when no scalar
 * was seen.
 */
export const getCubeJsonScalarType = (
  shape: CubeJsonShape,
): CubeJsonScalarKind | undefined => {
  const kinds = [...shape.scalars.keys()];
  if (kinds.length <= 1) {
    return kinds[0];
  }
  return kinds.every(
    (kind) =>
      kind === CubeJsonScalarKind.INTEGER || kind === CubeJsonScalarKind.FLOAT,
  )
    ? CubeJsonScalarKind.FLOAT
    : CubeJsonScalarKind.TEXT;
};

/** A position holds only scalars (and nulls): no object or array */
export const isCubeJsonScalarShape = (shape: CubeJsonShape): boolean =>
  shape.objects === 0 && shape.arrays === 0 && shape.scalars.size > 0;

/** A position's most frequent values, most frequent first, then by text */
export const getCubeJsonTopValues = (
  shape: CubeJsonShape,
  count = 12,
): string[] =>
  [...shape.values.entries()]
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )
    .slice(0, count)
    .map(([value]) => value);

/** What a position held, e.g. `text`, `object`, `list of object`, `number or object`; `always empty` for nothing but nulls */
export const describeCubeJsonShape = (shape: CubeJsonShape): string => {
  const parts: string[] = [];
  const scalar = getCubeJsonScalarType(shape);
  if (scalar) {
    parts.push(CUBE_JSON_KIND_LABEL[scalar]);
  }
  if (shape.objects > 0) {
    parts.push('object');
  }
  if (shape.arrays > 0) {
    const { element } = shape;
    parts.push(
      `list of ${!element || element.present === element.nulls ? 'nothing' : describeCubeJsonShape(element)}`,
    );
  }
  return parts.length ? parts.join(' or ') : 'always empty';
};
