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
 * Pure writes enumeration values qualified, as `EnumName.VALUE`; Cube stores
 * them unqualified. These helpers convert between the two forms.
 */

/**
 * `SortDirection.Ascending` → `Ascending`. Idempotent: `Ascending` stays
 * `Ascending`. A value with more than one `.` is an error.
 */
export const unqualifyEnumValue = (value: string): string => {
  const parts = value.split('.');
  if (parts.length > 2) {
    throw new Error(
      `Enumeration value "${value}" can't have more than one '.'`,
    );
  }
  return parts.at(-1) ?? value;
};

/** (`Ascending`, `SortDirection`) → `SortDirection.Ascending`. Idempotent on qualified values. */
export const qualifyEnumValue = (value: string, enumName: string): string =>
  `${enumName}.${unqualifyEnumValue(value)}`;
