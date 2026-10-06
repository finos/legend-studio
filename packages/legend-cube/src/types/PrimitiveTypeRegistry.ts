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

import { TypeFamily } from './TypeFamily.js';

/**
 * The full paths of the primitive types Cube knows: Pure's primitives and the
 * engine's precise primitives (`meta::pure::precisePrimitives`). There is no
 * precise `Date`, `Time` or `Decimal`.
 */
export enum PRIMITIVE_TYPE_PATH {
  BOOLEAN = 'Boolean',
  STRING = 'String',
  VARCHAR = 'meta::pure::precisePrimitives::Varchar',
  NUMBER = 'Number',
  INTEGER = 'Integer',
  TINY_INT = 'meta::pure::precisePrimitives::TinyInt',
  U_TINY_INT = 'meta::pure::precisePrimitives::UTinyInt',
  SMALL_INT = 'meta::pure::precisePrimitives::SmallInt',
  U_SMALL_INT = 'meta::pure::precisePrimitives::USmallInt',
  INT = 'meta::pure::precisePrimitives::Int',
  U_INT = 'meta::pure::precisePrimitives::UInt',
  BIG_INT = 'meta::pure::precisePrimitives::BigInt',
  U_BIG_INT = 'meta::pure::precisePrimitives::UBigInt',
  FLOAT = 'Float',
  FLOAT4 = 'meta::pure::precisePrimitives::Float4',
  DOUBLE = 'meta::pure::precisePrimitives::Double',
  DECIMAL = 'Decimal',
  NUMERIC = 'meta::pure::precisePrimitives::Numeric',
  DATE = 'Date',
  STRICT_DATE = 'StrictDate',
  DATE_TIME = 'DateTime',
  TIMESTAMP = 'meta::pure::precisePrimitives::Timestamp',
  STRICT_TIME = 'StrictTime',
  VARIANT = 'meta::pure::metamodel::variant::Variant',
}

/** An inclusive range of integers */
export interface IntegerRange {
  readonly min: bigint;
  readonly max: bigint;
}

export interface PrimitiveTypeInfo {
  readonly path: PRIMITIVE_TYPE_PATH;
  /** the last segment of the path, e.g. `Varchar` */
  readonly shortName: string;
  readonly family: TypeFamily;
  readonly parentPath: PRIMITIVE_TYPE_PATH | undefined;
  /** the number of type parameters, e.g. 1 for `Varchar(n)` and 2 for `Numeric(p,s)` */
  readonly arity: number;
  /** the values an integer literal may take, for the INTEGER family */
  readonly integerRange: IntegerRange | undefined;
}

const signedRange = (bits: bigint): IntegerRange => ({
  min: -(2n ** (bits - 1n)),
  max: 2n ** (bits - 1n) - 1n,
});

const unsignedRange = (bits: bigint): IntegerRange => ({
  min: 0n,
  max: 2n ** bits - 1n,
});

/**
 * The engine reads integer literals as Java longs, and a literal one past this
 * range silently wraps, so `Integer` and the 64-bit types are capped to it.
 */
const JAVA_LONG_RANGE = signedRange(64n);

const createInfo = (
  path: PRIMITIVE_TYPE_PATH,
  family: TypeFamily,
  parentPath: PRIMITIVE_TYPE_PATH | undefined,
  options: { arity?: number; integerRange?: IntegerRange } = {},
): PrimitiveTypeInfo => ({
  path,
  shortName: path.slice(path.lastIndexOf(':') + 1),
  family,
  parentPath,
  arity: options.arity ?? 0,
  integerRange: options.integerRange,
});

