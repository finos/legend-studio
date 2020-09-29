/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { v4 as uuid_V4 } from 'uuid';
// NOTE: importing `lodash` this way helps reduce package size
import _cloneDeep from 'lodash/cloneDeep';
import _isEqual from 'lodash/isEqual';
import _findLast from 'lodash/findLast';
import _isEmpty from 'lodash/isEmpty';
import _pickBy from 'lodash/pickBy';
import _uniqBy from 'lodash/uniqBy';
import _uniq from 'lodash/uniq';
import _debounce from 'lodash/debounce';
import _throttle from 'lodash/throttle';
import { deserialize, serialize, ClazzOrModelSchema } from 'serializr';
import { runInAction } from 'mobx';
import { ContentType } from 'API/NetworkClient';

// a generic error that does not have a stack trace, it is useful for try-catch logic
// as Typescript current catch phrase is not typed
// See https://github.com/microsoft/TypeScript/issues/13219
export abstract class ApplicationError extends Error {
  message = '';
}

// Since Javascript does not fully support rethrowing error, we need to customize and manipulate the stack trace
// See https://stackoverflow.com/questions/42754270/re-throwing-exception-in-nodejs-and-not-losing-stack-trace
export class EnrichedError extends Error {
  constructor(name: string, error: string | Error | undefined, overideMessage?: string) {
    super(overideMessage ? overideMessage : (error instanceof Error ? error.message : error));
    this.name = name;
    // if the material used to make this error is also an error, we maintain the stack trace and
    // follow the `rethrown` error stack trace convention
    // See https://www.twilio.com/blog/how-to-read-and-understand-a-java-stacktrace
    if (error instanceof Error) {
      const messageLines = (this.message.match(/\n/g) ?? []).length + 1;
      this.stack = `${(this.stack ?? '').split('\n').slice(0, messageLines + 1).join('\n')}\nCaused by: ${error.stack}`;
    } else {
      if (typeof Error.captureStackTrace === 'function') {
        // Maintains proper stack trace for where our error was thrown (only available on V8)
        // This only works in Chrome for now. Firefox (as of Feb 2020) will throw error
        // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
        Error.captureStackTrace(this, this.constructor);
      } else {
        // otherwise, use the non-standard but defacto stack trace (available in most browser)
        this.stack = (new Error(error)).stack;
      }
    }
  }
}

export class IllegalStateError extends EnrichedError {
  constructor(error: string | Error | undefined, message?: string) {
    super('Illegal State Error [PLEASE NOTIFY DEVELOPER]', error, message);
  }
}

export class UnsupportedOperationError extends EnrichedError {
  constructor(error?: string | Error, message?: string) {
    super('Unsupported Operation Error', error, message);
  }
}

export class AssertionError extends EnrichedError {
  constructor(error: string | Error | undefined, message?: string) {
    super('Assertion Error', error, message);
  }
}

export const noop = (): () => void => (): void => { /* do nothing */ };

// NOTE: We re-export lodash utilities like this so we centralize utility usage in our app
// in case we want to swap out the implementation
export const deepClone = _cloneDeep;
export const deepEqual = _isEqual;
export const findLast = _findLast;
export const isEmpty = _isEmpty;
export const uniqBy = _uniqBy;
export const uniq = _uniq;
export const debounce = _debounce;
export const throttle = _throttle;

// NOTE: do not remove this, this is a good way to debug in our app
export { diff as deepDiff } from 'deep-diff';

export const isString = (val: unknown): val is string => typeof val === 'string';
export const isNumber = (val: unknown): val is number => typeof val === 'number';
export const isBoolean = (val: unknown): val is boolean => typeof val === 'boolean';
export const isObject = (val: unknown): val is object => typeof val === 'object';

export function assertIsString(val: unknown, message = ''): asserts val is string { if (!isString(val)) { throw new AssertionError(message || `Value is expected to be a string`) } }
export const guaranteeIsString = (val: unknown, message = ''): string => { assertIsString(val, message); return val };
export function assertIsNumber(val: unknown, message = ''): asserts val is number { if (!isNumber(val)) { throw new AssertionError(message || `Value is expected to be a number`) } }
export const guaranteeIsNumber = (val: unknown, message = ''): number => { assertIsNumber(val, message); return val };

/**
 * Recursively omit keys from an object
 */
