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

import {
  clone,
  cloneDeep as deepClone,
  isEqual as deepEqual,
  findLast,
  isEmpty,
  pickBy,
  uniqBy,
  uniq,
  debounce,
  throttle,
  mergeWith,
  toNumber,
  type DebouncedFunc,
  isObject,
} from 'lodash-es';
import { diff as deepDiff } from 'deep-object-diff';
import { UnsupportedOperationError } from './error/ErrorUtils.js';
import { format as prettyPrintObject } from 'pretty-format';
import { assertTrue, guaranteeNonNullable } from './error/AssertionUtils.js';

// NOTE: We re-export lodash utilities like this so we centralize utility usage in our app
// in case we want to swap out the implementation
export {
  clone,
  deepClone,
  deepEqual,
  deepDiff,
  findLast,
  isEmpty,
  pickBy,
  uniqBy,
  uniq,
  debounce,
  throttle,
  type DebouncedFunc,
};

// NOTE: we can use the `rng` option in UUID V4 to control the random seed during testing
// See https://github.com/uuidjs/uuid#version-4-random
export { v4 as uuid } from 'uuid';

/**
 * This is a dummy type that acts as a signal to say the type should be plain object with shape rather than prototype object of type
 * NOTE: This is useful in network client interface where we enforce that the input and output for the network call must be plain object,
 * so as to force proper handling (i.e. deserialize/serialize) but also signal from documentation perspective about the type/shape of the plain object
 */
export type PlainObject<T = unknown> = Record<PropertyKey, unknown>; // eslint-disable-line @typescript-eslint/no-unused-vars

/**
 * This type allows modification of `readonly` attributes for class/interface
 * This is useful to set properties like `owner`, `parent` where we can't do so in the constructors
 *
 * See https://stackoverflow.com/questions/46634876/how-can-i-change-a-readonly-property-in-typescript
 */
export type Writable<T> = { -readonly [K in keyof T]: T[K] };

// Since the right side of `instanceof` is an expression evaluating to a constructor function (ie. a class), not a type, so we have to make it
// as such, this is similar to type definition of Clazz in `serializer` and we take it out here because we want to refer to it in many places
// Note that this will not work for abstract class and we will have to revert to use `instanceof`.
// See https://github.com/Microsoft/TypeScript/issues/5236
// See https://github.com/microsoft/TypeScript/issues/5843

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Clazz<T> = { new (...args: any[]): T };
/**
 * As mentioned above for `Clazz<T>`, there is no good way to represent abstract class so
 * we will use `Function` in this case, this is a very loose check and will lose some benefit of type checking
 * during compile time, so refrain from using it extensively
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
export type GenericClazz<T> = { new (...args: any[]): T } | Function;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SuperGenericFunction = (...args: any) => any;
export const getClass = <T>(obj: object): Clazz<T> =>
  obj.constructor as Clazz<T>;

export const getSuperclass = <V>(
  _class: GenericClazz<unknown>,
): GenericClazz<V> | undefined => {
  if (!_class.name) {
    throw new UnsupportedOperationError(
      `Cannot get superclass for non user-defined classes`,
    );
  }
  // eslint-disable-next-line @typescript-eslint/ban-types
  const superclass = Object.getPrototypeOf(_class) as Function | null;
  /**
   * When it comes to inheritance, JavaScript only has one construct: objects.
   * Each object has a private property which holds a link to another object called its prototype.
   * That prototype object has a prototype of its own, and so on until an object is reached
   * with null as its prototype. By definition, null has no prototype,
   * and acts as the final link in this prototype chain.
   *
   * NOTE: when the prototype name is `empty` we know it's not user-defined classes, so we can return undefined
   */
  return superclass?.name ? (superclass as GenericClazz<V>) : undefined;
};

/**
 * Check if the specified class is either the same as, or is a superclass of the provided class.
 */
