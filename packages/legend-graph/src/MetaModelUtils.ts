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

import {
  SOURCE_INFORMATION_KEY,
  ELEMENT_PATH_DELIMITER,
  CORE_HASH_STRUCTURE,
  MULTIPLICITY_INFINITE,
} from './MetaModelConst';
import {
  findLast,
  guaranteeNonNullable,
  hashArray,
  hashObject,
  hashString,
  recursiveOmit,
} from '@finos/legend-shared';
import type { Multiplicity } from './models/metamodels/pure/packageableElements/domain/Multiplicity';

export const extractElementNameFromPath = (fullPath: string): string =>
  guaranteeNonNullable(findLast(fullPath.split(ELEMENT_PATH_DELIMITER)));

export const matchFunctionName = (
  functionName: string,
  functionFullPath: string,
): boolean =>
  functionName === functionFullPath ||
  extractElementNameFromPath(functionFullPath) === functionName;

export const getMultiplicityDescription = (
  multiplicity: Multiplicity,
): string => {
  if (multiplicity.lowerBound === multiplicity.upperBound) {
    return `[${multiplicity.lowerBound.toString()}] - Must have exactly ${multiplicity.lowerBound.toString()} value(s)`;
  } else if (
    multiplicity.lowerBound === 0 &&
    multiplicity.upperBound === undefined
  ) {
    return `[${MULTIPLICITY_INFINITE}] - May have many values`;
  }
  return `[${multiplicity.lowerBound}..${
    multiplicity.upperBound ?? MULTIPLICITY_INFINITE
  }] - ${
    multiplicity.upperBound
      ? `Must have from ${multiplicity.lowerBound} to ${multiplicity.upperBound} value(s)`
      : `Must have at least ${multiplicity.lowerBound} values(s)`
  }`;
};

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
 * is named `sourceInformation`, however, we have sometimes deviated from this pattern in our protocol model,
 * so we have fields like `classSourceInformation`, etc. So this is really an optimistic, non-exhaustive prune.
 * To do this exhaustively, we might need to make use of engine grammar API endpoints or do a full roundtrip
 * raw object-protocol transformation to prune unrecognized fields, which include source information fields.
 */
export const pruneSourceInformation = (
  object: Record<PropertyKey, unknown>,
): Record<PropertyKey, unknown> =>
  recursiveOmit(object, [SOURCE_INFORMATION_KEY]);

// -------------------------------- HASHING -------------------------------------
// TODO: this should be moved after we refactor `hashing` out of metamodels

// NOTE: this is over-simplification as there could be source information fields with other names
export const hashObjectWithoutSourceInformation = (val: object): string =>
  hashObject(val, {
    excludeKeys: (key: string) => key === SOURCE_INFORMATION_KEY,
  });

export const hashRawLambda = (
  parameters: object | undefined,
  body: object | undefined,
): string =>
  hashArray([
    parameters ? hashObjectWithoutSourceInformation(parameters) : '',
    body ? hashObjectWithoutSourceInformation(body) : '',
  ]);

export const hashElementPointer = (pointerType: string, path: string): string =>
  [CORE_HASH_STRUCTURE.PACKAGEABLE_ELEMENT_POINTER, pointerType, path]
    .map(hashString)
    .join(',');
