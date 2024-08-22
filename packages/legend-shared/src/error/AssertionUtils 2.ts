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

import { EnrichedError } from './ErrorUtils.js';
import type { GenericClazz, PlainObject } from '../CommonUtils.js';

export class AssertionError extends EnrichedError {
  constructor(error: string | Error | undefined, message?: string) {
    super('Assertion Error', error, message);
  }
}
export const isNullable = <T>(
  value: T | null | undefined,
): value is null | undefined => value === null || value === undefined;
export const isNonNullable = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;
export function assertNonNullable<T>(
  value: T | null | undefined,
  message = '',
): asserts value is T {
  if (value === null || value === undefined) {
    throw new AssertionError(message || 'Value is nullable');
  }
}
export const guaranteeNonNullable = <T>(
  value: T | null | undefined,
  message = '',
): T => {
  assertNonNullable(value, message);
  return value;
};

export const isType = <T>(value: unknown, clazz: GenericClazz<T>): value is T =>
  value instanceof clazz;
export const filterByType =
  <T>(clazz: GenericClazz<T>): ((value: unknown) => value is T) =>
  (value: unknown): value is T =>
    isType(value, clazz);
// Aserts typing doesn't work with all arrow function type declaration form
// So we can use this: export const assertType: <T>(value: unknown, clazz: Clazz<T>, message: string) => asserts value is T = (value, clazz, message = '') => {
// or the normal function form
// See https://github.com/microsoft/TypeScript/issues/34523
// See https://github.com/microsoft/TypeScript/pull/33622
export function assertType<T>(
  value: unknown,
  clazz: GenericClazz<T>,
  message = '',
): asserts value is T {
  if (!(value instanceof clazz)) {
    throw new AssertionError(
      message || `Value is expected to be of type '${clazz.name}'`,
    );
  }
}
export const guaranteeType = <T>(
  value: unknown,
  clazz: GenericClazz<T>,
  message = '',
): T => {
  assertType(value, clazz, message);
  return value;
};

export function isNonEmptyString(
  str: string | null | undefined,
): str is string {
  return isNonNullable(str) && str !== '';
}

export function assertNonEmptyString(
  str: string | null | undefined,
  message = '',
): asserts str is string {
  if (guaranteeNonNullable(str, message) === '') {
    throw new AssertionError(
      message || `Expected string value to be non-empty`,
    );
  }
}

export function guaranteeNonEmptyString(
  str: string | null | undefined,
  message = '',
): string {
  assertNonEmptyString(str, message);
  return str;
}

export function assertTrue(
  assertionValue: boolean,
  message = '',
): asserts assertionValue is true {
  if (!assertionValue) {
    throw new AssertionError(message || `Expected predicate to be truthy`);
  }
}

export const isString = (val: unknown): val is string =>
  typeof val === 'string';
export const isNumber = (val: unknown): val is number =>
  typeof val === 'number' && !isNaN(val);
export const isBoolean = (val: unknown): val is boolean =>
  typeof val === 'boolean';
export const isObject = (val: unknown): val is object =>
  typeof val === 'object' && val !== null;
export const isPlainObject = (val: unknown): val is PlainObject =>
  isObject(val) && val.constructor.name === 'Object';

export function assertIsString(
  val: unknown,
  message = '',
): asserts val is string {
  if (!isString(val)) {
    throw new AssertionError(message || `Value is expected to be a string`);
  }
}
export function assertIsNumber(
  val: unknown,
  message = '',
): asserts val is number {
  if (!isNumber(val)) {
    throw new AssertionError(message || `Value is expected to be a number`);
  }
}
export function assertIsBoolean(
  val: unknown,
  message = '',
): asserts val is boolean {
  if (!isBoolean(val)) {
    throw new AssertionError(message || `Value is expected to be a boolean`);
  }
}
export function assertIsObject(
  val: unknown,
  message = '',
): asserts val is object {
  if (!isObject(val)) {
    throw new AssertionError(message || `Value is expected to be a object`);
  }
}
export const guaranteeIsString = (val: unknown, message = ''): string => {
  assertIsString(val, message);
  return val;
};
export const guaranteeIsNumber = (val: unknown, message = ''): number => {
  assertIsNumber(val, message);
  return val;
};
export const guaranteeIsBoolean = (val: unknown, message = ''): boolean => {
  assertIsBoolean(val, message);
  return val;
};
export const guaranteeIsObject = (val: unknown, message = ''): object => {
  assertIsObject(val, message);
  return val;
};
