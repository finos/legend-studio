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

import { ENTITY_PATH_DELIMITER } from 'MetaModelConst';
import { findLast, guaranteeNonNullable, EnrichedError } from 'Utilities/GeneralUtil';

export class GraphError extends EnrichedError {
  constructor(error: string | Error | undefined, message?: string) {
    super('Graph Error', error, message);
  }
}

export class GraphDataParserError extends EnrichedError {
  constructor(error: string | Error | undefined, message?: string) {
    super('Graph Data Parser Error', error, message);
  }
}

export class DependencyGraphProcessingError extends EnrichedError {
  constructor(error: string | Error | undefined, message?: string) {
    super('Dependency Graph Processing Error', error, message);
  }
}

export class SystemGraphProcessingError extends EnrichedError {
  constructor(error: string | Error | undefined, message?: string) {
    super('System Graph Processing Error', error, message);
  }
}

export const fromElementPathToMappingElementId = (className: string): string => className.split(ENTITY_PATH_DELIMITER).join('_');
export const extractElementNameFromPath = (fullPath: string): string => guaranteeNonNullable(findLast(fullPath.split(ENTITY_PATH_DELIMITER)));

export const resolvePackageNameAndElementName = (defaultPath: string, path: string): [string, string] => {
  const index = path.lastIndexOf(ENTITY_PATH_DELIMITER);
  const elementName = index === -1 ? path : path.substring(index + 2, path.length);
  const packageName = index === -1 ? defaultPath : path.substring(0, index);
  return [packageName, elementName];
};

export const isValidFullPath = (fullPath: string): boolean => fullPath.split(ENTITY_PATH_DELIMITER).filter(Boolean).length > 1;

/**
 * NOTE: despite the push to adopt visitor pattern across the code-base, hashing implementation for now will remain within
 * the owner class instead of being moved to an outside visitor for the following reasons:
 * 1. Hashing of sub-structures should be cached (using mobx's @computed) and hence we would have to do something like:
 *    @computed get hashCode(): string { return this.accept(new HashVisitor()) }
 *    @computed get hashCode(): string { return hashSubElement(this) } // for sub-structures without an `accept` method
 * 2. On the other hand, we cannot remove `get hashCode` from sub-structure such as `Tag` or `Stereotype` because we want
 *    to cache these, regardless of how we compute hash for bigger structure like classes or enumerations.
 *    The whole point of the visitor pattern is to avoid the exploring sub-structures in a structure, i.e. we should only
 *    care about the `hashCode` of a class or an enumeration and trickle down those structure in the visitor; and we can do
 *    that, but then we would still need to call `hashCode` for each sub-structure to make use of the cache instead of
 *    recompute them on the spot.
 * 3 .A huge benefit of visitor pattern is to collocate the hashing logic in one place to reduce look-up time, but if we
 *    use `.hashCode` for sub-structures, visitor pattern will actually mean more look-ups.
 * 4. Also because of caching, certain really simple sub-structure would seem overkill to have hashing logic in a visitor:
 *    class AbstractSomething {
 *      @computed get hashCode(): string { return hashArray(['abstract-something', ...<and some other simple things>... ]) }
 *    }
 * 5. It's not too bad to have hashing logic coupled with the structure it's trying to hash
 *    (e.g. `hashCode` and `equals` in Java)
 */
export interface Hashable {
  hashCode: string;
}
