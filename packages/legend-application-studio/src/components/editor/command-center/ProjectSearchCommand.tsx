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
import {
  type SelectComponent,
  compareLabelFn,
  ControlledDropdownMenu,
  NonBlockingDialog,
  createFilter,
  CustomSelectorInput,
  MoreHorizontalIcon,
  CaretDownIcon,
  Modal,
  MenuContent,
  MenuContentItem,
} from '@finos/legend-art';
import { getElementTypeIcon } from '../../ElementIconUtils.js';
import type { PackageableElement } from '@finos/legend-graph';
import { useEditorStore } from '../EditorStoreProvider.js';
import {
  buildElementOption,
  getPackageableElementOptionFormatter,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';

export const ProjectSearchCommand = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = editorStore.applicationStore;
  const selectorRef = useRef<SelectComponent>(null);
  const closeModal = (): void => editorStore.setShowSearchElementCommand(false);
  const types = editorStore.getSupportedElementTypes();
  const [elementType, setElementType] = useState<string | undefined>();
  const changeType =
    (type: string | undefined): (() => void) =>
    (): void =>
      setElementType(type);
  const options = [
    // NOTE: we don't include system elements here for now
    // ...editorStore.graphManagerState.graph.systemModel.allOwnElements,
    ...editorStore.graphManagerState.graph.dependencyManager.allOwnElements,
    ...editorStore.graphManagerState.graph.allOwnElements,
    ...editorStore.graphManagerState.graph.generationModel.allOwnElements,
  ]
    .filter(
      (element) =>
        !elementType ||
        editorStore.graphState.getPackageableElementType(element) ===
          elementType,
    )
    .map(buildElementOption)
    .sort(compareLabelFn);
  const filterOption = createFilter({
    ignoreCase: true,
    ignoreAccents: false,
    stringify: (option: {
      data: PackageableElementOption<PackageableElement>;
    }): string => option.data.value.path,
  });
  const openElement = (
    val: PackageableElementOption<PackageableElement> | null,
  ): void => {
    if (val?.value) {
      closeModal();
      // NOTE: since it takes time to close the modal, this will prevent any auto-focus effort when we open a new element
      // to fail as the focus is still trapped in this modal, we need to use `setTimeout` here
      setTimeout(() => editorStore.graphEditorMode.openElement(val.value), 0);
    }
  };
  const handleEnter = (): void => {
    setElementType(undefined);
    selectorRef.current?.focus();
  };
  useEffect(() => {
    selectorRef.current?.focus();
  }, [elementType]);

  return (
    <NonBlockingDialog
      open={editorStore.showSearchElementCommand}
      onClose={closeModal}
      TransitionProps={{
        onEnter: handleEnter,
      }}
      onClickAway={closeModal}
      classes={{ container: 'search-modal__container' }}
      PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
    >
      <Modal
        darkMode={
          !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
        }
        className="search-modal"
      >
        <div className="project-search-command">
          <ControlledDropdownMenu
            className="project-search-command__type"
            title="Choose Element Type..."
            content={
              <MenuContent className="project-search-command__options">
                <MenuContentItem
                  className="project-search-command__option"
                  onClick={changeType(undefined)}
                >
                  <MoreHorizontalIcon />
                </MenuContentItem>
                {types.map((type) => (
                  <MenuContentItem
                    key={type}
                    className="project-search-command__option"
                    onClick={changeType(type)}
                  >
                    {getElementTypeIcon(type, editorStore)}
                  </MenuContentItem>
                ))}
              </MenuContent>
            }
          >
            <div className="project-search-command__type__label">
              {elementType ? (
                getElementTypeIcon(elementType, editorStore)
              ) : (
                <MoreHorizontalIcon />
              )}
            </div>
            <div className="project-search-command__type__selector">
              <CaretDownIcon />
            </div>
          </ControlledDropdownMenu>
          <CustomSelectorInput
            inputRef={selectorRef}
            className="project-search-command__input"
            options={options}
            onChange={openElement}
            filterOption={filterOption}
            placeholder={`Search ${
              elementType ? elementType.toLowerCase() : 'elements'
            } by path`}
            escapeClearsValue={true}
            darkMode={
              !applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
            formatOptionLabel={getPackageableElementOptionFormatter({
              darkMode:
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled,
            })}
          />
        </div>
      </Modal>
    </NonBlockingDialog>
  );
});
