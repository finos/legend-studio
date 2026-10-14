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
  type JsonObject,
  type JsonValue,
  stableJsonText,
} from '../../utils/Json.js';
import type { LiteralValue } from '../../values/LiteralValue.js';
import type { IR } from '../CubeIR.js';
import { JOIN_KIND_PATH } from '../emitters/JoinEmitter.js';

// How Cube tells whether two lambdas are the same Pure (Import Pure, PLAN
// §11.18): a lambda it reads, often through the engine's grammar, and the one
// it writes again from the steps it read. They can differ in ways that don't
// change the query: the names of bound variables and lets, how a number is
// written, a sort key alone or in a list of one, an enumeration's short path,
// and where Cube stamps its origins.

/** The protocol package of the engine's own functions, which Cube writes by their short names */
const FUNCTIONS_PACKAGE = 'meta::pure::functions::';

/** Enumerations Cube writes by their full path, which Pure text often names short */
const ENUMERATION_PATHS: ReadonlyMap<string, string> = new Map([
  ['JoinKind', JOIN_KIND_PATH],
]);

export interface CubeIRComparisonOptions {
  /**
   * The IR an expression's JSON reads to (`lambdaJson`, an Extend column's or
   * a Filter by Expression's), so it compares with the same expression read
   * from a lambda. Without it, two expressions compare as JSON.
   */
  readonly readExpression?: ((json: JsonObject) => IR) | undefined;
}

/** A number's text, the same for every way of writing one value: `1.50`, `1.5` and `15e-1` give `15e-1` */
export const getCanonicalNumberText = (text: string): string => {
  const match =
    /^(?<sign>[+-]?)(?<whole>\d*)(?:\.(?<fraction>\d*))?(?:[eE](?<exponent>[+-]?\d+))?$/u.exec(
      text.trim(),
    );
  if (!match) {
    return text;
  }
  const {
    sign = '',
    whole = '',
    fraction = '',
    exponent = '0',
  } = match.groups ?? {};
  let digits = `${whole}${fraction}`.replace(/^0+/u, '');
  if (!digits) {
    return '0';
  }
  let power = Number(exponent) - fraction.length;
  const trailing = /0+$/u.exec(digits)?.[0].length ?? 0;
  digits = digits.slice(0, digits.length - trailing);
  power += trailing;
  return `${sign === '-' ? '-' : ''}${digits}${power ? `e${power}` : ''}`;
};

const isNumberKind = (kind: LiteralValue['kind']): boolean =>
  kind === 'integer' || kind === 'float' || kind === 'decimal';

const sameLiteral = (a: LiteralValue, b: LiteralValue): boolean => {
  if (a.kind !== b.kind) {
    return false;
  }
  if (isNumberKind(a.kind)) {
    return (
      getCanonicalNumberText(String(a.value)) ===
      getCanonicalNumberText(String(b.value))
    );
  }
  return a.value === b.value;
};

/** A function's name as Cube writes it: the engine's own functions by their short name */
export const getCubeFunctionName = (name: string): string =>
  name.startsWith(FUNCTIONS_PACKAGE) ? (name.split('::').at(-1) ?? name) : name;

const enumerationPath = (path: string): string =>
  ENUMERATION_PATHS.get(path) ?? path;

/** JSON without the source information the engine or Cube adds, for comparing expressions as JSON */
const withoutSourceInformation = (json: JsonValue): JsonValue =>
  Array.isArray(json)
    ? json.map(withoutSourceInformation)
    : json !== null && typeof json === 'object'
      ? Object.fromEntries(
          Object.entries(json)
            .filter(([key]) => key !== 'sourceInformation')
            .map(([key, value]) => [key, withoutSourceInformation(value)]),
        )
      : json;

/**
 * The IR as it is compared: an expression's JSON read to IR when the options
 * can, a sort's one key out of its list
 */
const canonical = (ir: IR, options: CubeIRComparisonOptions): IR => {
  if (ir.k === 'lambdaJson' && options.readExpression) {
    return canonical(options.readExpression(ir.json), options);
  }
  if (ir.k === 'func' && getCubeFunctionName(ir.name) === 'sort') {
    const [input, keys] = ir.params;
    if (
      input !== undefined &&
      keys?.k === 'collection' &&
      keys.values.length === 1 &&
      keys.values[0] !== undefined
    ) {
      return { ...ir, params: [input, keys.values[0]] };
    }
  }
  return ir;
};

/** Bound names, a's to b's: lambda parameters and lets */
type Bindings = ReadonlyMap<string, string>;

const sameList = (
  a: readonly IR[],
  b: readonly IR[],
  bindings: Bindings,
  options: CubeIRComparisonOptions,
): boolean =>
  a.length === b.length &&
  a.every((item, index) => same(item, b[index] as IR, bindings, options));