export const recursiveOmit = (obj: Record<PropertyKey, unknown>, keysToRemove: string[]): Record<PropertyKey, unknown> => {
  const newObj = deepClone(obj);
  const omit = (obj: Record<PropertyKey, unknown>, keysToRemove: string[]): void => {
    for (const prop in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, prop)) {
        const value = obj[prop];
        if (keysToRemove.includes(prop)) {
          delete obj[prop];
        } else if (typeof value === 'object') {
          omit(value as Record<PropertyKey, unknown>, keysToRemove);
        }
      }
    }
  };
  omit(newObj, keysToRemove);
  return newObj;
};

/**
 * Recursively remove fields with undefined values in object
 */
export const pruneObject = (obj: Record<PropertyKey, unknown>): Record<PropertyKey, unknown> => _pickBy(obj, (val: unknown): boolean => val !== undefined);

// Since the right side of `instanceof` is an expression evaluating to a constructor function (ie. a class), not a type, so we have to make it
// as such, this is similar to type definition of Clazz in `serializer` and we take it out here because we want to refer to it in many places
// Note that this will not work for abstract class and we will have to revert to use `instanceof`.
// See https://github.com/Microsoft/TypeScript/issues/5236
// See https://github.com/microsoft/TypeScript/issues/5843
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Clazz<T> = { new(...args: any[]): T };
/**
 * As mentioned above for `Clazz<T>`, there is no good way to represent abstract class so
 * we will use `Function` in this case, this is a very loose check and will lose some benefit of type checking
 * during compile time, so refrain from using it extensively
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GenericClazz<T> = { new(...args: any[]): T } | Function;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SuperGenericFunction = (...args: any) => any;

export const isNonNullable = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined;
export function assertNonNullable<T>(value: T | null | undefined, message = ''): asserts value is T {
  if (value === null || value === undefined) { throw new AssertionError(message || 'Value is nullable') }
}
export const guaranteeNonNullable = <T>(value: T | null | undefined, message = ''): T => {
  assertNonNullable(value, message);
  return value;
};

export const isType = <T>(value: unknown, clazz: GenericClazz<T>): value is T => value instanceof clazz;
// Aserts typing doesn't work with all arrow function type declaration form
// So we can use this: export const assertType: <T>(value: unknown, clazz: Clazz<T>, message: string) => asserts value is T = (value, clazz, message = '') => {
// or the normal function form
// See https://github.com/microsoft/TypeScript/issues/34523
// See https://github.com/microsoft/TypeScript/pull/33622
export function assertType<T>(value: unknown, clazz: GenericClazz<T>, message = ''): asserts value is T {
  if (!(value instanceof clazz)) { throw new AssertionError(message || `Value is expected to be of type '${clazz.name}'`) }
}
export const guaranteeType = <T>(value: unknown, clazz: GenericClazz<T>, message = ''): T => {
  assertType(value, clazz, message);
  return value;
};

export function assertNonEmptyString(str: string | null | undefined, message = ''): asserts str is string {
  if (guaranteeNonNullable(str, message) === '') { throw new AssertionError(message || `Expected string value to be non-empty`) }
}

export function assertTrue(assertionValue: boolean, message = ''): asserts assertionValue is true {
  if (!assertionValue) { throw new AssertionError(message || `Expected predicate to be truthy`) }
}

export const returnUndefOnError = <T extends SuperGenericFunction>(fn: T): ReturnType<T> | undefined => {
  try {
    return fn();
  } catch {
    return undefined;
  }
};

export const decorateErrorMessageIfExists = <T extends SuperGenericFunction>(fn: T, errorMessageDecorator: (msg: string) => string): ReturnType<T> => {
  try {
    return fn();
  } catch (error) {
    error.message = errorMessageDecorator(error.message);
    throw error;
  }
};

// React `setState` used to come with a callback that runs after the state is updated
// See https://www.robinwieruch.de/react-usestate-callback
export const useStateWithCallback = <T>(initialState: T, callback: (newState: T) => void): [T, (newValue: T) => void] => {
  const [state, setState] = useState(initialState);
  useEffect(() => callback(state), [state, callback]);
  return [state, setState];
};

// This hook is a good replacement for `componentDidUpdate` to grab previous state
// See https://reactjs.org/docs/hooks-faq.html#how-to-get-the-previous-props-or-state
// See https://usehooks.com/usePrevious/
export const usePrevious = <T>(value: T | undefined): T | undefined => {
  // The ref object is a generic container whose current property is mutable
  // and can hold any value, similar to an instance property on a class
  const ref = useRef<T>();
  // store current value in ref
  useEffect(() => { ref.current = value }, [value]); // only re-run if value changes
  // Return previous value (happens before update in useEffect above)
  return ref.current;
};

/**
 * This hook measures the size of a HTML element, by default it will react to resize event on window
 * See https://github.com/Swizec/useDimensions
 */
