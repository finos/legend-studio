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

import { type CubeType, EnumType, PrimitiveType } from './CubeType.js';
import { TypeFamily } from './TypeFamily.js';
import { assertUnreachable } from '../utils/AssertionUtils.js';

/**
 * Types in the same comparison class can be compared with each other, e.g. as
 * join keys. Precise widths and parameters don't matter: `SmallInt` compares
 * with `Double`, and `Varchar(5)` with `Varchar(40)`.
 */
export enum ComparisonClass {
  NUMERIC = 'NUMERIC',
  STRING = 'STRING',
  BOOLEAN = 'BOOLEAN',
  STRICT_DATE = 'STRICT_DATE',
  DATETIME = 'DATETIME',
  /** the abstract `Date`, which compares with both STRICT_DATE and DATETIME */
  DATE = 'DATE',
  STRICT_TIME = 'STRICT_TIME',
  /** enumerations compare only with the same enumeration */
  ENUM = 'ENUM',
}

/** The comparison class of a type, or `undefined` for types that are never compared (VARIANT, OPAQUE) */
export const getComparisonClass = (
  type: CubeType,
): ComparisonClass | undefined => {
  switch (type.family) {
    case TypeFamily.INTEGER:
    case TypeFamily.FLOAT:
    case TypeFamily.DECIMAL:
    case TypeFamily.NUMBER:
      return ComparisonClass.NUMERIC;
    case TypeFamily.STRING:
      return ComparisonClass.STRING;
    case TypeFamily.BOOLEAN:
      return ComparisonClass.BOOLEAN;
    case TypeFamily.STRICT_DATE:
      return ComparisonClass.STRICT_DATE;
    case TypeFamily.DATETIME:
      return ComparisonClass.DATETIME;
    case TypeFamily.DATE:
      return ComparisonClass.DATE;
    case TypeFamily.STRICT_TIME:
      return ComparisonClass.STRICT_TIME;
    case TypeFamily.ENUM:
      return ComparisonClass.ENUM;
    case TypeFamily.VARIANT:
    case TypeFamily.OPAQUE:
      return undefined;
    default:
      return assertUnreachable(type.family);
  }
};

/**
 * Whether two types can be compared, e.g. as a pair of join keys: they must be
 * in the same comparison class, where the abstract `Date` also compares with
 * `StrictDate` and `DateTime`.
 *
 * NOTE: `StrictDate` and `Timestamp` are not compatible. The engine runs such a
 * comparison, but it only ever matches timestamps at midnight. The engine
 * compiles `==` between any two types, so this check can't be left to it.
 */
export const areCompatibleTypes = (a: CubeType, b: CubeType): boolean => {
  const classA = getComparisonClass(a);
  const classB = getComparisonClass(b);
  if (classA === undefined || classB === undefined) {
    return false;
  }
  if (classA === ComparisonClass.ENUM || classB === ComparisonClass.ENUM) {
    return a instanceof EnumType && a.equals(b);
  }
  if (classA === ComparisonClass.DATE || classB === ComparisonClass.DATE) {
    const isDateClass = (c: ComparisonClass): boolean =>
      c === ComparisonClass.DATE ||
      c === ComparisonClass.STRICT_DATE ||
      c === ComparisonClass.DATETIME;
    return isDateClass(classA) && isDateClass(classB);
  }
  return classA === classB;
};

const getAncestors = (type: PrimitiveType): PrimitiveType[] => {
  const ancestors: PrimitiveType[] = [];
  for (
    let current: PrimitiveType | undefined = type;
    current;
    current = current.parent
  ) {
    ancestors.push(current);
  }
  return ancestors;
};

/**
 * The most specific type that both types are, or `undefined` if there is none:
 * e.g. `String` for `Varchar(15)` and `Varchar(2)`, `Integer` for `Int` and
 * `SmallInt`, `Number` for `SmallInt` and `Double`. A type is its own ancestor.
 */
export const getLeastCommonAncestor = (
  a: CubeType,
  b: CubeType,
): CubeType | undefined => {
  if (a.equals(b)) {
    return a;
  }
  if (!(a instanceof PrimitiveType) || !(b instanceof PrimitiveType)) {
    return undefined;
  }
  const ancestorsOfB = new Set(getAncestors(b));
  return getAncestors(a).find((ancestor) => ancestorsOfB.has(ancestor));
};
