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

import { validate } from '../../inference/ValidationUtils.js';
import {
  BLANK_PLACEHOLDER,
  MESSAGE_SIZE_MUST_BE_POSITIVE_WHOLE_NUMBER,
} from '../../messages/CubeMessages.js';

// The settings of the nodes that take rows by position (Limit, Drop, Slice):
// a number, or `undefined` once the user clears the field, which validation
// then reports (spec §7.7). A node never holds NaN or an infinity, which a
// saved spec could not write.

/** Refuses a setting that is neither `undefined` nor a finite number */
export const assertRowSetting = (value: unknown, description: string): void => {
  if (
    value !== undefined &&
    (typeof value !== 'number' || !Number.isFinite(value))
  ) {
    throw new Error(`${description} must be a finite number or undefined`);
  }
};

/** Whether a size is a whole number of at least 1 that a double holds exactly */
export const isPositiveWholeNumber = (size: number | undefined): boolean =>
  size !== undefined && Number.isSafeInteger(size) && size > 0;

/** The spec's `validateSize` (§7.7): a whole number of at least 1 */
export const validateSize = (
  size: number | undefined,
  errors?: string[],
): boolean =>
  validate(
    isPositiveWholeNumber(size),
    MESSAGE_SIZE_MUST_BE_POSITIVE_WHOLE_NUMBER,
    errors,
  );

/** A setting as a description shows it: `(blank)` once cleared */
export const describeRowSetting = (value: number | undefined): string =>
  value === undefined ? BLANK_PLACEHOLDER : String(value);
