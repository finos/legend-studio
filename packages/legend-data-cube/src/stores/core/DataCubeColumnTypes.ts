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
  CORE_PURE_PATH,
  ELEMENT_PATH_DELIMITER,
  PRECISE_PRIMITIVE_TYPE,
  PRIMITIVE_TYPE,
  extractElementNameFromPath,
} from '@finos/legend-graph';

/**
 * Column types in DataCube are kept exactly as reported by the engine, including
 * precise primitives (e.g. `meta::pure::precisePrimitives::Varchar` with type
 * variable values `[200]`). Rather than rewriting them into their base primitive,
 * code should ask this registry what a type can do (is it numeric? an integer?
 * which literal type should be used for its values?).
 *
 * See https://github.com/finos/legend-pure/blob/master/legend-pure-core/legend-pure-m3-precisePrimitives/src/main/resources/platform_precise_primitives/precisePrimitives.pure
 */

export enum DataCubeColumnDataType {
  NUMBER = 'Numeric',
  TEXT = 'Text',
  DATE = 'Date',
  TIME = 'Time',
  BOOLEAN = 'Boolean',
  VARIANT = 'Variant',
  /**
   * Types DataCube can display and group by, but has no way to filter or aggregate,
   * e.g. `StrictTime` (a time of day, which is neither a date nor a date-time) and `Byte`
   */
  OTHER = 'Other',
}

// NOTE: this number is as per legend-engine and must be kept in sync with it, used when the size of a `Varchar` column is unknown
// https://github.com/finos/legend-engine/blob/master/legend-engine-xts-relationalStore/legend-engine-xt-relationalStore-execution/legend-engine-xt-relationalStore-executionPlan/src/main/java/org/finos/legend/engine/plan/execution/stores/relational/exploration/SchemaExportation.java#L105
export const DEFAULT_VARCHAR_SIZE = 16777216;

// NOTE: the relational datatype path which some code paths (e.g. Lakehouse milestoning
// columns) used to report for timestamp columns; kept so persisted data still resolves
const LEGACY_RELATIONAL_TIMESTAMP_TYPE =
  'meta::relational::metamodel::datatype::Timestamp';

export type DataCubeColumnTypeInfo = {
  path: string;
  /**
   * The core primitive this type extends. Pure literals (e.g. `CInteger`, `CString`)
   * have no precise form, so values of a column are always built with this type.
   */
  baseType: string;
  dataType: DataCubeColumnDataType;
  /**
   * Whether values of this type can be expressed as primitive literals
   * (e.g. in filter conditions)
   */
  isPrimitive: boolean;
  isInteger: boolean;
  /**
   * Whether this is a precise primitive the engine reports, e.g. `Varchar`, `Int`.
   * NOTE: some members of `PRECISE_PRIMITIVE_TYPE` (e.g. `DECIMAL`, `STRICTDATE`,
   * `STRICTTIME`, `TIMESTAMP`) do not correspond to any precise primitive the engine
   * reports, so they are not registered as precise.
   */
  isPrecise: boolean;
  /**
   * The number of type variable values the type takes, e.g. `Varchar(x)` takes
   * the max length, `Numeric(precision, scale)` takes precision and scale
   */
  typeVariableCount: number;
  /**
   * The value range of integer types, as per their constraints.
   * NOTE: unsigned types only constrain the upper bound in Pure, but they are
   * meant to hold non-negative values only.
   */
  range?: [bigint, bigint] | undefined;
};

const _info = (
  path: string,
  baseType: string,
  dataType: DataCubeColumnDataType,
  options?: {
    isPrimitive?: boolean;
    isInteger?: boolean;
    isPrecise?: boolean;
    typeVariableCount?: number;
    range?: [bigint, bigint];
  },
): DataCubeColumnTypeInfo => ({
  path,
  baseType,
  dataType,
  isPrimitive: options?.isPrimitive ?? true,
  isInteger: options?.isInteger ?? false,
  isPrecise: options?.isPrecise ?? false,
  typeVariableCount: options?.typeVariableCount ?? 0,
  range: options?.range,
});

