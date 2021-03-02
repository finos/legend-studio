/**
 * Copyright 2020 Goldman Sachs
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

import { cloneDeep as deepClone, mergeWith, pickBy } from 'lodash-es';
import { UnsupportedOperationError } from './ErrorUtils';

// NOTE: We re-export lodash utilities like this so we centralize utility usage in our app
// in case we want to swap out the implementation
export {
  cloneDeep as deepClone,
  isEqual as deepEqual,
  findLast,
  isEmpty,
  pickBy,
  uniqBy,
  uniq,
  debounce,
  throttle,
} from 'lodash-es';

// NOTE: we can use the `rng` option in UUID V4 to control the random seed during testing
// See https://github.com/uuidjs/uuid#version-4-random
export { v4 as uuid } from 'uuid';

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GenericClazz<T> = { new (...args: any[]): T } | Function;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SuperGenericFunction = (...args: any) => any;
export const getClass = <T>(obj: object): Clazz<T> =>
  obj.constructor as Clazz<T>;

export const getSuperClass = <V>(
  _class: GenericClazz<unknown>,
): GenericClazz<V> | undefined => {
  if (!_class.name) {
    throw new UnsupportedOperationError(
      `Cannot get super class for non user-defined classes`,
    );
  }
  const superClass = Object.getPrototypeOf(_class) as Function | null;
  /**
   * When it comes to inheritance, JavaScript only has one construct: objects.
   * Each object has a private property which holds a link to another object called its prototype.
   * That prototype object has a prototype of its own, and so on until an object is reached
   * with null as its prototype. By definition, null has no prototype,
   * and acts as the final link in this prototype chain.
   *
   * NOTE: when the prototype name is `empty` we know it's not user-defined classes, so we can return undefined
   */
  return superClass?.name ? (superClass as GenericClazz<V>) : undefined;
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
    currentPrototype = getSuperClass(currentPrototype);
  }
  return false;
};

export const noop = (): (() => void) => (): void => {
  /* do nothing */
};

/**
 * Recursively omit keys from an object
 */
export const recursiveOmit = (
  obj: Record<PropertyKey, unknown>,
  keysToRemove: string[],
): Record<PropertyKey, unknown> => {
  const newObj = deepClone(obj);
  const omit = (
    _obj: Record<PropertyKey, unknown>,
    _keysToRemove: string[],
  ): void => {
    for (const prop in _obj) {
      if (Object.prototype.hasOwnProperty.call(_obj, prop)) {
        const value = _obj[prop] as Record<PropertyKey, unknown>;
        if (_keysToRemove.includes(prop)) {
          delete _obj[prop];
        } else if (typeof value === 'object') {
          omit(value, _keysToRemove);
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
export const pruneObject = (
  obj: Record<PropertyKey, unknown>,
): Record<PropertyKey, unknown> =>
  pickBy(obj, (val: unknown): boolean => val !== undefined);

// Stringify object shallowly
// See https://stackoverflow.com/questions/16466220/limit-json-stringification-depth
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
      'Token must only contain any digits, letters, or special characters _ and -',
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

export const compareLabelFn = (
  a: { label: string },
  b: { label: string },
): number => a.label.localeCompare(b.label);

export const getNullableFirstElement = <T>(array: T[]): T | undefined =>
  array.length ? array[0] : undefined;

/**
 * This is a dummy type that acts as a signal to say the type should be plain object with shape rather than prototype object of type
 * NOTE: This is useful in network client interface where we enforce that the input and output for the network call must be plain object,
 * so as to force proper handling (i.e. deserialize/serialize) but also signal from documentation perspective about the type/shape of the plain object
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type PlainObject<T> = Record<PropertyKey, unknown>;

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
      } catch (error: unknown) {
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
  T,
  unknown
>;