export const PRIMITIVE_TYPE_INFOS: readonly PrimitiveTypeInfo[] = [
  createInfo(PRIMITIVE_TYPE_PATH.BOOLEAN, TypeFamily.BOOLEAN, undefined),
  createInfo(PRIMITIVE_TYPE_PATH.STRING, TypeFamily.STRING, undefined),
  createInfo(
    PRIMITIVE_TYPE_PATH.VARCHAR,
    TypeFamily.STRING,
    PRIMITIVE_TYPE_PATH.STRING,
    { arity: 1 },
  ),
  createInfo(PRIMITIVE_TYPE_PATH.NUMBER, TypeFamily.NUMBER, undefined),
  createInfo(
    PRIMITIVE_TYPE_PATH.INTEGER,
    TypeFamily.INTEGER,
    PRIMITIVE_TYPE_PATH.NUMBER,
    { integerRange: JAVA_LONG_RANGE },
  ),
  createInfo(
    PRIMITIVE_TYPE_PATH.TINY_INT,
    TypeFamily.INTEGER,
    PRIMITIVE_TYPE_PATH.INTEGER,
    { integerRange: signedRange(8n) },
  ),
  createInfo(
    PRIMITIVE_TYPE_PATH.U_TINY_INT,
    TypeFamily.INTEGER,
    PRIMITIVE_TYPE_PATH.INTEGER,
    { integerRange: unsignedRange(8n) },
  ),
  createInfo(
    PRIMITIVE_TYPE_PATH.SMALL_INT,
    TypeFamily.INTEGER,
    PRIMITIVE_TYPE_PATH.INTEGER,
    { integerRange: signedRange(16n) },
  ),
  createInfo(
    PRIMITIVE_TYPE_PATH.U_SMALL_INT,
    TypeFamily.INTEGER,
    PRIMITIVE_TYPE_PATH.INTEGER,
    { integerRange: unsignedRange(16n) },
  ),
  createInfo(
    PRIMITIVE_TYPE_PATH.INT,
    TypeFamily.INTEGER,
    PRIMITIVE_TYPE_PATH.INTEGER,
    { integerRange: signedRange(32n) },
  ),
  createInfo(
    PRIMITIVE_TYPE_PATH.U_INT,
    TypeFamily.INTEGER,
    PRIMITIVE_TYPE_PATH.INTEGER,
    { integerRange: unsignedRange(32n) },
  ),
  createInfo(
    PRIMITIVE_TYPE_PATH.BIG_INT,
    TypeFamily.INTEGER,
    PRIMITIVE_TYPE_PATH.INTEGER,
    { integerRange: JAVA_LONG_RANGE },
  ),
  createInfo(
    PRIMITIVE_TYPE_PATH.U_BIG_INT,
    TypeFamily.INTEGER,
    PRIMITIVE_TYPE_PATH.INTEGER,
    // values above the Java long range can't be written as literals
    { integerRange: { min: 0n, max: JAVA_LONG_RANGE.max } },
  ),
  createInfo(
    PRIMITIVE_TYPE_PATH.FLOAT,
    TypeFamily.FLOAT,
    PRIMITIVE_TYPE_PATH.NUMBER,
  ),
  createInfo(
    PRIMITIVE_TYPE_PATH.FLOAT4,
    TypeFamily.FLOAT,
    PRIMITIVE_TYPE_PATH.FLOAT,
  ),
  createInfo(
    PRIMITIVE_TYPE_PATH.DOUBLE,
    TypeFamily.FLOAT,
    PRIMITIVE_TYPE_PATH.FLOAT,
  ),
  createInfo(
    PRIMITIVE_TYPE_PATH.DECIMAL,
    TypeFamily.DECIMAL,
    PRIMITIVE_TYPE_PATH.NUMBER,
  ),
  createInfo(
    PRIMITIVE_TYPE_PATH.NUMERIC,
    TypeFamily.DECIMAL,
    PRIMITIVE_TYPE_PATH.DECIMAL,
    { arity: 2 },
  ),
  createInfo(PRIMITIVE_TYPE_PATH.DATE, TypeFamily.DATE, undefined),
  createInfo(
    PRIMITIVE_TYPE_PATH.STRICT_DATE,
    TypeFamily.STRICT_DATE,
    PRIMITIVE_TYPE_PATH.DATE,
  ),
  createInfo(
    PRIMITIVE_TYPE_PATH.DATE_TIME,
    TypeFamily.DATETIME,
    PRIMITIVE_TYPE_PATH.DATE,
  ),
  createInfo(
    PRIMITIVE_TYPE_PATH.TIMESTAMP,
    TypeFamily.DATETIME,
    PRIMITIVE_TYPE_PATH.DATE_TIME,
  ),
  createInfo(
    PRIMITIVE_TYPE_PATH.STRICT_TIME,
    TypeFamily.STRICT_TIME,
    undefined,
  ),
  createInfo(PRIMITIVE_TYPE_PATH.VARIANT, TypeFamily.VARIANT, undefined),
];

const INFO_BY_PATH = new Map<string, PrimitiveTypeInfo>(
  PRIMITIVE_TYPE_INFOS.map((info) => [info.path, info]),
);

const INFO_BY_SHORT_NAME = new Map<string, PrimitiveTypeInfo>(
  PRIMITIVE_TYPE_INFOS.map((info) => [info.shortName, info]),
);

/**
 * Finds a primitive by its full path or by its short name. Short names are
 * accepted because the engine sometimes shortens paths, e.g. `Varchar` for
 * `meta::pure::precisePrimitives::Varchar`.
 */
export const findPrimitiveTypeInfo = (
  pathOrShortName: string,
): PrimitiveTypeInfo | undefined =>
  INFO_BY_PATH.get(pathOrShortName) ?? INFO_BY_SHORT_NAME.get(pathOrShortName);
