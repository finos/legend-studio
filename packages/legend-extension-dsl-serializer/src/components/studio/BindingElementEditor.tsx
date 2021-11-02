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
import type { SelectComponent } from '@finos/legend-art';
import { TimesIcon } from '@finos/legend-art';
import {
  clsx,
  CustomSelectorInput,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
} from '@finos/legend-art';
import { guaranteeNonNullable, prettyCONSTName } from '@finos/legend-shared';
import type {
  ElementDragSource,
  UMLEditorElementDropTarget,
} from '@finos/legend-studio';
import {
  CORE_DND_TYPE,
  useEditorStore,
  getElementIcon,
} from '@finos/legend-studio';
import {
  BINDING_TAB_TYPE,
  BindingEditorState,
} from '../../stores/studio/BindingEditorState';
import { FaLock } from 'react-icons/fa';
import { SchemaSet } from '../../models/metamodels/pure/model/packageableElements/schemaSet/SchemaSet';
import type {
  OptionalPackageableElementReference,
  PackageableElement,
  PackageableElementReference,
} from '@finos/legend-graph';
import { PackageableElementExplicitReference } from '@finos/legend-graph';
import { useCallback, useRef } from 'react';
import { BINDING_CONTENT_TYPE } from '../../models/metamodels/pure/model/packageableElements/store/Binding';
import { useDrop } from 'react-dnd';
import type { ModelUnit } from '../../models/metamodels/pure/model/packageableElements/store/ModelUnit';

enum BINDING_MODEL_UNIT {
  ELEMENT_INCLUDE = 'ELEMENT_INCLUDE',
  ELEMENT_EXCLUDE = 'ELEMENT_EXCLUDE',
}