const _signedRange = (bits: bigint): [bigint, bigint] => [
  -(2n ** (bits - 1n)),
  2n ** (bits - 1n) - 1n,
];
const _unsignedRange = (bits: bigint): [bigint, bigint] => [
  0n,
  2n ** bits - 1n,
];

const COLUMN_TYPES = new Map<string, DataCubeColumnTypeInfo>(
  [
    // core primitives
    _info(
      PRIMITIVE_TYPE.STRING,
      PRIMITIVE_TYPE.STRING,
      DataCubeColumnDataType.TEXT,
    ),
    _info(
      PRIMITIVE_TYPE.BOOLEAN,
      PRIMITIVE_TYPE.BOOLEAN,
      DataCubeColumnDataType.BOOLEAN,
    ),
    _info(
      PRIMITIVE_TYPE.NUMBER,
      PRIMITIVE_TYPE.NUMBER,
      DataCubeColumnDataType.NUMBER,
    ),
    _info(
      PRIMITIVE_TYPE.INTEGER,
      PRIMITIVE_TYPE.INTEGER,
      DataCubeColumnDataType.NUMBER,
      { isInteger: true, range: _signedRange(64n) },
    ),
    _info(
      PRIMITIVE_TYPE.FLOAT,
      PRIMITIVE_TYPE.FLOAT,
      DataCubeColumnDataType.NUMBER,
    ),
    _info(
      PRIMITIVE_TYPE.DECIMAL,
      PRIMITIVE_TYPE.DECIMAL,
      DataCubeColumnDataType.NUMBER,
    ),
    _info(
      PRIMITIVE_TYPE.DATE,
      PRIMITIVE_TYPE.DATE,
      DataCubeColumnDataType.DATE,
    ),
    _info(
      PRIMITIVE_TYPE.STRICTDATE,
      PRIMITIVE_TYPE.STRICTDATE,
      DataCubeColumnDataType.DATE,
    ),
    _info(
      PRIMITIVE_TYPE.DATETIME,
      PRIMITIVE_TYPE.DATETIME,
      DataCubeColumnDataType.TIME,
    ),
    // NOTE: a time of day has no date, so it must not be treated as `TIME` (date-time)
    _info(
      PRIMITIVE_TYPE.STRICTTIME,
      PRIMITIVE_TYPE.STRICTTIME,
      DataCubeColumnDataType.OTHER,
    ),
    _info(
      PRIMITIVE_TYPE.BYTE,
      PRIMITIVE_TYPE.BYTE,
      DataCubeColumnDataType.OTHER,
      { isPrimitive: false },
    ),
    _info(
      CORE_PURE_PATH.VARIANT,
      CORE_PURE_PATH.VARIANT,
      DataCubeColumnDataType.VARIANT,
      { isPrimitive: false },
    ),
    // precise primitives
    _info(
      PRECISE_PRIMITIVE_TYPE.TINY_INT,
      PRIMITIVE_TYPE.INTEGER,
      DataCubeColumnDataType.NUMBER,
      { isPrecise: true, isInteger: true, range: _signedRange(8n) },
    ),
    _info(
      PRECISE_PRIMITIVE_TYPE.U_TINY_INT,
      PRIMITIVE_TYPE.INTEGER,
      DataCubeColumnDataType.NUMBER,
      { isPrecise: true, isInteger: true, range: _unsignedRange(8n) },
    ),
    _info(
      PRECISE_PRIMITIVE_TYPE.SMALL_INT,
      PRIMITIVE_TYPE.INTEGER,
      DataCubeColumnDataType.NUMBER,
      { isPrecise: true, isInteger: true, range: _signedRange(16n) },
    ),
    _info(
      PRECISE_PRIMITIVE_TYPE.U_SMALL_INT,
      PRIMITIVE_TYPE.INTEGER,
      DataCubeColumnDataType.NUMBER,
      { isPrecise: true, isInteger: true, range: _unsignedRange(16n) },
    ),
    _info(
      PRECISE_PRIMITIVE_TYPE.INT,
      PRIMITIVE_TYPE.INTEGER,
      DataCubeColumnDataType.NUMBER,
      { isPrecise: true, isInteger: true, range: _signedRange(32n) },
    ),
    _info(
      PRECISE_PRIMITIVE_TYPE.U_INT,
      PRIMITIVE_TYPE.INTEGER,
      DataCubeColumnDataType.NUMBER,
      { isPrecise: true, isInteger: true, range: _unsignedRange(32n) },
    ),
    _info(
      PRECISE_PRIMITIVE_TYPE.BIG_INT,
      PRIMITIVE_TYPE.INTEGER,
      DataCubeColumnDataType.NUMBER,
      { isPrecise: true, isInteger: true, range: _signedRange(64n) },
    ),
    _info(
      PRECISE_PRIMITIVE_TYPE.U_BIG_INT,
      PRIMITIVE_TYPE.INTEGER,
      DataCubeColumnDataType.NUMBER,
      { isPrecise: true, isInteger: true, range: _unsignedRange(64n) },
    ),
    _info(
      PRECISE_PRIMITIVE_TYPE.VARCHAR,
      PRIMITIVE_TYPE.STRING,
      DataCubeColumnDataType.TEXT,
      { isPrecise: true, typeVariableCount: 1 },
    ),
    _info(
      PRECISE_PRIMITIVE_TYPE.DATETIME, // meta::pure::precisePrimitives::Timestamp
      PRIMITIVE_TYPE.DATETIME,
      DataCubeColumnDataType.TIME,
      { isPrecise: true },
    ),
    _info(
      PRECISE_PRIMITIVE_TYPE.FLOAT, // meta::pure::precisePrimitives::Float4
      PRIMITIVE_TYPE.FLOAT,
      DataCubeColumnDataType.NUMBER,
      { isPrecise: true },
    ),
    _info(
      PRECISE_PRIMITIVE_TYPE.DOUBLE,
      PRIMITIVE_TYPE.FLOAT,
      DataCubeColumnDataType.NUMBER,
      { isPrecise: true },
    ),
    _info(
      PRECISE_PRIMITIVE_TYPE.NUMERIC,
      PRIMITIVE_TYPE.DECIMAL,
      DataCubeColumnDataType.NUMBER,
      { isPrecise: true, typeVariableCount: 2 },
    ),
  ].map((info) => [info.path, info]),
);

