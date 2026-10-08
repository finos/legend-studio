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

/**
 * The family of a type decides how it behaves: which filter operators and
 * literal values it takes and which types it can be compared with. Precise
 * types share the family of their base type: `Varchar(n)` is STRING, `SmallInt`
 * is INTEGER, `Numeric(p,s)` is DECIMAL and `Timestamp` is DATETIME.
 */
export enum TypeFamily {
  BOOLEAN = 'BOOLEAN',
  STRING = 'STRING',
  INTEGER = 'INTEGER',
  FLOAT = 'FLOAT',
  DECIMAL = 'DECIMAL',
  /** the abstract `Number` */
  NUMBER = 'NUMBER',
  STRICT_DATE = 'STRICT_DATE',
  DATETIME = 'DATETIME',
  /** the abstract `Date`, the parent of `StrictDate` and `DateTime` */
  DATE = 'DATE',
  STRICT_TIME = 'STRICT_TIME',
  VARIANT = 'VARIANT',
  ENUM = 'ENUM',
  /** a type Cube does not know: carried through, never compared */
  OPAQUE = 'OPAQUE',
}

export const isNumericFamily = (family: TypeFamily): boolean =>
  family === TypeFamily.INTEGER ||
  family === TypeFamily.FLOAT ||
  family === TypeFamily.DECIMAL ||
  family === TypeFamily.NUMBER;
