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
  PanelFormSection,
  PanelFormTextField,
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

interface CustomSelectorOption {
  label: string;
  value: PackageableElementReference<DataSpaceElement>;
}

export const DataSpaceElementsTab: React.FC<ElementsTabProps> = observer(
  ({ dataSpaceEditorState }) => {
    const handleElementChange = (
      index: number,
      option: { value: PackageableElementReference<DataSpaceElement> },
    ) => {
      const elementPointer = dataSpaceEditorState.dataSpace.elements?.[index];
      if (elementPointer) {
        elementPointer.element = option.value;
      }
    };

    const handleExcludeChange = (index: number, exclude: boolean) => {
      const elementPointer = dataSpaceEditorState.dataSpace.elements?.[index];
      if (elementPointer) {
        elementPointer.exclude = exclude;
      }
    };

    const elementOptions =
      dataSpaceEditorState.editorStore.graphManagerState.graph.allElements
        .filter(
          (el) =>
            el instanceof Package ||
            el instanceof Class ||
            el instanceof Enumeration ||
            el instanceof Association,
        )
        .map((el) => ({
          label: el.path,
          value: PackageableElementExplicitReference.create(
            el as DataSpaceElement,
          ),
        }));

    return (
      <div className="data-space-elements-tab">
        {dataSpaceEditorState.dataSpace.elements?.map(
          (elementPointer, index) => (
            <PanelFormSection key={elementPointer.hashCode}>
              <CustomSelectorInput
                name={`Element ${index + 1}`}
                options={elementOptions}
                onChange={(option: CustomSelectorOption) =>
                  handleElementChange(index, option)
                }
                value={elementOptions.find(
                  (option) => option.value === elementPointer.element,
                )}
                placeholder="Select an element"
                darkMode={true}
              />
              <PanelFormTextField
                name="Exclude"
                value={elementPointer.exclude?.toString()}
                update={(value) => handleExcludeChange(index, value === 'true')}
                placeholder="Enter true or false"
              />
            </PanelFormSection>
          ),
        )}
      </div>
    );
  },
);
