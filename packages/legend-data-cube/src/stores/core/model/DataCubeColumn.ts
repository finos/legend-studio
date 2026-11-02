/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import { createSimpleSchema, list, optional, primitive } from 'serializr';

export type DataCubeColumn = {
  name: string;
  type: string;
  /**
   * The type variable values of the column type, e.g. `[200]` for `Varchar(200)`
   * and `[18, 4]` for `Numeric(18, 4)`
   */
  typeVariableValues?: readonly number[] | undefined;
};

export const dataCubeColumnSchema = createSimpleSchema({
  name: primitive(),
  type: primitive(),
  typeVariableValues: optional(list(primitive())),
});

export type DataCubeColumnRelationType = DataCubeColumn[];

export function _findCol<T extends DataCubeColumn>(
  cols: T[] | undefined,
  name: string | undefined,
): T | undefined {
  return cols?.find((c) => c.name === name);
}

export function _toCol(col: {
  name: string;
  type: string;
  typeVariableValues?: readonly number[] | undefined;
}): DataCubeColumn {
  return col.typeVariableValues?.length
    ? {
        name: col.name,
        type: col.type,
        typeVariableValues: [...col.typeVariableValues],
      }
    : { name: col.name, type: col.type };
}

export const _sortByColName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name);

/**
 * Reuses the type variable values of `knownColumn` (e.g. the size of `Varchar(200)`) when
 * it matches `type`, since execution results and relation casts do not always report them.
 */
export function reuseTypeVariableValues(
  knownColumn:
    | { type: string; typeVariableValues?: readonly number[] | undefined }
    | undefined,
  type: string,
): readonly number[] | undefined {
  return knownColumn?.type === type && knownColumn.typeVariableValues
    ? knownColumn.typeVariableValues
    : undefined;
}