/**
 * The precise primitives the engine reports, derived from the registry so there is a
 * single source of truth.
 */
export const DATA_CUBE_PRECISE_PRIMITIVE_TYPES: readonly string[] = [
  ...COLUMN_TYPES.values(),
]
  .filter((info) => info.isPrecise)
  .map((info) => info.path);

/**
 * Resolves legacy type paths to the type DataCube now uses for them.
 */
export function resolveLegacyColumnType(type: string): string {
  return type === LEGACY_RELATIONAL_TIMESTAMP_TYPE
    ? PRECISE_PRIMITIVE_TYPE.DATETIME
    : type;
}

export function getColumnTypeInfo(
  type: string,
): DataCubeColumnTypeInfo | undefined {
  return COLUMN_TYPES.get(resolveLegacyColumnType(type));
}

export function isPrecisePrimitiveType(type: string) {
  return getColumnTypeInfo(type)?.isPrecise ?? false;
}

/**
 * Returns the type to use when building literal values for a column of the specified type.
 * For precise primitives, this is the core primitive they extend, e.g. `Integer` for `Int`.
 */
export function getLiteralType(type: string): string {
  return getColumnTypeInfo(type)?.baseType ?? type;
}

export function isNumericType(type: string) {
  return getColumnTypeInfo(type)?.dataType === DataCubeColumnDataType.NUMBER;
}

export function isIntegerType(type: string) {
  return getColumnTypeInfo(type)?.isInteger ?? false;
}