export const useDimensions = (options?: { remeasureOnWindowResize?: boolean }): [(node: HTMLElement | null) => void, DOMRect | undefined, HTMLElement | null] => {
  const [dimensions, setDimensions] = useState<DOMRect>();
  const [node, setNode] = useState<HTMLElement | null>(null);
  const ref = useCallback(node => setNode(node), []);

  useLayoutEffect(() => {
    if (node) {
      const measure = (): void => { window.requestAnimationFrame(() => setDimensions(node.getBoundingClientRect())) };
      measure();
      if (options?.remeasureOnWindowResize) {
        window.addEventListener('resize', measure);
        return (): void => window.removeEventListener('resize', measure);
      }
    }
    return noop();
  }, [node, options?.remeasureOnWindowResize]);

  return [ref, dimensions, node];
};

// Stringify object shallowly
// See https://stackoverflow.com/questions/16466220/limit-json-stringification-depth
export const shallowStringify = (object: unknown): string =>
  JSON.stringify(object, (key, val) => key && val && typeof val !== 'number' ? (Array.isArray(val) ? '[object Array]' : `${val}`) : val);

// NOTE: we need these methods because `map()` of `serializr` tries to smartly determines if it should produce object or ES6 Map
// but we always want ES6 Map, so we would use this function
export const deseralizeMap = <T>(val: Record<string, T>, schema?: ClazzOrModelSchema<T>): Map<string, T> => {
  const result = new Map<string, T>();
  Object.keys(val).forEach((key: string) => result.set(key, schema ? deserialize(schema, val[key]) : val[key]));
  return result;
};

export const serializeMap = <T>(val: Map<string, T> | undefined, schema?: ClazzOrModelSchema<T>): Record<PropertyKey, unknown> => {
  const result: Record<PropertyKey, unknown> = {};
  val?.forEach((v, key) => { result[key] = (schema ? serialize(schema, v) : v) });
  return result;
};

export const promisify = <T>(func: () => T): Promise<T> => new Promise<T>(
  (resolve, reject) => setTimeout(() => {
    try {
      resolve(runInAction(() => func()));
    } catch (e) {
      reject(e);
    }
  }, 0));

// NOTE: we can use the `rng` option in UUID V4 to control the random seed during testing
// See https://github.com/uuidjs/uuid#version-4-random
export const uuid = uuid_V4;

export const generateEnumerableNameFromToken = (existingNames: string[], token: string): string => {
  assertTrue(Boolean(token.match(/^[\w_-]+$/)), 'Token must only contain any digits, letters, or special characters _ and -');
  const maxCounter = existingNames.map(name => {
    const matchingCount = name.match(new RegExp(`^${token}_(?<count>\\d+)$`));
    return matchingCount?.groups?.count ? parseInt(matchingCount.groups.count, 10) : 0;
  }).reduce((max, num) => Math.max(max, num), 0);
  return `${token}_${maxCounter + 1}`;
};

export const addUniqueEntry = <T>(array: T[], newEntry: T, comparator = (val1: T, val2: T): boolean => val1 === val2): boolean => {
  if (!array.find(entry => comparator(entry, newEntry))) {
    runInAction(() => array.push(newEntry));
    return true;
  }
  return false;
};

export const changeEntry = <T>(array: T[], oldEntry: T, newEntry: T, comparator = (val1: T, val2: T): boolean => val1 === val2): boolean => {
  const idx = array.findIndex(entry => comparator(entry, oldEntry));
  if (idx !== -1) {
    runInAction(() => { array[idx] = newEntry });
    return true;
  }
  return false;
};

export const deleteEntry = <T>(array: T[], entryToDelete: T, comparator = (val1: T, val2: T): boolean => val1 === val2): boolean => {
  const idx = array.findIndex(entry => comparator(entry, entryToDelete));
  if (idx !== -1) {
    runInAction(() => array.splice(idx, 1));
    return true;
  }
  return false;
};

export const compareLabelFn = (a: { label: string }, b: { label: string }): number => a.label.localeCompare(b.label);

/**
 * Create and download a file using data URI
 * See http://stackoverflow.com/questions/283956
 */
export const downloadFile = (fileName: string, content: string, contentType: ContentType): void => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  if (typeof link.download === 'string') {
    document.body.appendChild(link); // Firefox requires the link to be in the body
    link.download = fileName;
    link.href = url;
    link.click();
    document.body.removeChild(link); // remove the link when done
  } else {
    location.replace(url);
  }
};

export const getNullableFirstElement = <T>(array: T[]): T | undefined => array.length ? array[0] : undefined;
