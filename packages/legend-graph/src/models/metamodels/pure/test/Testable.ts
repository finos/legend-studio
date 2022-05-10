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
import type { PureModel } from '../../../../graph/PureModel';
import type { GraphManagerState } from '../../../../GraphManagerState';
import { PackageableElement } from '../packageableElements/PackageableElement';
import type { Test } from './Test';

export interface Testable {
  tests: Test[];
}

export type IdFromTestableGetter = (
  testable: Testable,
  graph: PureModel,
) => string | undefined;

export type TestableFromIdGetter = (
  id: string,
  graph: PureModel,
) => Testable | undefined;

export type TestablesGetter = (graph: PureModel) => Testable[];

export const getNullableTestable = (
  id: string,
  graphManager: GraphManagerState,
): Testable | undefined =>
  graphManager.graph.allOwnTestables.find(
    (e) => e instanceof PackageableElement && e.path === id,
  ) ??
  graphManager.pluginManager
    .getPureGraphManagerPlugins()
    .flatMap((plugin) => plugin.getEtxraTestableFromIdGetters?.() ?? [])
    .map((getter) => getter(id, graphManager.graph))
    .filter(isNonNullable)[0];

export const getNullableIdFromTestable = (
  testable: Testable,
  graphManager: GraphManagerState,
): string | undefined => {
  if (testable instanceof PackageableElement) {
    return testable.path;
  }
  return graphManager.pluginManager
    .getPureGraphManagerPlugins()
    .flatMap((plugin) => plugin.getExtraIdFromTestableGetters?.() ?? [])
    .map((getter) => getter(testable, graphManager.graph))
    .filter(isNonNullable)[0];
};