/**
 * Checks whether the type of the column is fully specified, i.e. it carries the
 * type variable values its type takes, e.g. the size of `Varchar(x)`.
 *
 * NOTE: columns persisted by older versions do not record type variable values.
 */
export function hasCompleteColumnType(column: {
  type: string;
  typeVariableValues?: readonly number[] | undefined;
}): boolean {
  const typeVariableCount =
    getColumnTypeInfo(column.type)?.typeVariableCount ?? 0;
  return (
    !typeVariableCount ||
    column.typeVariableValues?.length === typeVariableCount
  );
}

/**
 * Returns the default number of decimals to display for a numeric column:
 * none for integers, the scale for `Numeric(precision, scale)`, 2 otherwise.
 */
export function getDefaultDecimals(column: {
  type: string;
  typeVariableValues?: readonly number[] | undefined;
}): number {
  if (isIntegerType(column.type)) {
    return 0;
  }
  if (column.type === PRECISE_PRIMITIVE_TYPE.NUMERIC) {
    const [, scale] = column.typeVariableValues ?? [];
    if (scale !== undefined) {
      return scale;
    }
  }
  return 2;
}

/**
 * Returns a short, human-readable label for a column type, e.g. `Varchar(200)`, `Numeric(18,4)`
 */
export function formatColumnType(column: {
  type: string;
  typeVariableValues?: readonly number[] | undefined;
}): string {
  const type = resolveLegacyColumnType(column.type);
  const name = type.includes(ELEMENT_PATH_DELIMITER)
    ? extractElementNameFromPath(type)
    : type;
  return column.typeVariableValues?.length
    ? `${name}(${column.typeVariableValues.join(',')})`
    : name;
}

/**
 * The exact type each precise primitive used to collapse into, as per the old
 * `DataCubeColumnConfiguration._convertPreciseToPrimitiveType`. This is deliberately a
 * fixed table rather than a derived check (e.g. matching on `getLiteralType()`): several
 * precise types share a literal/base type without having collapsed to it, e.g. `Double`'s
 * literal type is `Float` but it used to collapse to `Number`, and `Numeric`'s literal type
 * is `Decimal` but it was never collapsed (persisted as `Numeric` as is). Matching on the
 * literal type alone would therefore also match a genuine legacy `Float` or `Decimal`
 * column against an engine-reported `Double` or `Numeric` column of a different identity.
 */
const LEGACY_COLLAPSE_TARGET: Partial<Record<string, string>> = {
  [PRECISE_PRIMITIVE_TYPE.VARCHAR]: PRIMITIVE_TYPE.STRING,
  [PRECISE_PRIMITIVE_TYPE.TINY_INT]: PRIMITIVE_TYPE.INTEGER,
  [PRECISE_PRIMITIVE_TYPE.U_TINY_INT]: PRIMITIVE_TYPE.INTEGER,
  [PRECISE_PRIMITIVE_TYPE.SMALL_INT]: PRIMITIVE_TYPE.INTEGER,
  [PRECISE_PRIMITIVE_TYPE.U_SMALL_INT]: PRIMITIVE_TYPE.INTEGER,
  [PRECISE_PRIMITIVE_TYPE.INT]: PRIMITIVE_TYPE.INTEGER,
  [PRECISE_PRIMITIVE_TYPE.U_INT]: PRIMITIVE_TYPE.INTEGER,
  [PRECISE_PRIMITIVE_TYPE.BIG_INT]: PRIMITIVE_TYPE.NUMBER,
  [PRECISE_PRIMITIVE_TYPE.U_BIG_INT]: PRIMITIVE_TYPE.NUMBER,
  [PRECISE_PRIMITIVE_TYPE.DOUBLE]: PRIMITIVE_TYPE.NUMBER,
  [PRECISE_PRIMITIVE_TYPE.FLOAT]: PRIMITIVE_TYPE.FLOAT,
  [PRECISE_PRIMITIVE_TYPE.DATETIME]: PRIMITIVE_TYPE.DATETIME,
};

