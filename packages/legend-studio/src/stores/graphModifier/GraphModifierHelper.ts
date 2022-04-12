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

import type {
  BasicModel,
  PackageableElement,
  PureModel,
} from '@finos/legend-graph';
import type { GeneratorFn } from '@finos/legend-shared';
import { action, flow } from 'mobx';

export const graph_dispose = flow(function* (
  graph: BasicModel,
): GeneratorFn<void> {
  yield graph.dispose();
});

export const graph_deleteOwnElement = action(
  (graph: BasicModel, element: PackageableElement): void => {
    graph.deleteOwnElement(element);
  },
);

export const graph_addElement = action(
  (graph: PureModel, element: PackageableElement): void => {
    graph.addElement(element);
  },
);

export const graph_deleteElement = action(
  (graph: PureModel, element: PackageableElement): void => {
    graph.deleteElement(element);
  },
);

export const graph_renameElement = action(
  (graph: PureModel, element: PackageableElement, newPath: string): void => {
    graph.renameElement(element, newPath);
  },
);
