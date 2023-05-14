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

import hash from 'hash.js';
import {
  default as objectHash,
  type NormalOption as HashObjectOption,
} from 'object-hash';
import {
  assertTrue,
  isObject,
  isBoolean,
  isNumber,
  isString,
  isNonNullable,
} from '../error/AssertionUtils.js';
import type { Clazz, PlainObject } from '../CommonUtils.js';

/**
 * NOTE: despite the push to adopt visitor pattern across the code-base, hashing implementation for now will remain within
 * the owner class instead of being moved to an outside visitor for the following reasons:
 * 1. Hashing of sub-structures should be cached (using mobx @computed) and hence we would have to do something like:
 * ```ts
 *  get hashCode(): string { return this.accept(new HashVisitor()) }
 *  get hashCode(): string { return hashSubElement(this) } // for sub-structures without an `accept` method
 * ```
 * 2. On the other hand, we cannot remove `get hashCode` from sub-structure such as `Tag` or `Stereotype` because we want
 *    to cache these, regardless of how we compute hash for bigger structure like `Class` or `Enumeration`.
 *    The whole point of the visitor pattern is to avoid the exploring sub-structures in a structure, i.e. we should only
 *    care about the `hashCode` of a class or an enumeration and trickle down those structure in the visitor; and we can do
 *    that, but then we would still need to call `hashCode` for each sub-structure to make use of the cache instead of
 *    recompute them on the spot.
 * 3. A huge benefit of visitor pattern is to collocate the hashing logic in one place to reduce look-up time, but if we
 *    use `.hashCode` for sub-structures, visitor pattern will actually mean more look-ups.
 * 4. Also because of caching, certain really simple sub-structure would seem overkill to have hashing logic in a visitor:
 * ```ts
 * class AbstractSomething {
 *   get hashCode(): string { return hashArray(['abstract-something', ...<and some other simple things>... ]) }
 * }
 * ```
 * 5. It's not too bad to have hashing logic coupled with the structure it's trying to hash
 *    (e.g. `hashCode` and `equals` in Java)
 */
export interface Hashable {
  hashCode: string;
}

export const hashValue = (val: string | boolean | number): string =>
  hash.sha1().update(val).digest('hex');
export const hashUnknownValue = (val: unknown): string => {
  assertTrue(
    isString(val) || isBoolean(val) || isNumber(val),
    `Can't hash non-primitive value`,
  );
  return hashValue(val as string | boolean | number);
};

export const hashArray = (
  arr: (string | boolean | number | Hashable | undefined | null)[],
): string =>
  hashValue(
    arr
      .filter(isNonNullable)
      .map((val) =>
        typeof val === 'string' ||
        typeof val === 'boolean' ||
        typeof val === 'number'
          ? hashValue(val)
          : val.hashCode,
      )
      .join(','),
  );

/**
 * NOTE: `node-object-hash` seems to be the much more efficient library. But it's based on Node's `crypto` module
 * which is not supported in browser (so we have map `crypto` module to `crypto-browserify` or `crypto-js`).
 * If this object-hashing becomes the performance bottle-neck, we should think about adopting this hashing library
 * See https://www.npmjs.com/package/node-object-hash
 */
export const hashObject = (
  value: unknown,
  options?: HashObjectOption,
): string => {
  assertTrue(isObject(value), `Can't hash non-object value`);
  return objectHash(value as PlainObject, options);
};

/**
 * This method can be used to debug hashing.
 *
 * We have tried to come up with a more robust way to debug hash, such as to construct the hash tree, but that's not
 * quite feasible for the following reasons:
 * 1. Since sometimes there are properties we don't drill down like for a class, we just take the path, we don't have
 *    a systematic way to construct the hash tree, so we have to rely on the implementation of the hashCode function
 *    in each element, which defeats the purpose of having a generic approach for debugging hash
 * 2. If we ignore the implementation detail of `get hashCode` and expand the property if it has `hashCode` then we
 *    might risk getting into an infinite loop
 * 3. The manual way to come up with the `get hashCode` is in order to reconcile the differences between metamodels and
 *    protocol models. If we only compare metamodels to protocol models for example, the problem might be less complicated,
 *    but we're dealing with 2 hash systems (in a way)
 * 4. As such, the best solution at the moment is to come up with a function like this
 *    to debug hash where we can put it at a top level structure like `Mapping` and then choose which part of the hash
 *    we would like to `explore`
 *
 * @param typesToExpand when we trickle down the object properties, we want to drill down so we want to choose
 *                      the property to drill down (by its type) since sometimes we don't need to compute the
 *                      actual hash code for the property (for example: a class, or an enumeration) while computing
 *                      the hash, just their path.
 */
export const debugHash = (
  obj: Hashable,
  typesToExpand: Clazz<Hashable>[],
  depth = 0,
): string => {
  let res = depth !== 0 ? `${obj.hashCode}` : '';
  res += ` {\n`;
  Object.entries(obj)
    .filter(
      ([key, value]) =>
        typeof value === 'object' &&
        (!Array.isArray(value) ||
          (value.length !== 0 &&
            value.every((v) =>
              typesToExpand.some((typeToExpand) => v instanceof typeToExpand),
            ))) &&
        (Array.isArray(value) ||
          typesToExpand.some((typeToExpand) => value instanceof typeToExpand)),
    )
    .forEach(([key, value]) => {
      res += `${'  '.repeat(depth + 1)}${key}: ${
        Array.isArray(value)
          ? !value.length
            ? '[]'
            : `[\n${'  '.repeat(depth + 2)}${value
                .map(
                  (val, idx) =>
                    `${idx}: ${debugHash(val, typesToExpand, depth + 2)}`,
                )
                .join(`\n${'  '.repeat(depth + 2)}`)}\n${'  '.repeat(
                depth + 1,
              )}]`
          : debugHash(value, typesToExpand, depth + 1)
      }\n`;
    });
  res += `${'  '.repeat(depth)}}`;
  return res;
};
