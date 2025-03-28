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
  Class,
  PackageableElementExplicitReference,
  type PureModel,
} from '@finos/legend-graph';
import { DataSpaceElementPointer } from '../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
import { isNonNullable } from '@finos/legend-shared';
import { getDataSpace } from './DSL_DataSpace_GraphManagerHelper.js';

export const buildDataSpaceElements = (
  graph: PureModel,
  dataSpacePath: string,
  selectedElements: string[],
) => {
  const dataSpace = getDataSpace(dataSpacePath, graph);
  dataSpace.elements = selectedElements
    .map((element) => {
      // inlcuded elements have already been resolved no packages needed
      const el = graph.getNullableElement(element, false);
      if (el instanceof Class) {
        const produceElement = new DataSpaceElementPointer();
        produceElement.element = PackageableElementExplicitReference.create(el);
        return produceElement;
      }
      return undefined;
    })
    .filter(isNonNullable);
};
