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
import Dialog from '@material-ui/core/Dialog';
import { observer } from 'mobx-react-lite';
import { PRIMITIVE_TYPE } from '../../../../models/MetaModelConst';
import { useEditorStore } from '../../../../stores/EditorStore';
import {
  CustomSelectorInput,
  createFilter,
} from '@finos/legend-studio-components';
import type { SelectComponent } from '@finos/legend-studio-components';
import { fromElementPathToMappingElementId } from '../../../../models/MetaModelUtility';
import { MappingEditorState } from '../../../../stores/editor-state/element-editor-state/mapping/MappingEditorState';
import {
  UnsupportedOperationError,
  compareLabelFn,
} from '@finos/legend-studio-shared';
import type { MappingElement } from '../../../../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import { Class } from '../../../../models/metamodels/pure/model/packageableElements/domain/Class';
import { Enumeration } from '../../../../models/metamodels/pure/model/packageableElements/domain/Enumeration';
import { Association } from '../../../../models/metamodels/pure/model/packageableElements/domain/Association';
import type {
  PackageableElementSelectOption,
  PackageableElement,
} from '../../../../models/metamodels/pure/model/packageableElements/PackageableElement';
import { BASIC_SET_IMPLEMENTATION_TYPE } from '../../../../models/metamodels/pure/model/packageableElements/mapping/SetImplementation';

interface ClassMappingSubTypeOption {
  label: string;
  value: BASIC_SET_IMPLEMENTATION_TYPE;
}

export const NewMappingElementModal = observer(() => {
  const editorStore = useEditorStore();
  const config = editorStore.applicationStore.config;
  const mappingEditorState =
    editorStore.getCurrentEditorState(MappingEditorState);
  const spec = mappingEditorState.newMappingElementSpec;

  // ID
  const mappingIdInputRef = useRef<HTMLInputElement>(null);
  const [id, setId] = useState('');
  const handleIdChange: React.ChangeEventHandler<HTMLInputElement> = (event) =>
    setId(event.target.value);
  const mapping = mappingEditorState.mapping;
  const mappingIds = mapping
    .getAllMappingElements()
    .map((mappingElement) => mappingElement.id.value);
  const isMappingIdUnique = !mappingIds.includes(id);
  const showId =
    spec?.target &&
    mappingIds.includes(fromElementPathToMappingElementId(spec.target.path));

  // Target
  const targetSelectorRef = useRef<SelectComponent>(null);
  const options: PackageableElementSelectOption<PackageableElement>[] = [
    ...editorStore.enumerationOptions,
    ...editorStore.associationOptions,
    ...editorStore.classOptions,
  ].sort(compareLabelFn);
  const filterOption = createFilter({
    ignoreCase: true,
    ignoreAccents: false,
    stringify: (
      option: PackageableElementSelectOption<PackageableElement>,
    ): string => option.value.path,
  });
  const selectedOption = spec?.target
    ? { label: spec.target.name, value: spec.target.path }
    : null;
  const handleTargetChange = (
    val: PackageableElementSelectOption<PackageableElement> | null,
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
  const initialClassMappingType = classMappingTypeOptions[0];
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
    !spec ||
    !spec.target ||
    !isMappingIdUnique ||
    !id ||
    (spec.target instanceof Class && !classMappingType);
  const handleSubmit = (): void => {
    if (spec) {
      if (id && spec.target) {
        let newMapppingElement: MappingElement | undefined = undefined;
        if (spec.target instanceof Class) {
          if (classMappingType?.value) {
            newMapppingElement = mapping.createClassMapping(
              id,
              spec.target,
              classMappingType.value,
            );
          }
        } else if (spec.target instanceof Enumeration) {
          newMapppingElement = mapping.createEnumerationMapping(
            id,
            spec.target,
            editorStore.graphState.graph.getPrimitiveType(
              PRIMITIVE_TYPE.STRING,
            ),
          );
        } else if (spec.target instanceof Association) {
          throw new UnsupportedOperationError();
        }
        if (spec.postSubmitAction) {
          spec.postSubmitAction(newMapppingElement);
        }
        if (newMapppingElement) {
          mappingEditorState.openMappingElement(
            newMapppingElement,
            spec.openInAdjacentTab,
          );
        }
      }
      handleClose();
    }
  };
  const onSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    handleSubmit();
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
      onEnter={handleEnter}
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
          onSubmit={onSubmit}
          className="modal search-modal new-mapping-element-modal"
        >
          {titleText && <div className="modal__title">{titleText}</div>}
          {spec.showTarget && (
            <CustomSelectorInput
              ref={targetSelectorRef}
              options={options}
              filterOption={filterOption}
              onChange={handleTargetChange}
              value={selectedOption}
              placeholder={`Choose a target`}
              isClearable={true}
            />
          )}
          {showId && (
            <div>
              Default ID could not be used, please specify one:
              <input
                className="input new-mapping-element-modal__id-input"
                ref={mappingIdInputRef}
                spellCheck={false}
                value={id}
                onChange={handleIdChange}
                placeholder={`Mapping element ID`}
              />
            </div>
          )}
          {spec.target instanceof Class && (
            <CustomSelectorInput
              ref={classMappingTypeSelectorRef}
              options={classMappingTypeOptions}
              onChange={changeClassMappingType}
              value={classMappingType}
              disabled={config.options.TEMPORARY__disableNonModelStoreSupports}
              placeholder={`Choose a class mapping type`}
            />
          )}
          <button
            className="btn btn--primary u-pull-right"
            disabled={disableCreateButton}
            color="primary"
          >
            Create
          </button>
        </form>
      )}
      {!spec && <div />}
    </Dialog>
  );
});
