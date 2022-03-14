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
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  TimesIcon,
  LockIcon,
} from '@finos/legend-art';
import { guaranteeNonNullable, prettyCONSTName } from '@finos/legend-shared';
import {
  BINDING_TAB_TYPE,
  BindingEditorState,
} from '../../../../stores/editor-state/element-editor-state/externalFormat/BindingEditorState';
import {
  PackageableElementExplicitReference,
  SchemaSet,
  type PackageableElement,
  type PackageableElementReference,
} from '@finos/legend-graph';
import { useCallback, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { useEditorStore } from '../../EditorStoreProvider';
import { getElementIcon } from '../../../shared/ElementIconUtils';
import {
  CORE_DND_TYPE,
  type ElementDragSource,
  type UMLEditorElementDropTarget,
} from '../../../../stores/shared/DnDUtil';

const BindingScopeEntryEditor = observer(
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

const BindingScopeEditor = observer(
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
        <div
          ref={dropElementRef}
          className="binding-scope-editor__panel__content dnd__overlay__container"
        >
          <div
            className={clsx({ dnd__overlay: isElementDragOver && !isReadOnly })}
          />
          <div className="binding-scope-editor__panel__content__form">
            <div className="binding-scope-editor__panel__content__form__section">
              <div className="binding-scope-editor__panel__content__form__section__list">
                {elements.map((elementRef) => (
                  <BindingScopeEntryEditor
                    key={elementRef.value.uuid}
                    elementRef={elementRef}
                    removeElement={removeElement}
                    isReadOnly={isReadOnly}
                  />
                ))}
                <div className="binding-scope-editor__panel__content__form__section__list__new-item__add">
                  <button
                    className="binding-scope-editor__panel__content__form__section__list__new-item__add-btn btn btn--dark"
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
      value: e,
      label: e.path,
    }));
    const onSchemaSetChange = (val: {
      label: string;
      value: SchemaSet;
    }): void => {
      binding.setSchemaId(undefined);
      return binding.setSchemaSet(val.value);
    };
    const selectedSchemaSet = {
      value: binding.schemaSet,
      label: binding.schemaSet.valueForSerialization,
    };
    const schemaIdOptions = selectedSchemaSet.value.value?.schemas.map((e) => ({
      value: e.id,
      label: e.id,
    }));
    const onSchemaIdChange = (
      val: { label: string; value: string } | null,
    ): void => binding.setSchemaId(val?.value);
    const selectedSchemaId = {
      value: binding.schemaId,
      label: binding.schemaId,
    };
    const projectSelectorRef = useRef<SelectComponent>(null);
    const contentTypeOptions =
      editorStore.graphState.graphGenerationState.externalFormatState.formatContentTypes.map(
        (e) => ({
          value: e,
          label: e,
        }),
      );
    const onContentTypeChange = (val: { label: string; value: string }): void =>
      binding.setContentType(val.value);
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
  const addInclusion = (): void => {
    if (allowAddingElement) {
      modelUnit.addPackageableElementIncludes(
        PackageableElementExplicitReference.create(
          guaranteeNonNullable(elements[0]),
        ),
      );
    }
  };
  const addExclusion = (): void => {
    if (allowAddingElement) {
      modelUnit.addPackageableElementExcludes(
        PackageableElementExplicitReference.create(
          guaranteeNonNullable(elements[0]),
        ),
      );
    }
  };
  const removeInclusion = (
    val: PackageableElementReference<PackageableElement>,
  ): void => modelUnit.deletePackageableElementIncludes(val);
  const removeExclusion = (
    val: PackageableElementReference<PackageableElement>,
  ): void => modelUnit.deletePackageableElementExcludes(val);
  const handleDropInclusion = useCallback(
    (item: UMLEditorElementDropTarget): void => {
      const element = item.data.packageableElement;
      if (
        !isReadOnly &&
        !modelUnit.packageableElementIncludes
          .map((element) => element.value)
          .includes(element)
      ) {
        modelUnit.addPackageableElementIncludes(
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
          .map((element) => element.value)
          .includes(element)
      ) {
        modelUnit.addPackageableElementExcludes(
          PackageableElementExplicitReference.create(element),
        );
      }
    },
    [isReadOnly, modelUnit],
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
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel minSize={280} maxSize={550}>
              <div className="binding-editor__header">
                <div className="binding-editor__header__title">
                  <div className="binding-editor__header__title__label">
                    Model Includes
                  </div>
                </div>
              </div>
              <div className="binding-editor__header__prompt">
                Specifies the list of models included
              </div>
              <BindingScopeEditor
                key={editorState.uuid}
                elements={modelUnit.packageableElementIncludes}
                addElement={addInclusion}
                removeElement={removeInclusion}
                allowAddingElement={allowAddingElement}
                handleDropElement={handleDropInclusion}
                isReadOnly={isReadOnly}
              />
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel>
              <div className="binding-editor__header">
                <div className="binding-editor__header__title">
                  <div className="binding-editor__header__title__label">
                    Model Excludes
                  </div>
                </div>
              </div>
              <div className="binding-editor__header__prompt">
                Specifies the list of models excluded
              </div>
              <BindingScopeEditor
                key={editorState.uuid}
                elements={modelUnit.packageableElementExcludes}
                addElement={addExclusion}
                removeElement={removeExclusion}
                allowAddingElement={allowAddingElement}
                handleDropElement={handleDropExclusion}
                isReadOnly={isReadOnly}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
});
