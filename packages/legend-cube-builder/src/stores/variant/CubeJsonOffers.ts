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

import { foldColumnName } from '@finos/legend-cube';
import { columnAccessOf, pureStringLiteral } from '../CubePureText.js';
import {
  CUBE_JSON_PURE_TYPE,
  CubeJsonScalarKind,
  type CubeJsonSample,
  type CubeJsonShape,
  describeCubeJsonShape,
  getCubeJsonScalarType,
  getCubeJsonTopValues,
  isCubeJsonScalarShape,
} from './CubeJsonShape.js';

// The fields of a Variant column's documents, and the columns each can become
// (PLAN §11.20), after legend-lite's Data Cube: picking one writes the Pure
// text of an Extend column, which the engine parses and types like any typed
// there. Only forms run on legend-engine are offered: `contains` goes through
// `toMany(@Variant)->map(…to(@T))`, since `toMany(@String)->contains` writes
// invalid SQL on DuckDB; no `exists` (an engine error); no tuple explode
// (`toVariant(newMap(…))`, nested maps excluded on Snowflake and DuckDB).

/** The Variant type, as an expression names it */
const VARIANT = 'Variant';

/** How many of an array's top values get a "contains" offer */
const CONTAINS_OFFERS = 8;

/** One column a field can become */
export interface CubeJsonOffer {
  /** Unique among the field's offers, e.g. `value`, `count`, `contains:FR` */
  readonly key: string;
  /** What the dialog shows, e.g. `the value, as Integer` */
  readonly label: string;
  /** The column's default name, e.g. `payload_user_tier` */
  readonly name: string;
  /** The Pure type it should take, `Variant` for JSON: a suggestion, the engine types the column */
  readonly type: string;
  /** An Extend column's text, `x | …`; `undefined` for an explode */
  readonly code: string | undefined;
  /** One row per element of the array at this path: an Explode Array node */
  readonly explode?:
    | { readonly column: string; readonly path: readonly string[] }
    | undefined;
}

/** A position in the documents, and what it can become */
export interface CubeJsonField {
  /** The keys from the column to it; empty for the column itself */
  readonly path: readonly string[];
  /** What it held, e.g. `text`, `list of object` */
  readonly description: string;
  /** Its share, 0 to 1, of the places it could be: the rows read, or its object's occurrences */
  readonly presence: number;
  /** Its most frequent values, for a scalar */
  readonly topValues: readonly string[];
  readonly offers: readonly CubeJsonOffer[];
  readonly children: readonly CubeJsonField[];
}

/** A column name from parts: joined by `_`, letters, digits and `_` only */
const nameOf = (parts: readonly string[]): string =>
  parts
    .join('_')
    .replace(/[^A-Za-z0-9_]+/gu, '_')
    .replace(/_+/gu, '_')
    .replace(/^_|_$/gu, '') || 'value';

/** The default name of an array's element, as Explode Array makes it: its last key's, or its column's, then `_element` */
export const getCubeJsonElementName = (
  column: string,
  path: readonly string[],
): string => nameOf([path[path.length - 1] ?? column, 'element']);

/** `$x.c->get('a')->get('b')` */
const pathOf = (column: string, path: readonly string[]): string =>
  path.reduce(
    (expression, key) => `${expression}->get(${pureStringLiteral(key)})`,
    columnAccessOf(column),
  );

/** A function of the row */
const ofRow = (body: string): string => `x | ${body}`;

/**
 * A seen value as a Pure literal of the kind it is read as: a number in a
 * Float list with a point (`2.0`); `undefined` for a number Pure can't write
 * as a literal (an exponent)
 */
const literalOf = (
  kind: CubeJsonScalarKind,
  text: string,
): string | undefined =>
  kind === CubeJsonScalarKind.INTEGER || kind === CubeJsonScalarKind.FLOAT
    ? !/^-?\d+(?:\.\d+)?$/u.test(text)
      ? undefined
      : kind === CubeJsonScalarKind.FLOAT && !text.includes('.')
        ? `${text}.0`
        : text
    : kind === CubeJsonScalarKind.BOOLEAN
      ? String(text === 'true')
      : pureStringLiteral(text);

/** The kinds "contains" compares as typed literals: text, numbers and booleans */
const COMPARABLE_KINDS = new Set([
  CubeJsonScalarKind.TEXT,
  CubeJsonScalarKind.INTEGER,
  CubeJsonScalarKind.FLOAT,
  CubeJsonScalarKind.BOOLEAN,
]);

