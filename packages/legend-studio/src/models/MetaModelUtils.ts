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
  SOURCE_INFORMATION_KEY,
  ELEMENT_PATH_DELIMITER,
} from './MetaModelConst';
import {
  EnrichedError,
  findLast,
  guaranteeNonNullable,
  hashArray,
  hashObject,
} from '@finos/legend-studio-shared';

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

export const extractElementNameFromPath = (fullPath: string): string =>
  guaranteeNonNullable(findLast(fullPath.split(ELEMENT_PATH_DELIMITER)));

export const matchFunctionName = (
  functionName: string,
  functionFullPath: string,
): boolean =>
  functionName === functionFullPath ||
  extractElementNameFromPath(functionFullPath) === functionName;

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

export const isValidFullPath = (fullPath: string): boolean =>
  fullPath.split(ELEMENT_PATH_DELIMITER).filter(Boolean).length > 1;

// TODO: this is over-simplification as there could be other fields used for source information
export const hashObjectWithoutSourceInformation = (val: object): string =>
  hashObject(val, {
    excludeKeys: (key: string) => key === SOURCE_INFORMATION_KEY,
  });

export const fromElementPathToMappingElementId = (className: string): string =>
  className.split(ELEMENT_PATH_DELIMITER).join('_');

export const hashLambda = (
  parameters: object | undefined,
  body: object | undefined,
): string =>
  hashArray([
    parameters ? hashObjectWithoutSourceInformation(parameters) : '',
    body ? hashObjectWithoutSourceInformation(body) : '',
  ]);