const BindingScopeEntryEditor = observer(
  (props: {
    elementRef: PackageableElementReference<PackageableElement>;
    removeElement: (
      val: PackageableElementReference<PackageableElement>,
      label: BINDING_MODEL_UNIT,
    ) => void;
    label: BINDING_MODEL_UNIT;
    isReadOnly: boolean;
  }) => {
    const { elementRef, removeElement, label, isReadOnly } = props;
    const editorStore = useEditorStore();
    return (
      <div
        key={elementRef.value.path}
        className="panel__content__form__section__list__item"
      >
        <>
          <div className="panel__content__form__section__list__item__value binding-scope-entry-editor__element">
            {
              <div className="binding-scope-entry-editor__element__icon">
                {getElementIcon(editorStore, elementRef.value)}
              </div>
            }
            <div className="binding-scope-entry-editor__element__path">
              {elementRef.value.path}
            </div>
          </div>
          <div className="panel__content__form__section__list__item__actions">
            <button
              className="panel__content__form__section__list__item__remove-btn"
              disabled={isReadOnly}
              onClick={(): void => removeElement(elementRef, label)}
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

const BindingScopeEditor = observer(
  (props: {
    modelUnitState: ModelUnit;
    addElement: (label: BINDING_MODEL_UNIT) => void;
    removeElement: (
      val: PackageableElementReference<PackageableElement>,
      label: BINDING_MODEL_UNIT,
    ) => void;
    label: BINDING_MODEL_UNIT;
    allowAddingElement: boolean;
    isReadOnly: boolean;
  }) => {
    const {
      modelUnitState,
      addElement,
      removeElement,
      label,
      allowAddingElement,
      isReadOnly,
    } = props;
    const handleDropElement = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        const element = item.data.packageableElement;
        if (
          !isReadOnly &&
          label === BINDING_MODEL_UNIT.ELEMENT_INCLUDE &&
          !modelUnitState.packageableElementIncludes
            .map((element) => element.value)
            .includes(element)
        ) {
          modelUnitState.addPackageableElementIncludes(
            PackageableElementExplicitReference.create(element),
          );
        } else if (
          !isReadOnly &&
          label === BINDING_MODEL_UNIT.ELEMENT_EXCLUDE &&
          !modelUnitState.packageableElementExcludes
            .map((element) => element.value)
            .includes(element)
        ) {
          modelUnitState.addPackageableElementExcludes(
            PackageableElementExplicitReference.create(element),
          );
        }
      },
      [isReadOnly, modelUnitState, label],
    );
    const [{ isElementDragOver }, dropElementRef] = useDrop(
      () => ({
        accept: [
          CORE_DND_TYPE.PROJECT_EXPLORER_ENUMERATION,
          CORE_DND_TYPE.PROJECT_EXPLORER_PACKAGE,
          CORE_DND_TYPE.PROJECT_EXPLORER_CLASS,
          CORE_DND_TYPE.PROJECT_EXPLORER_PROFILE,
          CORE_DND_TYPE.PROJECT_EXPLORER_ASSOCIATION,
          CORE_DND_TYPE.PROJECT_EXPLORER_FUNCTION,
        ],
        drop: (item: ElementDragSource): void => handleDropElement(item),
        collect: (monitor): { isElementDragOver: boolean } => ({
          isElementDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDropElement],
    );

    return (
      <div className="binding-scope-editor">
        <div className="binding-scope-editor__panel__header">
          <div className="binding-scope-editor__panel__header__title">
            <div className="binding-scope-editor__panel__header__title__label">
              {label === BINDING_MODEL_UNIT.ELEMENT_INCLUDE
                ? `Model Includes`
                : `Model Excludes`}
            </div>
          </div>
        </div>
        <div
          ref={dropElementRef}
          className="binding-scope-editor__panel__content dnd__overlay__container"
        >
          <div
            className={clsx({ dnd__overlay: isElementDragOver && !isReadOnly })}
          />
          <div className="binding-scope-editor__panel__content__form">
            <div className="binding-scope-editor__panel__content__form__section">
              <div className="binding-scope-editor__panel__content__form__section__header__prompt">
                {label === BINDING_MODEL_UNIT.ELEMENT_INCLUDE
                  ? `Specifies the list of models included`
                  : `Specifies the list of models excluded`}
              </div>
              <div className="binding-scope-editor__panel__content__form__section__list">
                {label === BINDING_MODEL_UNIT.ELEMENT_INCLUDE &&
                  modelUnitState.packageableElementIncludes.map(
                    (elementRef) => (
                      <BindingScopeEntryEditor
                        key={elementRef.value.uuid}
                        elementRef={elementRef}
                        removeElement={removeElement}
                        label={label}
                        isReadOnly={isReadOnly}
                      />
                    ),
                  )}
                {label === BINDING_MODEL_UNIT.ELEMENT_EXCLUDE &&
                  modelUnitState.packageableElementExcludes.map(
                    (elementRef) => (
                      <BindingScopeEntryEditor
                        key={elementRef.value.uuid}
                        elementRef={elementRef}
                        removeElement={removeElement}
                        label={label}
                        isReadOnly={isReadOnly}
                      />
                    ),
                  )}

                <div className="binding-scope-editor__panel__content__form__section__list__new-item__add">
                  <button
                    className="binding-scope-editor__panel__content__form__section__list__new-item__add-btn btn btn--dark"
                    disabled={!allowAddingElement}
                    tabIndex={-1}
                    onClick={(): void => addElement(label)}
                    title="Add Element"
                  >
                    Add Value
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

const BindingGeneralEditor = observer(
  (props: { editorState: BindingEditorState; isReadOnly: boolean }) => {
    const { editorState, isReadOnly } = props;
    const editorStore = useEditorStore();
    const binding = editorState.binding;
    const schemaSets = Array.from(
      editorStore.graphManagerState.graph.allOwnElements,
    ).filter(
      (element: PackageableElement): element is SchemaSet =>
        element instanceof SchemaSet,
    );
    const schemaSetOptions = schemaSets.map((e) => ({
      value: PackageableElementExplicitReference.create(e),
      label: e.path,
    }));
    const onSchemaSetChange = (val: {
      label: string;
      value: OptionalPackageableElementReference<SchemaSet>;
    }): void => {
      binding.setSchemaId(undefined);
      return binding.setSchemaSet(val?.value);
    };
    const selectedSchemaSet = {
      value: binding.schemaSet,
      label: binding.schemaSet?.valueForSerialization,
    };
    const schemaIdOptions = selectedSchemaSet.value?.value?.schemas.map(
      (e) => ({
        value: e.id,
        label: e.id,
      }),
    );
    const onSchemaIdChange = (
      val: { label: string; value: string } | null,
    ): void => binding.setSchemaId(val?.value);
    const selectedSchemaId = {
      value: binding.schemaId,
      label: binding.schemaId,
    };
    const projectSelectorRef = useRef<SelectComponent>(null);
    const contentTypeOptions = Object.values(BINDING_CONTENT_TYPE).map((e) => ({
      value: e,
      label: e,
    }));
    const onContentTypeChange = (val: {
      label: BINDING_CONTENT_TYPE;
      value: BINDING_CONTENT_TYPE;
    }): void => binding.setContentType(val.value);
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
            darkMode={true}
          />
        </div>
        <div className="binding-general-editor__section__header__label">
          Schema Set
        </div>
        <div className="binding-general-editor__content">
          <CustomSelectorInput
            className="binding-general-editor__section__dropdown"
            disabled={isReadOnly}
            ref={projectSelectorRef}
            options={schemaSetOptions}
            onChange={onSchemaSetChange}
            value={selectedSchemaSet}
            isClearable={true}
            placeholder="Choose a schema set"
            darkMode={true}
          />
        </div>
        <div className="binding-general-editor__section__header__label">
          Schema ID
        </div>
        <div className="binding-general-editor__content">
          <CustomSelectorInput
            className="binding-general-editor__section__dropdown"
            disabled={isReadOnly}
            ref={projectSelectorRef}
            options={schemaIdOptions}
            onChange={onSchemaIdChange}
            value={selectedSchemaId}
            isClearable={true}
            placeholder="Choose a schema ID"
            darkMode={true}
          />
        </div>
      </div>
    );
  },
);

export const BindingEditor = observer(() => {
  const editorStore = useEditorStore();
  const editorState = editorStore.getCurrentEditorState(BindingEditorState);
  const binding = editorState.binding;
  const modelUnit = binding.modelUnit;
  const isReadOnly = editorState.isReadOnly;
  const selectedTab = editorState.selectedTab;
  const changeTab =
    (tab: BINDING_TAB_TYPE): (() => void) =>
    (): void =>
      editorState.setSelectedTab(tab);
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
        .map((element) => element.value)
        .includes(element) &&
      !modelUnit.packageableElementExcludes
        .map((element) => element.value)
        .includes(element),
  );
  const allowAddingElement = !isReadOnly && Boolean(elements.length);
  const addElement = (label: BINDING_MODEL_UNIT): void => {
    if (allowAddingElement) {
      if (label === BINDING_MODEL_UNIT.ELEMENT_INCLUDE) {
        modelUnit.addPackageableElementIncludes(
          PackageableElementExplicitReference.create(
            guaranteeNonNullable(elements[0]),
          ),
        );
      } else {
        modelUnit.addPackageableElementExcludes(
          PackageableElementExplicitReference.create(
            guaranteeNonNullable(elements[0]),
          ),
        );
      }
    }
  };
  const removeElement = (
    val: PackageableElementReference<PackageableElement>,
    label: BINDING_MODEL_UNIT,
  ): void => {
    if (label === BINDING_MODEL_UNIT.ELEMENT_INCLUDE) {
      return modelUnit.deletePackageableElementIncludes(val);
    }
    return modelUnit.deletePackageableElementExcludes(val);
  };
  return (
    <div className="binding-editor">
      <div className="binding-editor__header">
        <div className="binding-editor__header__title">
          {isReadOnly && (
            <div className="binding-editor__header__lock">
              <FaLock />
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
                    <FaLock />
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
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel minSize={280} maxSize={550}>
              <BindingScopeEditor
                key={editorState.uuid}
                modelUnitState={modelUnit}
                addElement={addElement}
                removeElement={removeElement}
                label={BINDING_MODEL_UNIT.ELEMENT_INCLUDE}
                allowAddingElement={allowAddingElement}
                isReadOnly={isReadOnly}
              />
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel>
              <BindingScopeEditor
                key={editorState.uuid}
                modelUnitState={modelUnit}
                addElement={addElement}
                removeElement={removeElement}
                label={BINDING_MODEL_UNIT.ELEMENT_EXCLUDE}
                allowAddingElement={allowAddingElement}
                isReadOnly={isReadOnly}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
});
