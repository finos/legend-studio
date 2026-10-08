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

import { foldColumnName } from '../schema/ColumnName.js';
import type { Schema } from '../schema/Schema.js';

/**
 * A name for a column an emitter adds and drops again, e.g. `cube_rn`: the
 * base name, else with a number (`cube_rn2`, `cube_rn3`, …), until no column
 * of the schema has it in any case (`foldColumnName`): `CUBE_RN` takes
 * `cube_rn` on a database that compares names without case
 */
export const getTemporaryColumnName = (
  base: string,
  schema: Schema,
): string => {
  const taken = new Set(schema.names().map(foldColumnName));
  let name = base;
  for (let index = 2; taken.has(foldColumnName(name)); index += 1) {
    name = `${base}${index}`;
  }
  return name;
};
