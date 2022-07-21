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

import { isNonNullable } from '@finos/legend-shared';
import type { PureModel } from '../graph/PureModel.js';
import type { PureGraphManagerPlugin } from '../graphManager/PureGraphManagerPlugin.js';
import { ELEMENT_PATH_DELIMITER } from '../MetaModelConst.js';
import { ConcreteFunctionDefinition } from '../models/metamodels/pure/packageableElements/domain/ConcreteFunctionDefinition.js';
import { PackageableElement } from '../models/metamodels/pure/packageableElements/PackageableElement.js';
import type { Testable } from '../models/metamodels/pure/test/Testable.js';
import { getFunctionSignature } from './DomainHelper.js';

export const DEFAULT_TEST_SUITE_PREFIX = 'testSuite';
export const DEFAULT_TEST_PREFIX = 'test';
export const DEFAULT_TEST_ASSERTION_PREFIX = 'assertion';

const getFullFunctionPath = (element: ConcreteFunctionDefinition): string => {
  if (!element.package) {
    return element.name;
  }
  const parentPackagePath = element.package.path;
  const res = !parentPackagePath
    ? getFunctionSignature(element)
    : `${parentPackagePath}${ELEMENT_PATH_DELIMITER}${getFunctionSignature(element)}`;
  return res;
};

export const getNullableTestable = (
  id: string,
  graph: PureModel,
  plugins: PureGraphManagerPlugin[],
): Testable | undefined => graph.allOwnTestables.find(
      (e) =>
        (e instanceof PackageableElement && e.path === id) ||
        (e instanceof ConcreteFunctionDefinition &&
          getFullFunctionPath(e) === id),
    ) ??
    plugins
      .flatMap((plugin) => plugin.getExtraTestableFinders?.() ?? [])
      .map((getter) => getter(id, graph))
      .filter(isNonNullable)[0];

export const getNullableIDFromTestable = (
  testable: Testable,
  graph: PureModel,
  plugins: PureGraphManagerPlugin[],
): string | undefined => {
  if (testable instanceof PackageableElement) {
    if (testable instanceof ConcreteFunctionDefinition) {
      return getFullFunctionPath(testable);
    } else {
      return testable.path;
    }
  }
  return plugins
    .flatMap((plugin) => plugin.getExtraTestableIDBuilders?.() ?? [])
    .map((getter) => getter(testable, graph))
    .filter(isNonNullable)[0];
};
