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

export type DataCubeColumn = {
  name: string;
  type: string;
};

export function _findCol<T extends DataCubeColumn>(
  cols: T[] | undefined,
  name: string | undefined,
): T | undefined {
  return cols?.find((c) => c.name === name);
}

export function _toCol(col: { name: string; type: string }): DataCubeColumn {
  return { name: col.name, type: col.type };
}

export const _sortByColName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name);
