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

import type { Schema } from '../schema/Schema.js';

/**
 * Pushes `message` to `errors` when the condition fails, and returns the
 * condition. Chain checks with `&&` to stop at the first failure.
 */
export const validate = (
  condition: boolean,
  message: string,
  errors?: string[],
): boolean => {
  if (!condition && errors) {
    errors.push(message);
  }
  return condition;
};

/**
 * Validates every item and returns whether all are valid. Unlike `&&`, it
 * deliberately does not stop at the first failure: the user should see all
 * the broken items at once.
 */
export const validateAllItems = <T>(
  items: readonly T[],
  validateItem: (item: T, index: number) => boolean,
): boolean =>
  items.reduce<boolean>(
    (valid, item, index) => validateItem(item, index) && valid,
    true,
  );

/**
 * Asserts that a node got exactly one input schema per port, in port order.
 * Every `validate()` and `schematize()` calls it first.
 */
export const ensureSchemas = (
  inputSchemas: readonly Schema[],
  ports: readonly string[],
): readonly Schema[] => {
  if (inputSchemas.length !== ports.length) {
    throw new Error(
      `Expected ${ports.length} input schema(s), one per port (${ports.join(', ')}), but got ${inputSchemas.length}`,
    );
  }
  // input schemas come from the inference engine, but check every slot anyway,
  // holes included; by shape, not `instanceof`, so copies of the module work
  ports.forEach((port, index) => {
    const schema = inputSchemas[index] as
      | Partial<Record<keyof Schema, unknown>>
      | null
      | undefined;
    if (
      typeof schema !== 'object' ||
      schema === null ||
      !Array.isArray(schema.columns) ||
      typeof schema.lookup !== 'function' ||
      typeof schema.equals !== 'function'
    ) {
      throw new Error(`The input schema for port "${port}" is not a schema`);
    }
  });
  return inputSchemas;
};