/** A lambda's statements: each let binds its name for the statements after it */
const sameStatements = (
  a: readonly IR[],
  b: readonly IR[],
  bindings: Bindings,
  options: CubeIRComparisonOptions,
): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  let bound = new Map(bindings);
  for (let index = 0; index < a.length; index += 1) {
    const left = canonical(a[index] as IR, options);
    const right = canonical(b[index] as IR, options);
    if (left.k === 'let' && right.k === 'let') {
      if (!same(left.value, right.value, bound, options)) {
        return false;
      }
      bound = new Map(bound).set(left.name, right.name);
    } else if (!same(left, right, bound, options)) {
      return false;
    }
  }
  return true;
};

function same(
  first: IR,
  second: IR,
  bindings: Bindings,
  options: CubeIRComparisonOptions,
): boolean {
  const a = canonical(first, options);
  const b = canonical(second, options);
  switch (a.k) {
    case 'func':
      return (
        b.k === 'func' &&
        getCubeFunctionName(a.name) === getCubeFunctionName(b.name) &&
        sameList(a.params, b.params, bindings, options)
      );
    case 'property':
      return (
        b.k === 'property' &&
        a.name === b.name &&
        same(a.receiver, b.receiver, bindings, options)
      );
    case 'var':
      // a bound variable is its counterpart; a free one is itself, on both sides
      return (
        b.k === 'var' &&
        (bindings.has(a.name)
          ? bindings.get(a.name) === b.name
          : ![...bindings.values()].includes(b.name) && a.name === b.name)
      );
    case 'lambda': {
      if (b.k !== 'lambda' || a.params.length !== b.params.length) {
        return false;
      }
      const bound = new Map(bindings);
      a.params.forEach((name, index) =>
        bound.set(name, b.params[index] as string),
      );
      return sameStatements(a.body, b.body, bound, options);
    }
    case 'literal':
      return b.k === 'literal' && sameLiteral(a.value, b.value);
    case 'collection':
      return (
        b.k === 'collection' && sameList(a.values, b.values, bindings, options)
      );
    case 'colSpec':
      return (
        b.k === 'colSpec' &&
        a.name === b.name &&
        (a.fn1 === undefined
          ? b.fn1 === undefined
          : b.fn1 !== undefined && same(a.fn1, b.fn1, bindings, options)) &&
        (a.fn2 === undefined
          ? b.fn2 === undefined
          : b.fn2 !== undefined && same(a.fn2, b.fn2, bindings, options))
      );
    case 'colSpecArray':
      return (
        b.k === 'colSpecArray' && sameList(a.specs, b.specs, bindings, options)
      );
    case 'storeAccessor':
    case 'dataProductAccessor':
    case 'ingestAccessor':
      return (
        b.k === a.k &&
        a.path.length === b.path.length &&
        a.path.every((part, index) => part === b.path[index])
      );
    case 'elementPtr':
      return b.k === 'elementPtr' && a.path === b.path;
    case 'genericType':
      return (
        b.k === 'genericType' &&
        a.path === b.path &&
        (a.params ?? []).join() === (b.params ?? []).join()
      );
    case 'relationType':
      return (
        b.k === 'relationType' &&
        a.columns.length === b.columns.length &&
        a.columns.every((column, index) => {
          const other = b.columns[index];
          return (
            other !== undefined &&
            column.name === other.name &&
            column.nullable === other.nullable &&
            same(column.type, other.type, bindings, options)
          );
        })
      );
    case 'enumValue':
      return (
        b.k === 'enumValue' &&
        enumerationPath(a.enumPath) === enumerationPath(b.enumPath) &&
        a.value === b.value
      );
    case 'let':
      // a let outside a lambda's statements: its value, its name as bound
      return (
        b.k === 'let' &&
        (bindings.get(a.name) ?? a.name) === b.name &&
        same(a.value, b.value, bindings, options)
      );
    case 'raw':
      return (
        b.k === 'raw' &&
        stableJsonText(withoutSourceInformation(a.json as JsonValue)) ===
          stableJsonText(withoutSourceInformation(b.json as JsonValue))
      );
    case 'lambdaJson':
      return (
        b.k === 'lambdaJson' &&
        stableJsonText(withoutSourceInformation(a.json)) ===
          stableJsonText(withoutSourceInformation(b.json))
      );
    default:
      return false;
  }
}

/**
 * Whether the two IR expressions are the same Pure: origins aside, number
 * literals by value, bound variables and lets by position (`{x | $x.a}` is
 * `{row | $row.a}`), an expression's JSON as the IR it reads to, a sort's one
 * key alone or in a list, an enumeration's short path as its full one, and
 * the engine's own functions by their short names.
 */
export const isSameCubeIR = (
  a: IR,
  b: IR,
  options: CubeIRComparisonOptions = {},
): boolean => same(a, b, new Map(), options);
