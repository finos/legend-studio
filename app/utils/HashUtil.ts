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

import hash from 'hash.js';
import objectHash from 'object-hash';
import { SOURCE_INFORMATION_KEY } from 'MetaModelConst';
import { Hashable } from 'MetaModelUtility';
import { Clazz } from './GeneralUtil';

export const hashString = (val: string): string => hash.sha1().update(val).digest('hex');

export const hashArray = (arr: (string | Hashable)[]): string => hashString(
  arr.map(val => typeof val === 'string' ? hashString(val) : val.hashCode).join(',')
);

export const hashLambda = (parameters: object | undefined, body: object | undefined): string => hashArray([
  parameters ? objectHash(parameters, { excludeKeys: (key: string) => key === SOURCE_INFORMATION_KEY }) : '',
  body ? objectHash(body, { excludeKeys: (key: string) => key === SOURCE_INFORMATION_KEY }) : '',
]);

export const hashObject = objectHash;

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
export const debugHash = (obj: Hashable, typesToExpand: Clazz<Hashable>[], depth = 0): string => {
  let res = depth !== 0 ? `${obj.hashCode}` : '';
  res += ` {\n`;
  Object.entries(obj)
    .filter(([key, value]) => typeof value === 'object'
      && (!Array.isArray(value) || (value.length !== 0 && value.every(v => typesToExpand.some(typeToExpand => v instanceof typeToExpand))))
      && (Array.isArray(value) || typesToExpand.some(typeToExpand => value instanceof typeToExpand))
    )
    .forEach(([key, value]) => {
      res += `${'  '.repeat(depth + 1)}${key}: ${Array.isArray(value)
        ? !value.length ? '[]' : `[\n${'  '.repeat(depth + 2)}${value.map((val, idx) => `${idx}: ${debugHash(val, typesToExpand, depth + 2)}`).join(`\n${'  '.repeat(depth + 2)}`)}\n${'  '.repeat(depth + 1)}]`
        : debugHash(value, typesToExpand, depth + 1)}\n`;
    });
  res += `${'  '.repeat(depth)}}`;
  return res;
};
