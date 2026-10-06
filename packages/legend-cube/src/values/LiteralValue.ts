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

import type { CubeType } from '../types/CubeType.js';
import { TypeFamily } from '../types/TypeFamily.js';
import { assertUnreachable } from '../utils/AssertionUtils.js';

/**
 * A typed literal value, such as a filter value. Numbers are kept as text in
 * the JSON number grammar (e.g. `-0.5`, `1e3`), so large integers and decimals
 * never lose precision; dates are ISO text.
 *
 * - `integer`: canonical digits, e.g. `-42`; may exceed JavaScript's safe integers
 * - `strictDate`: `YYYY-MM-DD`
 * - `dateTime`: `YYYY-MM-DDTHH:MM:SS`, optionally with 1 to 9 fraction digits;
 *   seconds are required, because the engine truncates hour and minute
 *   literals to the day
 * - `enum`: the unqualified value
 */
export type LiteralValue =
  | { readonly kind: 'string'; readonly value: string }
  | { readonly kind: 'boolean'; readonly value: boolean }
  | { readonly kind: 'integer'; readonly value: string }
  | { readonly kind: 'float'; readonly value: string }
  | { readonly kind: 'decimal'; readonly value: string }
  | { readonly kind: 'strictDate'; readonly value: string }
  | { readonly kind: 'dateTime'; readonly value: string }
  | { readonly kind: 'enum'; readonly value: string };

export type LiteralKind = LiteralValue['kind'];

/** Text that is not a value of the expected type, kept so it can be shown and fixed */
export interface InvalidValue {
  readonly kind: 'invalid';
  readonly text: string;
}

/** What value entry produces: a literal, invalid text, or nothing when the input is empty */
export type EnteredValue = LiteralValue | InvalidValue | undefined;

/**
 * The kinds of literal a type takes. The abstract `Number` takes decimals; the
 * abstract `Date` takes a date or a date-time. StrictTime, Variant and opaque
 * types take none.
 */
export const getLiteralKinds = (type: CubeType): readonly LiteralKind[] => {
  switch (type.family) {
    case TypeFamily.BOOLEAN:
      return ['boolean'];
    case TypeFamily.STRING:
      return ['string'];
    case TypeFamily.INTEGER:
      return ['integer'];
    case TypeFamily.FLOAT:
      return ['float'];
    case TypeFamily.DECIMAL:
    case TypeFamily.NUMBER:
      return ['decimal'];
    case TypeFamily.STRICT_DATE:
      return ['strictDate'];
    case TypeFamily.DATETIME:
      return ['dateTime'];
    case TypeFamily.DATE:
      return ['strictDate', 'dateTime'];
    case TypeFamily.ENUM:
      return ['enum'];
    case TypeFamily.STRICT_TIME:
    case TypeFamily.VARIANT:
    case TypeFamily.OPAQUE:
      return [];
    default:
      return assertUnreachable(type.family);
  }
};

/** The text form of a literal, as typed and shown */
export const getLiteralText = (literal: LiteralValue): string =>
  literal.kind === 'boolean' ? String(literal.value) : literal.value;
