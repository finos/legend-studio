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

import { resolveCubeType, TypeFamily } from '@finos/legend-cube';
import { parseLosslessJSON, type PlainObject } from '@finos/legend-shared';
import type { CubeResultValue } from '../../../CubeEngine.js';

// An execution response (DEFAULT format, relation result) read losslessly
// (PLAN §8.7). Each column's values keep one JS type, decided by the type the
// result builder gives it: Float values are numbers; any other number, an
// Integer or Decimal value above all, is its exact text ("9007199254740993",
// "12.30"). Nothing is inferred from the kind of JSON token, since a Float
// column may hold 5124 and a String column 32.38.

const RELATIONAL_ACTIVITY_TYPE = 'relational';

export interface V1_CubeExecutionResult {
  readonly columns: readonly string[];
  readonly rows: readonly (readonly CubeResultValue[])[];
  readonly sql: readonly string[];
}

/** Thrown when the body can't be read, e.g. a stack trace streamed into a 200 */
export class V1_CubeUnreadableResultError extends Error {}

const isLosslessNumber = (
  value: unknown,
): value is { isLosslessNumber: true; value: string } =>
  typeof value === 'object' &&
  value !== null &&
  (value as { isLosslessNumber?: unknown }).isLosslessNumber === true;

const asObject = (value: unknown): PlainObject =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as PlainObject)
    : {};

const readCell = (value: unknown, asNumber: boolean): CubeResultValue => {
  if (isLosslessNumber(value)) {
    return asNumber ? Number(value.value) : value.value;
  }
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  throw new V1_CubeUnreadableResultError(
    `A result value is not a scalar: ${JSON.stringify(value)}`,
  );
};

/** The columns, rows and SQL of an execution response's text */
export const V1_readCubeExecutionResult = (
  text: string,
): V1_CubeExecutionResult => {
  let json: PlainObject;
  try {
    json = asObject(parseLosslessJSON(text));
  } catch (error) {
    throw new V1_CubeUnreadableResultError(
      `The engine's response can't be read: ${(error as Error).message}`,
    );
  }
  const result = asObject(json.result);
  if (!Array.isArray(result.columns) || !Array.isArray(result.rows)) {
    throw new V1_CubeUnreadableResultError(
      `The engine's response has no relation result`,
    );
  }
  const columns = result.columns.map((name) => String(name));
  const builderTypes = new Map(
    (Array.isArray(asObject(json.builder).columns)
      ? (asObject(json.builder).columns as unknown[])
      : []
    ).map((column) => [
      String(asObject(column).name),
      String(asObject(column).type ?? ''),
    ]),
  );
  const asNumber = columns.map((name) => {
    const type = builderTypes.get(name);
    return type ? resolveCubeType(type).family === TypeFamily.FLOAT : false;
  });
  const rows = result.rows.map((row) => {
    const values = asObject(row).values;
    if (!Array.isArray(values) || values.length !== columns.length) {
      throw new V1_CubeUnreadableResultError(
        `A result row doesn't have one value per column`,
      );
    }
    return values.map((value, index) =>
      readCell(value, asNumber[index] ?? false),
    );
  });
  const sql = (Array.isArray(json.activities) ? json.activities : [])
    .map(asObject)
    .filter((activity) => activity._type === RELATIONAL_ACTIVITY_TYPE)
    .map((activity) => String(activity.sql));
  return { columns, rows, sql };
};
