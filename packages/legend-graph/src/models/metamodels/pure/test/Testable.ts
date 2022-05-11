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
import type { PureGraphManagerPlugin } from '../../../../graphManager/PureGraphManagerPlugin';
import { PackageableElement } from '../packageableElements/PackageableElement';
import type { Test } from './Test';

export interface Testable {
  tests: Test[];
}

// TODO: to be moved to helper
export const getNullableTestable = (
  id: string,
  graph: PureModel,
  pureGraphManagerPlugins: PureGraphManagerPlugin[],
): Testable | undefined =>
  graph.allOwnTestables.find(
    (e) => e instanceof PackageableElement && e.path === id,
  ) ??
  pureGraphManagerPlugins
    .flatMap((plugin) => plugin.getExtraTestableFinders?.() ?? [])
    .map((getter) => getter(id, graph))
    .filter(isNonNullable)[0];

// TODO: to be moved to helper
export const getNullableIdFromTestable = (
  testable: Testable,
  graph: PureModel,
  pureGraphManagerPlugins: PureGraphManagerPlugin[],
): string | undefined => {
  if (testable instanceof PackageableElement) {
    return testable.path;
  }
  return pureGraphManagerPlugins
    .flatMap((plugin) => plugin.getExtraTestableIDBuilders?.() ?? [])
    .map((getter) => getter(testable, graph))
    .filter(isNonNullable)[0];
};
