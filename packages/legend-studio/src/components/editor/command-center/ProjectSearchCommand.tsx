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

import { useState, useRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { compareLabelFn } from '@finos/legend-studio-shared';
import { FaCaretDown } from 'react-icons/fa';
import { MdMoreHoriz } from 'react-icons/md';
import { useEditorStore } from '../../../stores/EditorStore';
import type { SelectComponent } from '@finos/legend-studio-components';
import {
  DropdownMenu,
  NonBlockingDialog,
  createFilter,
  CustomSelectorInput,
} from '@finos/legend-studio-components';
import { getElementTypeIcon } from '../../shared/Icon';
import type {
  PackageableElementSelectOption,
  PackageableElement,
} from '../../../models/metamodels/pure/model/packageableElements/PackageableElement';

export const ProjectSearchCommand = observer(() => {
  const editorStore = useEditorStore();
  const sourceSelectorRef = useRef<SelectComponent>(null);
  const closeModal = (): void => editorStore.searchElementCommandState.close();
  const types = editorStore.getSupportedElementTypes();
  const [elementType, setElementType] = useState<string | undefined>();
  const changeType =
    (type: string | undefined): (() => void) =>
    (): void =>
      setElementType(type);
  const options = editorStore.graphState.graph.allElements
    .filter(
      (element) =>
        !elementType ||
        editorStore.graphState.getPackageableElementType(element) ===
          elementType,
    )
    .map((element) => element.selectOption)
    // .getElementOptions(elementType)
    .sort(compareLabelFn);
  const filterOption = createFilter({
    ignoreCase: true,
    ignoreAccents: false,
    stringify: (
      option: PackageableElementSelectOption<PackageableElement>,
    ): string => option.value.path,
  });
  const openElement = (
    val: PackageableElementSelectOption<PackageableElement> | null,
  ): void => {
    if (val?.value) {
      closeModal();
      // NOTE: since it takes time to close the modal, this will prevent any auto-focus effort when we open a new element
      // to fail as the focus is still trapped in this modal, we need to use `setTimeout` here
      setTimeout(() => editorStore.openElement(val.value), 0);
    }
  };
  const handleEnter = (): void => {
    setElementType(undefined);
    sourceSelectorRef.current?.focus();
  };
  useEffect(() => {
    sourceSelectorRef.current?.focus();
  }, [elementType]);

  return (
    <NonBlockingDialog
      nonModalDialogState={editorStore.searchElementCommandState}
      onClose={closeModal}
      onEnter={handleEnter}
      onClickAway={closeModal}
      classes={{ container: 'search-modal__container' }}
      PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
    >
      <div className="modal search-modal">
        <div className="project-search-command">
          <DropdownMenu
            content={
              <div className="project-search-command__options">
                <div
                  className="project-search-command__option"
                  onClick={changeType(undefined)}
                >
                  <MdMoreHoriz />
                </div>
                {types.map((type) => (
                  <div
                    key={type}
                    className="project-search-command__option"
                    onClick={changeType(type)}
                  >
                    {getElementTypeIcon(editorStore, type)}
                  </div>
                ))}
              </div>
            }
          >
            <button
              className="project-search-command__type"
              tabIndex={-1}
              title="Choose Element Type..."
            >
              <div className="project-search-command__type__label">
                {elementType ? (
                  getElementTypeIcon(editorStore, elementType)
                ) : (
                  <MdMoreHoriz />
                )}
              </div>
              <div className="project-search-command__type__selector">
                <FaCaretDown />
              </div>
            </button>
          </DropdownMenu>
          <CustomSelectorInput
            ref={sourceSelectorRef}
            className="project-search-command__input"
            options={options}
            onChange={openElement}
            filterOption={filterOption}
            placeholder={`Search ${
              elementType ? elementType.toLowerCase() : 'elements'
            } by path`}
            escapeClearsValue={true}
          />
        </div>
      </div>
    </NonBlockingDialog>
  );
});
