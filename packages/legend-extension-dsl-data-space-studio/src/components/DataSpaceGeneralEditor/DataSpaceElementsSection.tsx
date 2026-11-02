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
  EditorFormSection,
  getElementIcon,
  useEditorStore,
} from '@finos/legend-application-studio';
import {
  clsx,
  CustomSelectorInput,
  PlusIcon,
  TimesIcon,
} from '@finos/legend-art';
import {
  type DataSpaceElement,
  DataSpaceElementPointer,
} from '@finos/legend-extension-dsl-data-space/graph';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { prettyCONSTName, returnUndefOnError } from '@finos/legend-shared';
import { DataSpaceEditorState } from '../../stores/DataSpaceEditorState.js';
import { PackageableElementExplicitReference } from '@finos/legend-graph';
import {
  dataSpace_addElement,
  dataSpace_removeElement,
  dataSpace_setElementExclude,
} from '../../stores/studio/DSL_DataSpace_GraphModifierHelper.js';

export const DataSpaceElementsSection = observer(() => {
  const editorStore = useEditorStore();
  const dataSpaceState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);
  const dataSpace = dataSpaceState.dataSpace;
  const isReadOnly = dataSpaceState.isReadOnly;
  const elements = dataSpace.elements ?? [];
  const [isAdding, setIsAdding] = useState(false);

  const addElement = (option: {
    label: string;
    value: DataSpaceElement;
  }): void => {
    const elementPointer = new DataSpaceElementPointer();
    elementPointer.element = PackageableElementExplicitReference.create(
      option.value,
    );
    dataSpace_addElement(dataSpace, elementPointer);
    setIsAdding(false);
  };
  const getTypeLabel = (pointer: DataSpaceElementPointer): string => {
    const type = returnUndefOnError(() =>
      editorStore.graphState.getPackageableElementType(pointer.element.value),
    );
    return type ? prettyCONSTName(type) : '';
  };

  return (
    <EditorFormSection
      title="Elements"
      description="The classes, enumerations, associations and packages listed under Models Documentation. Exclude an element to hide it from this data space altogether, even when its package is included."
    >
      {elements.length ? (
        <div className="dataSpace-editor-table dataSpace-editor-table--elements">
          <div className="dataSpace-editor-table__row dataSpace-editor-table__row--header">
            <div>Element</div>
            <div>Type</div>
            <div>In this data space</div>
            <div />
          </div>
          {elements.map((pointer) => (
            <div
              key={pointer.element.value.path}
              className={clsx('dataSpace-editor-table__row', {
                'dataSpace-editor-table__row--excluded': pointer.exclude,
              })}
            >
              <div
                className="dataSpace-editor-table__element"
                title={pointer.element.value.path}
              >
                {getElementIcon(pointer.element.value, editorStore)}
                <span className="dataSpace-editor-table__element__name">
                  {pointer.element.value.name}
                </span>
                <span className="dataSpace-editor-table__element__package">
                  {pointer.element.value.package?.path}
                </span>
              </div>
              <div className="dataSpace-editor-table__type">
                {getTypeLabel(pointer)}
              </div>
              <div className="dataSpace-editor-segmented">
                <button
                  className={clsx('dataSpace-editor-segmented__option', {
                    'dataSpace-editor-segmented__option--active':
                      !pointer.exclude,
                  })}
                  disabled={isReadOnly}
                  aria-pressed={!pointer.exclude}
                  onClick={(): void =>
                    dataSpace_setElementExclude(pointer, false)
                  }
                >
                  Included
                </button>
                <button
                  className={clsx('dataSpace-editor-segmented__option', {
                    'dataSpace-editor-segmented__option--active': Boolean(
                      pointer.exclude,
                    ),
                  })}
                  disabled={isReadOnly}
                  aria-pressed={Boolean(pointer.exclude)}
                  onClick={(): void =>
                    dataSpace_setElementExclude(pointer, true)
                  }
                >
                  Excluded
                </button>
              </div>
              <button
                className="dataSpace-editor-table__remove-btn"
                disabled={isReadOnly}
                onClick={(): void =>
                  dataSpace_removeElement(dataSpace, pointer)
                }
                title="Remove this element from the list"
              >
                <TimesIcon />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="dataSpace-editor-table__empty">
          No elements listed yet. Add the classes, enumerations, associations or
          packages people should find documented here.
        </div>
      )}
      {isAdding ? (
        <div className="dataSpace-editor-add-picker">
          <CustomSelectorInput
            options={dataSpaceState.getDataSpaceElementOptions()}
            onChange={addElement}
            placeholder="Choose a class, enumeration, association or package..."
            darkMode={
              !editorStore.applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
            autoFocus={true}
            openMenuOnFocus={true}
          />
          <button
            className="dataSpace-editor-add-picker__cancel"
            onClick={(): void => setIsAdding(false)}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          className="dataSpace-editor-add-btn"
          disabled={isReadOnly}
          onClick={(): void => setIsAdding(true)}
        >
          <PlusIcon />
          Add element
        </button>
      )}
    </EditorFormSection>
  );
});
