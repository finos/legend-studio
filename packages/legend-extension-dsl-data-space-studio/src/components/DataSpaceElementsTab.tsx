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

import React from 'react';
import { observer } from 'mobx-react-lite';
import type { DataSpaceEditorState } from '../stores/DataSpaceEditorState.js';
import {
  CustomSelectorInput,
  PanelFormBooleanField,
  PanelFormSection,
  PanelFormTextField,
  TrashIcon,
} from '@finos/legend-art';
import {
  Association,
  Class,
  Enumeration,
  Package,
  PackageableElementExplicitReference,
  type PackageableElementReference,
} from '@finos/legend-graph';
import type { DataSpaceElement } from '@finos/legend-extension-dsl-data-space/graph';

interface ElementsTabProps {
  dataSpaceEditorState: DataSpaceEditorState;
}

interface ElementOption {
  label: string;
  value: PackageableElementReference<DataSpaceElement>;
}

export const DataSpaceElementsTab: React.FC<ElementsTabProps> = observer(
  ({ dataSpaceEditorState }) => {
    const handleElementChange = (
      index: number,
      element: PackageableElementReference<DataSpaceElement>,
    ) => {
      const updatedElements = [...dataSpaceEditorState.elements];
      if (updatedElements[index]) {
        updatedElements[index].element = element;
      }
    };

    // const handleExcludeChange = (index: number, exclude: boolean) => {
    //   const updatedElements = [...dataSpaceEditorState.elements];
    //   if (updatedElements[index]) {
    //     dataSpaceEditorState.setExcludeForElement(
    //       updatedElements[index],
    //       exclude,
    //     );
    //   }
    // };

    // const elementOptions: ElementOption[] = dataSpaceEditorState.editorStore.graphManagerState.graph.ownElements
    //   .filter(
    //     (el) => el instanceof Class || el instanceof Enumeration || el instanceof Association || el instanceof Package,
    //   )
    //   .map((el) => ({
    //     label: el.path,
    //     value: PackageableElementExplicitReference.create(el as DataSpaceElement),
    //   }));

    // const handleExcludeChange = (index: number, exclude: boolean) => {
    //   const elementPointer = dataSpaceEditorState.dataSpace.elements?.[index];
    //   if (elementPointer) {
    //     elementPointer.exclude = exclude;
    //   }
    // };

    // const elementOptions =
    //   dataSpaceEditorState.editorStore.graphManagerState.graph.allElements
    //     .filter(
    //       (el) =>
    //         el instanceof Package ||
    //         el instanceof Class ||
    //         el instanceof Enumeration ||
    //         el instanceof Association,
    //     )
    //     .map((el) => ({
    //       label: el.path,
    //       value: PackageableElementExplicitReference.create(
    //         el as DataSpaceElement,
    //       ),
    //     }));

    return (
      <div className="data-space-elements-tab">
        {dataSpaceEditorState.elements.map((elementPointer, index) => (
          <PanelFormSection key={elementPointer.element.value.hashCode}>
            <CustomSelectorInput
              options={dataSpaceEditorState.elementOptions}
              onChange={(option: ElementOption) =>
                handleElementChange(index, option.value)
              }
              value={{
                label: elementPointer.element.value.path,
                value: elementPointer.element,
              }}
            />
            {/* Add additional controls for `exclude` or other properties */}
          </PanelFormSection>
        ))}
      </div>
    );
  },
);
