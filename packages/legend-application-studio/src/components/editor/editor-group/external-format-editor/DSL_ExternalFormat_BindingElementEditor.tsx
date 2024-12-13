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

import { observer } from 'mobx-react-lite';
import {
  type SelectComponent,
  clsx,
  CustomSelectorInput,
  TimesIcon,
  LockIcon,
  PanelDropZone,
  PanelFormSection,
} from '@finos/legend-art';
import {
  capitalize,
  filterByType,
  guaranteeNonNullable,
  prettyCONSTName,
} from '@finos/legend-shared';
import {
  BINDING_TAB_TYPE,
  BindingEditorState,
} from '../../../../stores/editor/editor-state/element-editor-state/external-format/DSL_ExternalFormat_BindingEditorState.js';
import {
  PackageableElementExplicitReference,
  SchemaSet,
  type ModelUnit,
  type PackageableElement,
  type PackageableElementReference,
} from '@finos/legend-graph';
import { useCallback, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { useEditorStore } from '../../EditorStoreProvider.js';
import { getElementIcon } from '../../../ElementIconUtils.js';
import {
  CORE_DND_TYPE,
  type ElementDragSource,
  type UMLEditorElementDropTarget,
} from '../../../../stores/editor/utils/DnDUtils.js';
import {
  externalFormat_Binding_setContentType,
  externalFormat_Binding_setSchemaId,
  externalFormat_Binding_setSchemaSet,
  externalFormat_modelUnit_addPackageableElementExcludes,
  externalFormat_modelUnit_addPackageableElementIncludes,
  externalFormat_modelUnit_deletePackageableElementExcludes,
  externalFormat_modelUnit_deletePackageableElementIncludes,
} from '../../../../stores/graph-modifier/DSL_ExternalFormat_GraphModifierHelper.js';
import { useApplicationNavigationContext } from '@finos/legend-application';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../__lib__/LegendStudioApplicationNavigationContext.js';

const ModelUnitPackagableElementEntryEditor = observer(
  (props: {
    elementRef: PackageableElementReference<PackageableElement>;
    removeElement: (
      val: PackageableElementReference<PackageableElement>,
    ) => void;
    isReadOnly: boolean;
  }) => {
    const { elementRef, removeElement, isReadOnly } = props;
    const editorStore = useEditorStore();
    return (
      <div
        key={elementRef.value.path}
        className="panel__content__form__section__list__item"
      >
        <>
          <div className="panel__content__form__section__list__item__value model-unit-entry-editor__element">
            {
              <div className="model-unit-entry-editor__element__icon">
                {getElementIcon(elementRef.value, editorStore)}
              </div>
            }
            <div className="model-unit-entry-editor__element__path">
              {elementRef.value.path}
            </div>
          </div>
          <div className="panel__content__form__section__list__item__actions">
            <button
              className="panel__content__form__section__list__item__remove-btn"
              disabled={isReadOnly}
              onClick={(): void => removeElement(elementRef)}
              tabIndex={-1}
            >
              <TimesIcon />
            </button>
          </div>
        </>
      </div>
    );
  },
);

const ModelUnitPackageElementEditor = observer(
  (props: {
    elements: PackageableElementReference<PackageableElement>[];
    addElement: () => void;
    removeElement: (
      val: PackageableElementReference<PackageableElement>,
    ) => void;
    allowAddingElement: boolean;
    handleDropElement: (item: UMLEditorElementDropTarget) => void;
    isReadOnly: boolean;
  }) => {
    const {
      elements,
      addElement,
      removeElement,
      allowAddingElement,
      handleDropElement,
      isReadOnly,
    } = props;
    const [{ isElementDragOver }, dropConnector] = useDrop<
      ElementDragSource,
      void,
      { isElementDragOver: boolean }
    >(
      () => ({
        accept: [
          CORE_DND_TYPE.PROJECT_EXPLORER_ENUMERATION,
          CORE_DND_TYPE.PROJECT_EXPLORER_PACKAGE,
          CORE_DND_TYPE.PROJECT_EXPLORER_CLASS,
          CORE_DND_TYPE.PROJECT_EXPLORER_PROFILE,
          CORE_DND_TYPE.PROJECT_EXPLORER_ASSOCIATION,
          CORE_DND_TYPE.PROJECT_EXPLORER_FUNCTION,
        ],
        drop: (item) => handleDropElement(item),
        collect: (monitor) => ({
          isElementDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDropElement],
    );

    return (
      <div className="model-unit-editor">
        <div className="model-unit-editor__panel__content">
          <PanelDropZone
            dropTargetConnector={dropConnector}
            isDragOver={isElementDragOver && !isReadOnly}
          >
            <div className="model-unit-editor__panel__content__form__section">
              <div className="model-unit-editor__panel__content__form__section__list">
                {elements.map((elementRef) => (
                  <ModelUnitPackagableElementEntryEditor
                    key={elementRef.value._UUID}
                    elementRef={elementRef}
                    removeElement={removeElement}
                    isReadOnly={isReadOnly}
                  />
                ))}
                <div className="model-unit-editor__panel__content__form__section__list__new-item__add">
                  <button
                    className="model-unit-editor__panel__content__form__section__list__new-item__add-btn btn btn--dark"
                    disabled={!allowAddingElement}
                    tabIndex={-1}
                    onClick={addElement}
                    title="Add Element"
                  >
                    Add Value
                  </button>
                </div>
              </div>
            </div>
          </PanelDropZone>
        </div>
      </div>
    );
  },
);

const BindingGeneralEditor = observer(
  (props: { editorState: BindingEditorState; isReadOnly: boolean }) => {
    const { editorState, isReadOnly } = props;
    const editorStore = useEditorStore();
    const applicationStore = editorStore.applicationStore;
    const binding = editorState.binding;
    const schemaSets = Array.from(
      editorStore.graphManagerState.graph.allOwnElements,
    ).filter(filterByType(SchemaSet));
    const schemaSetOptions = schemaSets.map((e) => ({
      value: e,
      label: e.path,
    }));
    const onSchemaSetChange = (val: {
      label: string;
      value: SchemaSet;
    }): void => {
      externalFormat_Binding_setSchemaId(binding, undefined);
      return externalFormat_Binding_setSchemaSet(
        binding,
        PackageableElementExplicitReference.create(val.value),
      );
    };
    const selectedSchemaSet = binding.schemaSet
      ? {
          label: binding.schemaSet.valueForSerialization ?? '',
          value: binding.schemaSet.value,
        }
      : null;
    const schemaIdOptions = selectedSchemaSet?.value.schemas
      .filter((e) => e.id)
      .map((e) => ({
        value: guaranteeNonNullable(e.id),
        label: guaranteeNonNullable(e.id),
      }));
    const onSchemaIdChange = (
      val: { label: string; value: string } | null,
    ): void => externalFormat_Binding_setSchemaId(binding, val?.value);
    const selectedSchemaId = binding.schemaId
      ? {
          value: binding.schemaId,
          label: binding.schemaId,
        }
      : null;
    const projectSelectorRef = useRef<SelectComponent>(null);
    const contentTypeOptions =
      editorStore.graphState.graphGenerationState.externalFormatState.formatContentTypes.map(
        (e) => ({
          value: e,
          label: e,
        }),
      );
    const onContentTypeChange = (val: { label: string; value: string }): void =>
      externalFormat_Binding_setContentType(binding, val.value);
    const selectedContentType = {
      value: binding.contentType,
      label: binding.contentType,
    };
    return (
      <div className="binding-general-editor">
        <div className="binding-general-editor__section__header__label">
          Content Type
        </div>
        <div>
          <CustomSelectorInput
            className="binding-general-editor__section__dropdown"
            disabled={isReadOnly}
            options={contentTypeOptions}
            onChange={onContentTypeChange}
            value={selectedContentType}
            placeholder="Choose a content type"
            darkMode={
              !applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
          />
        </div>
        <div className="binding-general-editor__section__header__label">
          Schema Set
        </div>
        <div className="binding-general-editor__content">
          <CustomSelectorInput
            className="binding-general-editor__section__dropdown"
            disabled={isReadOnly}
            inputRef={projectSelectorRef}
            options={schemaSetOptions}
            onChange={onSchemaSetChange}
            value={selectedSchemaSet}
            isClearable={true}
            placeholder="Choose a schema set"
            darkMode={
              !applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
          />
        </div>
        <div className="binding-general-editor__section__header__label">
          Schema ID
        </div>
        <div className="binding-general-editor__content">
          <CustomSelectorInput
            className="binding-general-editor__section__dropdown"
            disabled={isReadOnly}
            inputRef={projectSelectorRef}
            options={schemaIdOptions}
            onChange={onSchemaIdChange}
            value={selectedSchemaId}
            isClearable={true}
            placeholder="Choose a schema ID"
            darkMode={
              !applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
          />
        </div>
      </div>
    );
  },
);

export const ModelUnitEditor = observer(
  (props: { modelUnit: ModelUnit; isReadOnly: boolean }) => {
    const editorStore = useEditorStore();
    const { modelUnit, isReadOnly } = props;
    const graph = editorStore.graphManagerState.graph;
    const allowedElements = [
      ...graph.ownProfiles,
      ...graph.ownEnumerations,
      ...graph.ownClasses,
      ...graph.ownAssociations,
      ...graph.ownFunctions,
    ];
    const elements = allowedElements.filter(
      (element) =>
        !modelUnit.packageableElementIncludes
          .map((e) => e.value)
          .includes(element) &&
        !modelUnit.packageableElementExcludes
          .map((e) => e.value)
          .includes(element),
    );
    const allowAddingElement = !isReadOnly && Boolean(elements.length);
    const addInclusion = (): void => {
      if (allowAddingElement) {
        externalFormat_modelUnit_addPackageableElementIncludes(
          modelUnit,
          PackageableElementExplicitReference.create(
            guaranteeNonNullable(elements[0]),
          ),
        );
      }
    };
    const addExclusion = (): void => {
      if (allowAddingElement) {
        externalFormat_modelUnit_addPackageableElementExcludes(
          modelUnit,
          PackageableElementExplicitReference.create(
            guaranteeNonNullable(elements[0]),
          ),
        );
      }
    };
    const removeInclusion = (
      val: PackageableElementReference<PackageableElement>,
    ): void =>
      externalFormat_modelUnit_deletePackageableElementIncludes(modelUnit, val);
    const removeExclusion = (
      val: PackageableElementReference<PackageableElement>,
    ): void =>
      externalFormat_modelUnit_deletePackageableElementExcludes(modelUnit, val);
    const handleDropInclusion = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        const element = item.data.packageableElement;
        if (
          !isReadOnly &&
          !modelUnit.packageableElementIncludes
            .map((e) => e.value)
            .includes(element)
        ) {
          externalFormat_modelUnit_addPackageableElementIncludes(
            modelUnit,
            PackageableElementExplicitReference.create(element),
          );
        }
      },
      [isReadOnly, modelUnit],
    );
    const handleDropExclusion = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        const element = item.data.packageableElement;
        if (
          !isReadOnly &&
          !modelUnit.packageableElementExcludes
            .map((e) => e.value)
            .includes(element)
        ) {
          externalFormat_modelUnit_addPackageableElementExcludes(
            modelUnit,
            PackageableElementExplicitReference.create(element),
          );
        }
      },
      [isReadOnly, modelUnit],
    );

    return (
      <>
        <PanelFormSection>
          <div className="panel__content__form__section__header__label">
            <div className="panel__content__form__section__header__label__text">
              {capitalize('Model Includes')}
            </div>
          </div>
          <div className="panel__content__form__section__header__prompt">
            Specifies the list of models included
          </div>
          <ModelUnitPackageElementEditor
            elements={modelUnit.packageableElementIncludes}
            addElement={addInclusion}
            removeElement={removeInclusion}
            allowAddingElement={allowAddingElement}
            handleDropElement={handleDropInclusion}
            isReadOnly={isReadOnly}
          />
        </PanelFormSection>
        <PanelFormSection>
          <div className="panel__content__form__section__header__label">
            <div className="panel__content__form__section__header__label__text">
              {capitalize('Model Excludes')}
            </div>
          </div>
          <div className="panel__content__form__section__header__prompt">
            Specifies the list of models excluded
          </div>
          <ModelUnitPackageElementEditor
            elements={modelUnit.packageableElementExcludes}
            addElement={addExclusion}
            removeElement={removeExclusion}
            allowAddingElement={allowAddingElement}
            handleDropElement={handleDropExclusion}
            isReadOnly={isReadOnly}
          />
        </PanelFormSection>
      </>
    );
  },
);

export const BindingEditor = observer(() => {
  const editorStore = useEditorStore();
  const editorState =
    editorStore.tabManagerState.getCurrentEditorState(BindingEditorState);
  const binding = editorState.binding;
  const modelUnit = binding.modelUnit;
  const isReadOnly = editorState.isReadOnly;
  const selectedTab = editorState.selectedTab;
  const changeTab =
    (tab: BINDING_TAB_TYPE): (() => void) =>
    (): void =>
      editorState.setSelectedTab(tab);

  useApplicationNavigationContext(
    LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.BINDING_EDITOR,
  );

  return (
    <div className="binding-editor">
      <div className="binding-editor__header">
        <div className="binding-editor__header__title">
          {isReadOnly && (
            <div className="binding-editor__header__lock">
              <LockIcon />
            </div>
          )}
          <div className="binding-editor__header__title__label">Binding</div>
          <div className="binding-editor__header__title__content">
            {binding.name}
          </div>
        </div>
      </div>
      <div className="uml-element-editor__tabs">
        {Object.values(BINDING_TAB_TYPE).map((tab) => (
          <div
            key={tab}
            onClick={changeTab(tab)}
            className={clsx('relational-connection-editor__tab', {
              'relational-connection-editor__tab--active': tab === selectedTab,
            })}
          >
            {prettyCONSTName(tab)}
          </div>
        ))}
      </div>
      <div className="binding-editor_content">
        {selectedTab === BINDING_TAB_TYPE.GENERAL && (
          <>
            <div className="binding-editor__header">
              <div className="binding-editor__header__title">
                {isReadOnly && (
                  <div className="element-editor__header__lock">
                    <LockIcon />
                  </div>
                )}
                <div className="binding-editor__header__title__label">
                  General
                </div>
              </div>
            </div>
            <div className="binding-editor__content">
              <div className="binding-editor__content__lists">
                <BindingGeneralEditor
                  editorState={editorState}
                  isReadOnly={isReadOnly}
                />
              </div>
            </div>
          </>
        )}
        {selectedTab === BINDING_TAB_TYPE.MODELS && (
          <>
            <div className="binding-editor__header">
              <div className="binding-editor__header__title">
                {isReadOnly && (
                  <div className="element-editor__header__lock">
                    <LockIcon />
                  </div>
                )}
                <div className="binding-editor__header__title__label">
                  Model Unit
                </div>
              </div>
            </div>
            <div className="binding-editor__content">
              <div className="binding-editor__content__lists">
                <div className="binding-editor__model-unit-editor">
                  <ModelUnitEditor
                    modelUnit={modelUnit}
                    isReadOnly={isReadOnly}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
});
