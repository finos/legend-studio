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
  getNullableIdFromTestable,
  PackageableElement,
  type Testable,
} from '@finos/legend-graph';
import { isNonNullable, uuid } from '@finos/legend-shared';
import type { EditorStore } from '../stores/EditorStore';
import type { TestableMetadataGetter } from '../stores/LegendStudioPlugin';
import { getElementTypeIcon } from './shared/ElementIconUtils';

export interface TestableMetadata {
  testable: Testable;
  id: string;
  name: string;
  icon: React.ReactNode;
}

export const getTestableMetadata = (
  testable: Testable,
  editorStore: EditorStore,
  extraTestableMetadataGetters: TestableMetadataGetter[],
): TestableMetadata => {
  if (testable instanceof PackageableElement) {
    return {
      testable: testable,
      id:
        getNullableIdFromTestable(
          testable,
          editorStore.graphManagerState.graph,
        ) ?? uuid(),
      name: testable.name,
      icon: getElementTypeIcon(
        editorStore,
        editorStore.graphState.getPackageableElementType(testable),
      ),
    };
  }
  const extraTestables = extraTestableMetadataGetters
    .map((getter) => getter(testable, editorStore))
    .filter(isNonNullable);
  return (
    extraTestables[0] ?? {
      testable,
      id: uuid(),
      name: '(unknown)',
      icon: null,
    }
  );
};
