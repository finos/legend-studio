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

import { useState, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import {
  Dialog,
  type SelectComponent,
  CustomSelectorInput,
  createFilter,
  compareLabelFn,
  clsx,
  PanelDivider,
} from '@finos/legend-art';
import {
  type MappingElement,
  createClassMapping,
  createEnumerationMapping,
  getAllMappingElements,
  MappingEditorState,
  BASIC_SET_IMPLEMENTATION_TYPE,
} from '../../../../stores/editor/editor-state/element-editor-state/mapping/MappingEditorState.js';
import {
  guaranteeNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  type PackageableElement,
  fromElementPathToMappingElementId,
  Class,
  Enumeration,
  Association,
  PrimitiveType,
} from '@finos/legend-graph';
import {
  buildElementOption,
  getPackageableElementOptionFormatter,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';

interface ClassMappingSubTypeOption {
  label: string;
  value: BASIC_SET_IMPLEMENTATION_TYPE;
}

export const NewMappingElementModal = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = editorStore.applicationStore;
  const mappingEditorState =
    editorStore.tabManagerState.getCurrentEditorState(MappingEditorState);
  const spec = mappingEditorState.newMappingElementSpec;

  // ID
  const mappingIdInputRef = useRef<HTMLInputElement>(null);
  const [id, setId] = useState('');
  const handleIdChange: React.ChangeEventHandler<HTMLInputElement> = (event) =>
    setId(event.target.value);
  const mapping = mappingEditorState.mapping;
  const mappingIds = getAllMappingElements(mapping).map(
    (mappingElement) => mappingElement.id.value,
  );
  const isMappingIdUnique = !mappingIds.includes(id);
  const showId =
    spec?.target &&
    mappingIds.includes(fromElementPathToMappingElementId(spec.target.path));

  // Target
  const targetSelectorRef = useRef<SelectComponent>(null);
  const options: PackageableElementOption<PackageableElement>[] = [
    ...editorStore.graphManagerState.usableEnumerations.map(buildElementOption),
    ...editorStore.graphManagerState.usableAssociations.map(buildElementOption),
    ...editorStore.graphManagerState.usableClasses.map(buildElementOption),
  ].sort(compareLabelFn);
  const filterOption = createFilter({
    ignoreCase: true,
    ignoreAccents: false,
    stringify: (option: {
      data: PackageableElementOption<PackageableElement>;
    }): string => option.data.value.path,
  });
  const selectedOption = spec?.target
    ? {
        label: spec.target.name,
        value: spec.target,
      }
    : null;
  const handleTargetChange = (
    val: PackageableElementOption<PackageableElement> | null,
  ): void => {
    mappingEditorState.createMappingElement({
      target: val?.value,
      showTarget: true,
      openInAdjacentTab: Boolean(spec?.openInAdjacentTab),
    });
    const suggestedId = val?.value
      ? fromElementPathToMappingElementId(val.value.path)
      : '';
    setId(suggestedId && !mappingIds.includes(suggestedId) ? suggestedId : '');
  };
  // Class Mapping Type
  const classMappingTypeSelectorRef = useRef<SelectComponent>(null);
  const classMappingTypeOptions = [
    { value: BASIC_SET_IMPLEMENTATION_TYPE.INSTANCE, label: 'Instance' },
    { value: BASIC_SET_IMPLEMENTATION_TYPE.OPERATION, label: 'Operation' },
  ];
  const initialClassMappingType = guaranteeNonNullable(
    classMappingTypeOptions[0],
  );
  const [classMappingType, setClassMappingType] =
    useState<ClassMappingSubTypeOption | null>(initialClassMappingType);
  const changeClassMappingType = (val: ClassMappingSubTypeOption): void =>
    setClassMappingType(val);

  // Dialog actions
  const handleClose = (): void =>
    mappingEditorState.setNewMappingElementSpec(undefined);
  const handleEnter = (): void => {
    if (spec) {
      const suggestedId = spec.target
        ? fromElementPathToMappingElementId(spec.target.path)
        : '';
      setId(
        suggestedId && !mappingIds.includes(suggestedId) ? suggestedId : '',
      );
      setClassMappingType(initialClassMappingType);
      // Set the focus properly depending on which input elements are shown
      if (spec.showTarget) {
        targetSelectorRef.current?.focus();
      } else {
        if (showId) {
          mappingIdInputRef.current?.focus();
        } else if (spec.target instanceof Class) {
          classMappingTypeSelectorRef.current?.focus();
        }
      }
    }
  };

  // Submit button
  const disableCreateButton =
    !spec?.target ||
    !isMappingIdUnique ||
    !id ||
    (spec.target instanceof Class && !classMappingType);
  const handleSubmit = (): void => {
    if (spec) {
      if (id && spec.target) {
        let newMappingElement: MappingElement | undefined = undefined;
        if (spec.target instanceof Class) {
          if (classMappingType?.value) {
            newMappingElement = createClassMapping(
              mapping,
              id,
              spec.target,
              classMappingType.value,
              editorStore,
            );
          }
        } else if (spec.target instanceof Enumeration) {
          newMappingElement = createEnumerationMapping(
            mapping,
            id,
            spec.target,
            PrimitiveType.STRING,
          );
        } else if (spec.target instanceof Association) {
          throw new UnsupportedOperationError();
        }
        if (spec.postSubmitAction) {
          spec.postSubmitAction(newMappingElement);
        }
        if (newMappingElement) {
          mappingEditorState.openMappingElement(
            newMappingElement,
            spec.openInAdjacentTab,
          );
        }
      }
      handleClose();
    }
  };
  // Title
  const titleText = spec
    ? spec.showTarget
      ? 'Create New Mapping Element'
      : `Create New ${
          spec.target instanceof Class
            ? 'Class'
            : spec.target instanceof Enumeration
              ? 'Enumeration'
              : 'Association'
        } Mapping ${spec.target ? `for ${spec.target.name}` : ''}`
    : undefined;

  return (
    <Dialog
      open={Boolean(spec)}
      onClose={handleClose}
      TransitionProps={{
        onEnter: handleEnter,
      }}
      classes={{
        container: 'search-modal__container',
      }}
      PaperProps={{
        classes: {
          root: 'search-modal__inner-container',
        },
      }}
    >
      {spec && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
          className={clsx('modal search-modal new-mapping-element-modal', {
            'modal--dark': true,
          })}
        >
          {titleText && <div className="modal__title">{titleText}</div>}
          {spec.showTarget && (
            <CustomSelectorInput
              inputRef={targetSelectorRef}
              options={options}
              filterOption={filterOption}
              onChange={handleTargetChange}
              value={selectedOption}
              formatOptionLabel={getPackageableElementOptionFormatter({})}
              placeholder="Choose a target"
              isClearable={true}
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
            />
          )}
          {showId && (
            <div>
              <PanelDivider />
              Default ID could not be used, please specify one:
              <PanelDivider />
              <input
                className={clsx('input new-mapping-element-modal__id-input', {
                  'input--dark': true,
                })}
                ref={mappingIdInputRef}
                spellCheck={false}
                value={id}
                onChange={handleIdChange}
                placeholder="Mapping element ID"
              />
            </div>
          )}
          {spec.target instanceof Class && (
            <>
              <PanelDivider />
              <CustomSelectorInput
                inputRef={classMappingTypeSelectorRef}
                options={classMappingTypeOptions}
                onChange={changeClassMappingType}
                value={classMappingType}
                darkMode={
                  !applicationStore.layoutService
                    .TEMPORARY__isLightColorThemeEnabled
                }
                placeholder="Choose a class mapping type"
              />
            </>
          )}
          <PanelDivider />
          <div className="search-modal__actions">
            <button
              className={clsx('btn btn--primary', {
                'btn--dark': true,
              })}
              disabled={disableCreateButton}
            >
              Create
            </button>
          </div>
        </form>
      )}
      {!spec && <div />}
    </Dialog>
  );
});