export const isClassAssignableFrom = (
  cls1: GenericClazz<unknown>,
  cls2: GenericClazz<unknown>,
): boolean => {
  let currentPrototype: GenericClazz<unknown> | undefined = cls2;
  while (currentPrototype) {
    if (currentPrototype === cls1) {
      return true;
    }
    currentPrototype = getSuperclass(currentPrototype);
  }
  return false;
};

export const noop = (): (() => void) => (): void => {
  /* do nothing */
};

/**
 * Recursively omit keys from an object
 */
export const recursiveOmit = <T extends object>(
  obj: T,
  /**
   * Checker function which returns `true` if the object field should be omit
   */
  checker: (object: object, propKey: PropertyKey) => boolean,
): T => {
  const newObj = deepClone(obj);
  const omit = (
    _obj: object,
    _checker: (object: object, propKey: string) => boolean,
  ): void => {
    if (Array.isArray(_obj)) {
      _obj.forEach((o) => omit(o, _checker));
    } else {
      const o = _obj as PlainObject;
      for (const propKey in o) {
        if (Object.prototype.hasOwnProperty.call(_obj, propKey)) {
          const value = o[propKey];
          if (_checker(_obj, propKey)) {
            delete o[propKey];
          } else if (isObject(value)) {
            omit(value, _checker);
          }
        }
      }
    }
  };
  omit(newObj, checker);
  return newObj;
};

/**
 * Recursively remove fields with undefined values in object
 */
export const pruneObject = (obj: PlainObject): PlainObject =>
  pickBy(obj, (val: unknown): boolean => val !== undefined) as PlainObject;

/**
 * Recursively remove fields with null values in object
 *
 * This is particularly useful in serialization, especially when handling response
 * coming from servers where `null` are returned for missing fields. We would like to
 * treat them as `undefined` instead, so we want to strip all the `null` values from the
 * plain JSON object.
 */
export const pruneNullValues = (obj: PlainObject): PlainObject =>
  pickBy(obj, (val: unknown): boolean => val !== null) as PlainObject;

/**
 * Recursively sort object keys alphabetically
 */
export const sortObjectKeys = (value: PlainObject): PlainObject => {
  const _sort = (obj: unknown): unknown => {
    if (Array.isArray(obj)) {
      return obj.map(sortObjectKeys);
    } else if (typeof obj === 'object' && obj !== null) {
      const oldObj = obj as PlainObject;
      const newObj: PlainObject = {};
      Object.keys(oldObj)
        .sort((a, b) => a.localeCompare(b))
        .forEach((key) => {
          newObj[key] = _sort(oldObj[key]);
        });
      return newObj;
    }
    return obj;
  };
  return _sort(value) as PlainObject;
};

export const parseNumber = (val: string): number => {
  const num = toNumber(val);
  if (isNaN(num)) {
    throw new Error(`Can't parse number '${val}'`);
  }
  return num;
};

/**
 * Stringify object shallowly
 * See https://stackoverflow.com/questions/16466220/limit-json-stringification-depth
 */
export const shallowStringify = (object: unknown): string =>
  JSON.stringify(object, (key, val) =>
    key && val && typeof val !== 'number'
      ? Array.isArray(val)
        ? '[object Array]'
        : `${val}`
      : val,
  );

export const generateEnumerableNameFromToken = (
  existingNames: string[],
  token: string,
): string => {
  if (!token.match(/^[\w_-]+$/)) {
    throw new Error(
      `Token must only contain digits, letters, or special characters _ and -`,
    );
  }
  const maxCounter = existingNames
    .map((name) => {
      const matchingCount = name.match(new RegExp(`^${token}_(?<count>\\d+)$`));
      return matchingCount?.groups?.count
        ? parseInt(matchingCount.groups.count, 10)
        : 0;
    })
    .reduce((max, num) => Math.max(max, num), 0);
  return `${token}_${maxCounter + 1}`;
};

