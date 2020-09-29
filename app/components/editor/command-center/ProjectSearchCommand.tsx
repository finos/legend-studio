/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useState, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { isElementTypeSupported } from 'Utilities/DemoUtil';
import { compareLabelFn } from 'Utilities/GeneralUtil';
import { FaCaretDown } from 'react-icons/fa';
import { MdMoreHoriz } from 'react-icons/md';
import { useEditorStore } from 'Stores/EditorStore';
import Dialog from '@material-ui/core/Dialog';
import { createFilter } from 'react-select';
import { CustomSelectorInput, SelectComponent } from 'Components/shared/CustomSelectorInput';
import { DropdownMenu } from 'Components/shared/DropdownMenu';
import { ElementIcon } from 'Components/shared/Icon';
import { config } from 'ApplicationConfig';
import { PackageableElementSelectOption, PackageableElement, PACKAGEABLE_ELEMENT_TYPE } from 'MM/model/packageableElements/PackageableElement';

export const ProjectSearchCommand = observer(() => {
  const editorStore = useEditorStore();
  const sourceSelectorRef = useRef<SelectComponent>(null);
  const closeModal = (): void => editorStore.setOpenElementSearchModal(false);
  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  const types = [
    PACKAGEABLE_ELEMENT_TYPE.ASSOCIATION,
    PACKAGEABLE_ELEMENT_TYPE.CLASS,
    PACKAGEABLE_ELEMENT_TYPE.DIAGRAM,
    PACKAGEABLE_ELEMENT_TYPE.FUNCTION,
    PACKAGEABLE_ELEMENT_TYPE.ENUMERATION,
    PACKAGEABLE_ELEMENT_TYPE.MEASURE,
    PACKAGEABLE_ELEMENT_TYPE.FILE_GENERATION,
    PACKAGEABLE_ELEMENT_TYPE.MAPPING,
    PACKAGEABLE_ELEMENT_TYPE.PROFILE,
    PACKAGEABLE_ELEMENT_TYPE.TEXT,
    PACKAGEABLE_ELEMENT_TYPE.GENERATION_SPECIFICATION,
  ].filter(type => isElementTypeSupported(type, config.features.BETA__demoMode));
  const [elementType, setElementType] = useState<PACKAGEABLE_ELEMENT_TYPE | undefined>();
  const changeType = (type: PACKAGEABLE_ELEMENT_TYPE | undefined): () => void => (): void => setElementType(type);
  const filterOption = createFilter({ ignoreCase: true, ignoreAccents: false, stringify: (option: PackageableElementSelectOption<PackageableElement>): string => option.value.path });
  const openElement = (val: PackageableElementSelectOption<PackageableElement> | null): void => {
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

  return (
    <Dialog
      open={editorStore.openElementSearchModal}
      onClose={closeModal}
      onEnter={handleEnter}
      classes={{ container: 'search-modal__container' }}
      PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
    >
      <div className="modal search-modal">
        <div className="modal__title">Open ....</div>
        <div className="project-search-command">
          <DropdownMenu content={
            <div className="project-search-command__options">
              <div className="project-search-command__option" onClick={changeType(undefined)}><MdMoreHoriz /></div>
              {types.map(type =>
                <div key={type} className="project-search-command__option" onClick={changeType(type)}><ElementIcon type={type} /></div>
              )}
            </div>
          }>
            <button
              className="project-search-command__type"
              tabIndex={-1}
              title={'Choose element type...'}
            >
              <div className="project-search-command__type__label">
                {elementType ? <ElementIcon type={elementType} /> : <MdMoreHoriz />}
              </div>
              <div className="project-search-command__type__selector"><FaCaretDown /></div>
            </button>
          </DropdownMenu>
          <CustomSelectorInput
            ref={sourceSelectorRef}
            className="project-search-command__input"
            options={editorStore.graphState.graph.getElementOptions(elementType).sort(compareLabelFn)}
            onChange={openElement}
            filterOption={filterOption}
            placeholder={elementType ? `Find an existing ${elementType.toLowerCase()}` : 'Find an existing element'}
            escapeClearsValue={true}
          />
        </div>
      </div>
    </Dialog>
  );
});
