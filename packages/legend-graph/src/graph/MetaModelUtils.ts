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

/**
 * NOTE: this file holds the most basic utilties to deal with the graph and
 * metamodels. Any methods which requires importing some metamodel or graph
 * are meant to be put into helpers method, e.g. `DomainHelper`.
 *
 * This is to avoid circular dependencies and also to keep things in the
 * right layer
 */

import type { PackageableElement } from './metamodel/pure/packageableElements/PackageableElement.js';
import {
  CORE_PURE_PATH,
  ELEMENT_PATH_DELIMITER,
  SOURCE_INFORMATION_PROPERTY_KEY_SUFFIX,
} from './MetaModelConst.js';
import {
  findLast,
  guaranteeNonNullable,
  isString,
  recursiveOmit,
} from '@finos/legend-shared';

export const extractElementNameFromPath = (fullPath: string): string =>
  guaranteeNonNullable(findLast(fullPath.split(ELEMENT_PATH_DELIMITER)));

export const extractPackagePathFromPath = (
  fullPath: string,
): string | undefined => {
  const idx = fullPath.lastIndexOf(ELEMENT_PATH_DELIMITER);
  return idx === -1 ? undefined : fullPath.substring(0, idx);
};

export const isValidIdentifier = (
  input: string,
  allowDollarSymbol?: boolean,
): boolean =>
  allowDollarSymbol
    ? Boolean(input.match(/^[a-z][\w\d$]*$/))
    : Boolean(input.match(/^[a-z][\w\d]*$/));

export const matchFunctionName = (
  functionName: string,
  functionFullPaths: string | string[],
): boolean =>
  Array.isArray(functionFullPaths)
    ? functionFullPaths.some((functionFullPath) =>
        matchFunctionName(functionName, functionFullPath),
      )
    : functionName === functionFullPaths ||
      extractElementNameFromPath(functionFullPaths) === functionName;

/**
 * This method concatenate 2 fully-qualified elementh paths to form a single one
 * and then extracts the name and package part from it.
 */
export const resolvePackagePathAndElementName = (
  path: string,
  defaultPath?: string,
): [string, string] => {
  const index = path.lastIndexOf(ELEMENT_PATH_DELIMITER);
  if (index === -1) {
    return [defaultPath ?? '', path];
  }
  return [
    path.substring(0, index),
    path.substring(index + ELEMENT_PATH_DELIMITER.length, path.length),
  ];
};

export const buildPath = (
  packagePath: string | undefined,
  name: string | undefined,
): string =>
  `${guaranteeNonNullable(
    packagePath,
    'Package path is required',
  )}${ELEMENT_PATH_DELIMITER}${guaranteeNonNullable(name, 'Name is required')}`;
export const createPath = (packagePath: string, name: string): string =>
  `${packagePath ? `${packagePath}${ELEMENT_PATH_DELIMITER}` : ''}${name}`;
// TODO: we might need to support quoted identifier in the future
export const isValidPathIdentifier = (val: string): boolean =>
  Boolean(val.match(/^\w[\w$_-]*$/));
export const isValidFullPath = (fullPath: string): boolean =>
  Boolean(fullPath.match(/^(?:\w[\w$_-]*)(?:::\w[\w$_-]*)+$/));
export const isValidPath = (path: string): boolean =>
  Boolean(path.match(/^(?:\w[\w$_-]*)(?:::\w[\w$_-]*)*$/));

export const fromElementPathToMappingElementId = (className: string): string =>
  className.split(ELEMENT_PATH_DELIMITER).join('_');

/**
 * Prune source information from object such as raw lambda, raw value specification, etc.
 *
 * NOTE: currently, there is no exhaustive way to do this. Majority of the cases, the source information field
 * is suffixed with `sourceInformation` (e.g. `profileSourceInformation`, `propertyTypeSourceInformation`),
 * however, we have sometimes deviated from this pattern in our protocol model, so we have fields like `classSourceInformation`,
 * etc. So this is really an optimistic, non-exhaustive prune.
 *
 * To do this exhaustively, we need to tweak this method to also check for the structure of the (sub)object to make sure
 * it is structually equivalent to the shape of source information to prune it. However, this is computationally expensive.
 *
 * NOTE: That aside, We should cleanup these in the backend and use pointer instead so source information is coupled
 * with the value instead of having custom-name source information fields like these, polluting the protocol models.
 */
export const pruneSourceInformation = <T extends object>(object: T): T =>
  recursiveOmit(
    object,
    (obj, propKey) =>
      isString(propKey) &&
      propKey
        .toLowerCase()
        .endsWith(SOURCE_INFORMATION_PROPERTY_KEY_SUFFIX.toLowerCase()),
  );

export const TYPE_ARGUMENTS_TYPES: string[] = [CORE_PURE_PATH.RELATION];

export const requireTypeArugments = (type: PackageableElement): boolean => {
  return TYPE_ARGUMENTS_TYPES.includes(type.path);
};
