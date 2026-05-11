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
import type { PureModel } from '../../graph/PureModel.js';
import type { PureGraphManagerPlugin } from '../PureGraphManagerPlugin.js';
import { PackageableElement } from '../../graph/metamodel/pure/packageableElements/PackageableElement.js';
import { DataProduct } from '../../graph/metamodel/pure/dataProduct/DataProduct.js';
import type { Testable } from '../../graph/metamodel/pure/test/Testable.js';
import type { Testable_PureGraphManagerPlugin_Extension } from '../extensions/Testable_PureGraphManagerPlugin_Extension.js';

export const DEFAULT_TEST_SUITE_PREFIX = 'testSuite';
export const DEFAULT_TEST_PREFIX = 'test';
export const DEFAULT_TEST_ASSERTION_PREFIX = 'assertion';

export const getNullableTestable = (
  id: string,
  graph: PureModel,
  plugins: PureGraphManagerPlugin[],
): Testable | undefined =>
  // TODO: REMOVE functions once function test runner has been completed in backend
  // ...this.ownFunctions,
  [...graph.ownTestables, ...graph.ownFunctions].find(
    (e) => e instanceof PackageableElement && e.path === id,
  ) ??
  // DataProduct test results from the engine return the element's simple name
  // (not the full path) as the testable identifier. This is inconsistent with
  // all other testable types and should be fixed if we want to not have to have a hard check here
  // TODO: remove once engine returns full path for DataProduct test results.
  graph.ownTestables.find((e) => e instanceof DataProduct && e.name === id) ??
  plugins
    .flatMap(
      (plugin) =>
        (
          plugin as Testable_PureGraphManagerPlugin_Extension
        ).getExtraTestableFinders?.() ?? [],
    )
    .map((getter) => getter(id, graph))
    .filter(isNonNullable)[0];

export const getNullableIDFromTestable = (
  testable: Testable,
  graph: PureModel,
  plugins: PureGraphManagerPlugin[],
): string | undefined => {
  if (testable instanceof PackageableElement) {
    return testable.path;
  }
  return plugins
    .flatMap(
      (plugin) =>
        (
          plugin as Testable_PureGraphManagerPlugin_Extension
        ).getExtraTestableIDBuilders?.() ?? [],
    )
    .map((getter) => getter(testable, graph))
    .filter(isNonNullable)[0];
};
