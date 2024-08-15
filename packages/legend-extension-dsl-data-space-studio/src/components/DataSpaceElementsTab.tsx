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
  PanelFormTextField,
} from '@finos/legend-art';
import {
  Association,
  Class,
  Enumeration,
  Package,
  type PackageableElementReference,
} from '@finos/legend-graph';
import { type DataSpaceElement } from '@finos/legend-extension-dsl-data-space/graph';

export const DataSpaceElementsTab = observer(
  ({
    dataSpaceEditorState,
  }: {
    dataSpaceEditorState: DataSpaceEditorState;
  }) => {
    const handleElementChange = (option: {
      value: PackageableElementReference<DataSpaceElement>;
    }): void => {
      if (dataSpaceEditorState.selectedElementPointer) {
        dataSpaceEditorState.selectedElementPointer.element = option.value;
      }
      if (dataSpaceEditorState.selectedElementPointer) {
        dataSpaceEditorState.setSelectedElementPointer(
          dataSpaceEditorState.selectedElementPointer,
        );
      }
    };

    const handleNameChange = (value: string | undefined): void => {
      if (value !== undefined) {
        const elementPointer = dataSpaceEditorState.selectedElementPointer;
        if (elementPointer) {
          elementPointer.element.value.name = value;
        }
      }
    };

    const handleExcludeChange = (value: boolean | undefined): void => {
      if (dataSpaceEditorState.selectedElementPointer && value !== undefined) {
        dataSpaceEditorState.updateElementExclude(
          dataSpaceEditorState.selectedElementPointer,
          value,
        );
      }
    };

    const elementOptions =
      dataSpaceEditorState.editorStore.graphManagerState.usableElements
        .filter(
          (element) =>
            element instanceof Class ||
            element instanceof Package ||
            element instanceof Enumeration ||
            element instanceof Association,
        )
        .map((element) => ({
          label: element.path,
          value: element,
        }));

    return (
      <div>
        <CustomSelectorInput
          options={elementOptions}
          onChange={handleElementChange}
          value={{
            label:
              dataSpaceEditorState.selectedElementPointer?.element.value.name ??
              'Select an element',
            value: dataSpaceEditorState.selectedElementPointer?.element,
          }}
          placeholder="Select Element"
        />
        {dataSpaceEditorState.selectedElementPointer && (
          <PanelFormTextField
            name="Element Name"
            value={
              dataSpaceEditorState.selectedElementPointer.element.value.name
            }
            update={handleNameChange}
            placeholder="Enter element name"
          />
        )}
        {dataSpaceEditorState.selectedElementPointer && (
          <PanelFormBooleanField
            name="Exclude Element"
            value={!!dataSpaceEditorState.selectedElementPointer.exclude}
            update={handleExcludeChange}
            isReadOnly={true}
          />
        )}
      </div>
    );
  },
);