/**
 * NOTE: These are small helpers to workaround Typescript strictness check with the flag --noUncheckedIndexedAccess enabled
 */
export const getNullableFirstEntry = <T>(array: T[]): T | undefined =>
  array.length ? array[0] : undefined;
export const getNullableLastEntry = <T>(array: T[]): T | undefined =>
  array.length ? array[array.length - 1] : undefined;
export const getNullableEntry = <T>(array: T[], idx: number): T | undefined => {
  if (idx < 0 || idx >= array.length) {
    return undefined;
  }
  return array.length > idx ? array[idx] : undefined;
};
export const getNonNullableEntry = <T>(
  array: T[],
  idx: number,
  message?: string | undefined,
): T => {
  assertTrue(0 <= idx && idx < array.length, `Index out of bound: ${idx}`);
  return guaranteeNonNullable(array[idx], message);
};

/**
 * NOTE: This object mutates the input object (obj1)
 * To disable this behavior, set `createClone=true`
 */
export const mergeObjects = <T, V>(
  obj1: T,
  obj2: V,
  createClone: boolean,
): T & V =>
  mergeWith(
    createClone ? deepClone(obj1) : obj1,
    obj2,
    (o1: object, o2: object): object | undefined => {
      if (Array.isArray(o1)) {
        return o1.concat(o2);
      }
      return undefined;
    },
  );

export const promisify = <T>(func: () => T): Promise<T> =>
  new Promise<T>((resolve, reject) =>
    setTimeout(() => {
      try {
        resolve(func());
      } catch (error) {
        reject(error);
      }
    }, 0),
  );

export const addUniqueEntry = <T>(
  array: T[],
  newEntry: T,
  comparator = (val1: T, val2: T): boolean => val1 === val2,
): boolean => {
  if (!array.find((entry) => comparator(entry, newEntry))) {
    array.push(newEntry);
    return true;
  }
  return false;
};

export const changeEntry = <T>(
  array: T[],
  oldEntry: T,
  newEntry: T,
  comparator = (val1: T, val2: T): boolean => val1 === val2,
): boolean => {
  const idx = array.findIndex((entry) => comparator(entry, oldEntry));
  if (idx !== -1) {
    array[idx] = newEntry;
    return true;
  }
  return false;
};

export const swapEntry = <T>(
  array: T[],
  entryOne: T,
  entryTwo: T,
  comparator = (val1: T, val2: T): boolean => val1 === val2,
): boolean => {
  const idxX = array.findIndex((entry) => comparator(entry, entryOne));
  const idxY = array.findIndex((entry) => comparator(entry, entryTwo));

  if (idxX !== -1 && idxY !== -1) {
    array[idxX] = entryTwo;
    array[idxY] = entryOne;
    return true;
  }
  return false;
};

export const deleteEntry = <T>(
  array: T[],
  entryToDelete: T,
  comparator = (val1: T, val2: T): boolean => val1 === val2,
): boolean => {
  const idx = array.findIndex((entry) => comparator(entry, entryToDelete));
  if (idx !== -1) {
    array.splice(idx, 1);
    return true;
  }
  return false;
};

export type GeneratorFn<T> = Generator<
  Promise<unknown>, // force to manually handle casting for any promise called within the generator function
  T
>;

export const printObject = (
  value: unknown,
  options?: {
    deep?: boolean;
  },
): string => {
  const opts = pruneObject({
    printFunctionName: false,
    maxDepth: options?.deep ? undefined : 1,
  });
  const text = prettyPrintObject(value, opts);

  return (
    text
      // We do these replacements because when we do this for production and the class name is minified,
      // we'd better show `[Object]` instead.
      .replace(/.*\s\{/g, '{')
      .replace(/\[.*\]/g, (val) =>
        ['[Array]', '[Function]'].includes(val) ? val : '[Object]',
      )
  );
};

export const hasWhiteSpace = (val: string): boolean => Boolean(val.match(/\s/));
