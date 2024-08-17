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

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import type { DataSpaceEditorState } from '../stores/DataSpaceEditorState.js';
import { CustomSelectorInput } from '@finos/legend-art';
import {
  PackageableElementExplicitReference,
  type PackageableElementReference,
  type PackageableElement,
} from '@finos/legend-graph';
import { useEditorStore } from '@finos/legend-application-studio';

type OptionType = {
  label: string;
  value: PackageableElementReference<PackageableElement>;
};

export const DataSpaceElementsTab = observer(
  ({
    dataSpaceEditorState,
  }: {
    dataSpaceEditorState: DataSpaceEditorState;
  }) => {
    const editorStore = useEditorStore();
    const [selectedElements, setSelectedElements] = useState<
      (PackageableElementReference<PackageableElement> | null)[]
    >([null]);

    const elementOptions = Array.from(
      editorStore.explorerTreeState.getTreeData().nodes.values(),
    )
      .map((node) => ({
        label: node.packageableElement.name,
        value: PackageableElementExplicitReference.create(
          node.packageableElement,
        ),
      }))
      .filter(
        (option) =>
          !selectedElements.some(
            (selected) => selected?.value === option.value.value,
          ),
      );
    const handleElementChange = (option: OptionType, index: number): void => {
      const updatedSelectedElements = [...selectedElements];
      updatedSelectedElements[index] = option.value;

      // setSelectedElements(updatedSelectedElements);
      if (
        index === selectedElements.length - 1 &&
        elementOptions.length > selectedElements.length
      ) {
        setSelectedElements([...updatedSelectedElements, null]);
      } else {
        setSelectedElements(updatedSelectedElements);
      }
    };
    return (
      <div>
        {selectedElements.map((selected, index) => {
          const availableOptions = elementOptions.filter(
            (opt) =>
              !selectedElements.some(
                (selected) => selected?.value.path === opt.value.value.path,
              ),
          );

          return (
            <div key={index}>
              <CustomSelectorInput
                options={availableOptions}
                onChange={(option: OptionType) =>
                  handleElementChange(option, index)
                }
                value={
                  selected
                    ? {
                        label: selected.value.name,
                        value: selected,
                      }
                    : undefined
                }
                placeholder="Select Element"
              />
            </div>
          );
        })}
      </div>
    );
  },
);