/**
 * Checks whether a column type persisted by an older version of DataCube, which collapsed
 * precise primitives into core primitives (and mapped `BigInt`, `UBigInt`, `Double` to `Number`),
 * corresponds to the specified (precise) type.
 */
export function isLegacyCollapsedColumnType(
  legacyType: string,
  type: string,
): boolean {
  const resolvedType = resolveLegacyColumnType(type);
  return (
    resolveLegacyColumnType(legacyType) === resolvedType ||
    LEGACY_COLLAPSE_TARGET[resolvedType] === legacyType
  );
}

// NOTE: this works off `Number.toString()`, so it is a best-effort check on JS numbers:
// values with more than ~15 significant digits (e.g. for `Numeric(38,s)`) lose precision
const _countDigits = (value: number): { integer: number; fraction: number } => {
  // NOTE: account for the exponential notation, e.g. `1.5e-7`, `1.5e+21`
  const [mantissa = '', exponent = '0'] = Math.abs(value).toString().split('e');
  const [integerPart = '', fractionPart = ''] = mantissa.split('.');
  const shift = Number(exponent);
  return {
    integer: Math.max(integerPart.replace(/^0+/u, '').length + shift, 0),
    fraction: Math.max(fractionPart.length - shift, 0),
  };
};

/**
 * Checks a value against the constraints of a precise primitive column type, e.g. the
 * range of `TinyInt`, the max length of `Varchar(x)`, the precision and scale of
 * `Numeric(precision, scale)`, and returns a warning when the value violates them.
 *
 * NOTE: these constraints are not enforced by the database, so such a value is not
 * necessarily wrong, e.g. it might simply never match, hence a warning, not an error.
 */
export function getColumnValueWarning(
  column: { type: string; typeVariableValues?: readonly number[] | undefined },
  value: unknown,
): string | undefined {
  const info = getColumnTypeInfo(column.type);
  if (!info || !isPrecisePrimitiveType(column.type)) {
    return undefined;
  }
  const typeLabel = formatColumnType(column);
  if (info.range && typeof value === 'number' && Number.isFinite(value)) {
    if (!Number.isInteger(value)) {
      return `Value ${value} is not an integer, as expected for ${typeLabel}`;
    }
    const [min, max] = info.range;
    // NOTE: skip the `BigInt` conversion in the common case of a safe integer
    const isOutOfRange = Number.isSafeInteger(value)
      ? value < Number(min) || value > Number(max)
      : BigInt(value) < min || BigInt(value) > max;
    if (isOutOfRange) {
      return `Value ${value} is out of the range of ${typeLabel} [${min}, ${max}]`;
    }
    return undefined;
  }
  if (
    column.type === PRECISE_PRIMITIVE_TYPE.VARCHAR &&
    typeof value === 'string' &&
    column.typeVariableValues?.length === 1
  ) {
    const maxLength = column.typeVariableValues[0] as number;
    // NOTE: the UTF-16 length is never less than the code point count, so it is a safe early exit
    if (value.length <= maxLength) {
      return undefined;
    }
    // NOTE: count characters (code points), not UTF-16 code units, e.g. emojis count as 1
    const length = [...value].length;
    if (length > maxLength) {
      return `Value is longer (${length} characters) than the max length of ${typeLabel}`;
    }
    return undefined;
  }
  if (
    column.type === PRECISE_PRIMITIVE_TYPE.NUMERIC &&
    typeof value === 'number' &&
    Number.isFinite(value) &&
    column.typeVariableValues?.length === 2
  ) {
    const [precision, scale] = column.typeVariableValues as [number, number];
    const digits = _countDigits(value);
    if (digits.fraction > scale) {
      return `Value ${value} has more decimals than the scale of ${typeLabel}`;
    }
    if (digits.integer > precision - scale) {
      return `Value ${value} has more digits than the precision of ${typeLabel} allows`;
    }
  }
  return undefined;
}
