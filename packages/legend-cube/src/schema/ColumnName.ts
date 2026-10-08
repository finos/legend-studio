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

/** The longest name Cube gives a column, in code points (PLAN §11.4) */
export const MAX_COLUMN_NAME_LENGTH = 128;

const CONTROL_CHARACTER = /\p{Cc}/u;

/**
 * Whether a name can be given to a column, by a Rename now and by later
 * operations that make columns (PLAN §11.4, replacing the spec's
 * `/^[A-Za-z0-9_ ]{1,100}$/u`, Appendix A): not empty, no space at either
 * end, no `"` (which breaks the column's SQL alias), no `\` (the engine then
 * can't find the column again), no control character, and at most
 * `MAX_COLUMN_NAME_LENGTH` code points. Spaces, hyphens, quotes and
 * non-ASCII letters are fine.
 */
export const isValidColumnName = (name: string): boolean =>
  name.length > 0 &&
  name === name.trim() &&
  !name.includes('"') &&
  !name.includes('\\') &&
  !CONTROL_CHARACTER.test(name) &&
  Array.from(name).length <= MAX_COLUMN_NAME_LENGTH;