const arrayOffers = (
  column: string,
  path: readonly string[],
  shape: CubeJsonShape,
): CubeJsonOffer[] => {
  const array = pathOf(column, path);
  const names = [column, ...path];
  const many = `${array}->toMany(@${VARIANT})`;
  const offers: CubeJsonOffer[] = [
    {
      key: 'explode',
      label: 'one row per element',
      name: getCubeJsonElementName(column, path),
      type: VARIANT,
      code: undefined,
      explode: { column, path },
    },
    {
      key: 'count',
      label: 'number of elements',
      name: nameOf([...names, 'count']),
      type: 'Integer',
      code: ofRow(`${many}->size()`),
    },
  ];
  const { element } = shape;
  if (!element) {
    return offers;
  }
  const elementKind = getCubeJsonScalarType(element);
  if (elementKind && isCubeJsonScalarShape(element)) {
    offers.push({
      key: 'list',
      label: 'all values, as text',
      name: nameOf([...names, 'list']),
      type: 'String',
      code: ofRow(`${many}->map(e | $e->to(@String))->joinStrings(', ')`),
    });
    if (COMPARABLE_KINDS.has(elementKind)) {
      const type = CUBE_JSON_PURE_TYPE[elementKind];
      getCubeJsonTopValues(element, CONTAINS_OFFERS).forEach((value) => {
        const literal = literalOf(elementKind, value);
        if (literal !== undefined) {
          offers.push({
            key: `contains:${value}`,
            label: `contains ${value}`,
            name: nameOf([...names, 'has', value]),
            type: 'Boolean',
            code: ofRow(
              `${many}->map(e | $e->to(@${type}))->contains(${literal})`,
            ),
          });
        }
      });
    }
  }
  if (element.objects > 0) {
    offers.push({
      key: 'first',
      label: 'first element, as JSON',
      name: nameOf([...names, 'first']),
      type: VARIANT,
      code: ofRow(`${array}->get(0)`),
    });
    [...element.fields.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .forEach(([key, field]) => {
        const kind = getCubeJsonScalarType(field);
        if (!kind || !isCubeJsonScalarShape(field)) {
          return;
        }
        const type = CUBE_JSON_PURE_TYPE[kind];
        offers.push({
          key: `first:${key}`,
          label: `first element's ${key}`,
          name: nameOf([...names, 'first', key]),
          type,
          code: ofRow(
            `${array}->get(0)->get(${pureStringLiteral(key)})->to(@${type})`,
          ),
        });
        if (
          kind === CubeJsonScalarKind.INTEGER ||
          kind === CubeJsonScalarKind.FLOAT
        ) {
          offers.push({
            key: `total:${key}`,
            label: `total of ${key}`,
            name: nameOf([...names, key, 'total']),
            type,
            code: ofRow(
              `${many}->map(e | $e->get(${pureStringLiteral(key)})->to(@${type}))->sum()`,
            ),
          });
        }
      });
  }
  return offers;
};

const offersOf = (
  column: string,
  path: readonly string[],
  shape: CubeJsonShape,
): CubeJsonOffer[] => {
  const names = [column, ...path];
  const offers: CubeJsonOffer[] = [];
  const kind = getCubeJsonScalarType(shape);
  if (kind && isCubeJsonScalarShape(shape)) {
    const type = CUBE_JSON_PURE_TYPE[kind];
    offers.push({
      key: 'value',
      label: `the value, as ${type}`,
      name: nameOf(path.length ? names : [...names, 'value']),
      type,
      code: ofRow(`${pathOf(column, path)}->to(@${type})`),
    });
  }
  // a nested object or array, as a Variant column of its own, to explore again
  if (path.length > 0 && (shape.objects > 0 || shape.arrays > 0)) {
    offers.push({
      key: 'json',
      label: 'as JSON',
      name: nameOf(names),
      type: VARIANT,
      code: ofRow(pathOf(column, path)),
    });
  }
  if (shape.objects > 0) {
    offers.push({
      key: 'keys',
      label: 'its keys, as text',
      name: nameOf([...names, 'keys']),
      type: 'String',
      code: ofRow(
        `${pathOf(column, path)}->to(@Map<String, ${VARIANT}>)->toOne()->keys()->joinStrings(', ')`,
      ),
    });
  }
  if (shape.arrays > 0) {
    offers.push(...arrayOffers(column, path, shape));
  }
  return offers;
};

/**
 * A column's fields, from a sample of its documents: the column itself, its
 * object's fields, theirs, and so on, each with what it held, how often it was
 * there and what it can become. An array's elements' fields are reached
 * through the array's offers (first element's, total of), not as fields.
 */
export const getCubeJsonFields = (
  column: string,
  sample: CubeJsonSample,
): CubeJsonField => {
  const build = (
    shape: CubeJsonShape,
    path: readonly string[],
    places: number,
  ): CubeJsonField => ({
    path,
    description: describeCubeJsonShape(shape),
    presence: Math.min(1, (shape.present - shape.nulls) / Math.max(1, places)),
    topValues: isCubeJsonScalarShape(shape) ? getCubeJsonTopValues(shape) : [],
    offers: offersOf(column, path, shape),
    children:
      shape.objects > 0
        ? [...shape.fields.entries()]
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, field]) => build(field, [...path, key], shape.objects))
        : [],
  });
  return build(sample.shape, [], sample.rows);
};

/** A name no taken column has, compared folded: `name`, else `name_2`, `name_3`, … */
export const getFreeCubeColumnName = (
  name: string,
  taken: readonly string[],
): string => {
  const folded = new Set(taken.map(foldColumnName));
  if (!folded.has(foldColumnName(name))) {
    return name;
  }
  let index = 2;
  while (folded.has(foldColumnName(`${name}_${index}`))) {
    index += 1;
  }
  return `${name}_${index}`;
};
