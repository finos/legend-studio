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

/** Whole-number text: an optional sign, then digits */
const WHOLE_NUMBER_TEXT = /^[+-]?\d+$/u;

/**
 * The number a size or row index field holds. Text that isn't a whole number,
 * empty text included, gives `undefined`, which the node then reports: never
 * a default. It doesn't use `Number()` on the raw text, which reads `''` as 0,
 * `0x10` as 16 and `1e3` as 1000. Spaces around the digits are allowed; a
 * number too long for a double gives `undefined`.
 */
export const parseWholeNumberText = (text: string): number | undefined => {
  const trimmed = text.trim();
  if (!WHOLE_NUMBER_TEXT.test(trimmed)) {
    return undefined;
  }
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : undefined;
};
