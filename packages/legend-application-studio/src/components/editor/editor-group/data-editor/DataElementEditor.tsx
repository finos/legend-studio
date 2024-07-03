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
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  DATA_TAB_TYPE,
  type EmbeddedDataEditorState,
  PackageableDataEditorState,
} from '../../../../stores/editor/editor-state/element-editor-state/data/DataEditorState.js';
import {
  CaretDownIcon,
  clsx,
  ControlledDropdownMenu,
  InfoCircleIcon,
  LockIcon,
  MenuContent,
  MenuContentItem,
  PanelContentLists,
  PanelDropZone,
  PlusIcon,
} from '@finos/legend-art';
import { prettyCONSTName } from '@finos/legend-shared';
import {
  type TaggedValue,
  type StereotypeReference,
  StereotypeExplicitReference,
  Profile,
  stub_Stereotype,
  stub_Profile,
  stub_TaggedValue,
  stub_Tag,
} from '@finos/legend-graph';
import {
  annotatedElement_addStereotype,
  annotatedElement_addTaggedValue,
  annotatedElement_deleteStereotype,
  annotatedElement_deleteTaggedValue,
} from '../../../../stores/graph-modifier/DomainGraphModifierHelper.js';
import { useDrop } from 'react-dnd';
import {
  CORE_DND_TYPE,
  type UMLEditorElementDropTarget,
  type ElementDragSource,
} from '../../../../stores/editor/utils/DnDUtils.js';
import {
  TaggedValueDragPreviewLayer,
  TaggedValueEditor,
} from '../uml-editor/TaggedValueEditor.js';
import { useCallback, useEffect, useRef } from 'react';
import {
  StereotypeDragPreviewLayer,
  StereotypeSelector,
} from '../uml-editor/StereotypeSelector.js';
import {
  externalFormatData_setContentType,
  externalFormatData_setData,
} from '../../../../stores/graph-modifier/DSL_Data_GraphModifierHelper.js';
import type { ExternalFormatDataState } from '../../../../stores/editor/editor-state/element-editor-state/data/EmbeddedDataState.js';
import { renderEmbeddedDataEditor } from './EmbeddedDataEditor.js';
import {
  useApplicationNavigationContext,
  useApplicationStore,
} from '@finos/legend-application';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../__lib__/LegendStudioApplicationNavigationContext.js';
import { LEGEND_STUDIO_DOCUMENTATION_KEY } from '../../../../__lib__/LegendStudioDocumentation.js';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import { getEditorLanguageForFormat } from '../../../../stores/editor/editor-state/ArtifactGenerationViewerState.js';

export const ExternalFormatDataEditor = observer(
  (props: {
    externalFormatDataState: ExternalFormatDataState;
    isReadOnly: boolean;
  }) => {
    const { externalFormatDataState, isReadOnly } = props;
    const editorStore = useEditorStore();
    const typeNameRef = useRef<HTMLInputElement>(null);
    const changeData = (val: string): void =>
      externalFormatData_setData(externalFormatDataState.embeddedData, val);
    useEffect(() => {
      if (!isReadOnly) {
        typeNameRef.current?.focus();
      }
    }, [isReadOnly]);
    const contentTypeOptions =
      editorStore.graphState.graphGenerationState.externalFormatState
        .formatContentTypes;
    const onContentTypeChange = (val: string): void =>
      externalFormatData_setContentType(
        externalFormatDataState.embeddedData,
        val,
      );
    const language = getEditorLanguageForFormat(
      editorStore.graphState.graphGenerationState.externalFormatState.getFormatTypeForContentType(
        externalFormatDataState.embeddedData.contentType,
      ),
    );

    return (
      <div className="panel external-format-data-editor">
        <div className="external-format-data-editor__header">
          <div className="external-format-data-editor__header__title">
            {isReadOnly && (
              <div className="external-format-editor-editor__header__lock">
                <LockIcon />
              </div>
            )}
            <div className="external-format-data-editor__header__title__label">
              {externalFormatDataState.label()}
            </div>
          </div>
          <div className="external-format-data-editor__header__actions">
            <ControlledDropdownMenu
              className="external-format-data-editor__type"
              disabled={isReadOnly}
              content={
                <MenuContent className="external-format-data-editor__dropdown">
                  {contentTypeOptions.map((contentType) => (
                    <MenuContentItem
                      key={contentType}
                      className="external-format-data-editor__option"
                      onClick={(): void => onContentTypeChange(contentType)}
                    >
                      {contentType}
                    </MenuContentItem>
                  ))}
                </MenuContent>
              }
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                transformOrigin: { vertical: 'top', horizontal: 'right' },
              }}
            >
              <div className="external-format-data-editor__type__label">
                {externalFormatDataState.embeddedData.contentType}
              </div>
              <div className="external-format-data-editor__type__icon">
                <CaretDownIcon />
              </div>
            </ControlledDropdownMenu>
          </div>
        </div>
        <div className={clsx('external-format-data-editor__content')}>
          <div className="external-format-data-editor__content__input">
            <CodeEditor
              language={language}
              inputValue={externalFormatDataState.embeddedData.data}
              updateInput={changeData}
              hideGutter={true}
            />
          </div>
        </div>
      </div>
    );
  },
);

export const EmbeddedDataEditor = observer(
  (props: {
    embeddedDataEditorState: EmbeddedDataEditorState;
    isReadOnly: boolean;
  }) => {
    const { embeddedDataEditorState, isReadOnly } = props;
    const embeddedDataState = embeddedDataEditorState.embeddedDataState;
    return (
      <div className="panel connection-editor">
        {renderEmbeddedDataEditor(embeddedDataState, isReadOnly)}
      </div>
    );
  },
);

export const DataElementEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const editorState = editorStore.tabManagerState.getCurrentEditorState(
    PackageableDataEditorState,
  );
  const dataElement = editorState.data;
  const isReadOnly = editorState.isReadOnly;
  const selectedTab = editorState.selectedTab;
  const changeTab =
    (tab: DATA_TAB_TYPE): (() => void) =>
    (): void =>
      editorState.setSelectedTab(tab);
  const addStereotype = (): void => {
    annotatedElement_addStereotype(
      dataElement,
      StereotypeExplicitReference.create(stub_Stereotype(stub_Profile())),
    );
  };
  const addTaggedValue = (): void => {
    annotatedElement_addTaggedValue(
      dataElement,
      stub_TaggedValue(stub_Tag(stub_Profile())),
    );
  };
  const deleteTaggedValue =
    (val: TaggedValue): (() => void) =>
    (): void =>
      annotatedElement_deleteTaggedValue(dataElement, val);
  const _deleteStereotype =
    (val: StereotypeReference): (() => void) =>
    (): void =>
      annotatedElement_deleteStereotype(dataElement, val);
  const handleDropTaggedValue = useCallback(
    (item: UMLEditorElementDropTarget): void => {
      if (!isReadOnly && item.data.packageableElement instanceof Profile) {
        annotatedElement_addTaggedValue(
          dataElement,
          stub_TaggedValue(stub_Tag(item.data.packageableElement)),
        );
      }
    },
    [dataElement, isReadOnly],
  );
  const [{ isTaggedValueDragOver }, dropTaggedValueRef] = useDrop<
    ElementDragSource,
    void,
    { isTaggedValueDragOver: boolean }
  >(
    () => ({
      accept: [CORE_DND_TYPE.PROJECT_EXPLORER_PROFILE],
      drop: (item) => handleDropTaggedValue(item),
      collect: (monitor) => ({
        isTaggedValueDragOver: monitor.isOver({ shallow: true }),
      }),
    }),
    [handleDropTaggedValue],
  );
  const handleDropStereotype = useCallback(
    (item: UMLEditorElementDropTarget): void => {
      if (!isReadOnly && item.data.packageableElement instanceof Profile) {
        annotatedElement_addStereotype(
          dataElement,
          StereotypeExplicitReference.create(
            stub_Stereotype(item.data.packageableElement),
          ),
        );
      }
    },
    [dataElement, isReadOnly],
  );
  const [{ isStereotypeDragOver }, dropStereotypeRef] = useDrop<
    ElementDragSource,
    void,
    { isStereotypeDragOver: boolean }
  >(
    () => ({
      accept: [CORE_DND_TYPE.PROJECT_EXPLORER_PROFILE],
      drop: (item) => handleDropStereotype(item),
      collect: (monitor) => ({
        isStereotypeDragOver: monitor.isOver({ shallow: true }),
      }),
    }),
    [handleDropStereotype],
  );
  const seeDocumentation = (): void =>
    applicationStore.assistantService.openDocumentationEntry(
      LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_HOW_TO_CREATE_A_DATA_ELEMENT,
    );

  useApplicationNavigationContext(
    LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.DATA_ELEMENT_EDITOR,
  );

  return (
    <div className="data-editor">
      <div className="data-editor__header">
        <div className="data-editor__header__title">
          {isReadOnly && (
            <div className="data-editor__header__lock">
              <LockIcon />
            </div>
          )}
          <div className="data-editor__header__title__label">
            Data Element
            <button
              className="binding-editor__header__title__label__hint"
              tabIndex={-1}
              onClick={seeDocumentation}
              title="click to see more details on creating a data element"
            >
              <InfoCircleIcon />
            </button>
          </div>

          <div className="data-editor__header__title__content">
            {dataElement.name}
          </div>
        </div>
      </div>
      <div className="uml-element-editor__tabs">
        {Object.values(DATA_TAB_TYPE).map((tab) => (
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
      <div className="data-editor__content">
        {selectedTab === DATA_TAB_TYPE.GENERAL && (
          <EmbeddedDataEditor
            embeddedDataEditorState={editorState.embeddedDataState}
            isReadOnly={isReadOnly}
          />
        )}
        {selectedTab === DATA_TAB_TYPE.STEREOTYPES && (
          <>
            <div className="data-editor__header">
              <div className="data-editor__header__title">
                {isReadOnly && (
                  <div className="element-editor__header__lock">
                    <LockIcon />
                  </div>
                )}
                <div className="data-editor__header__title__label">
                  Stereotypes
                </div>
              </div>
              <div className="data-editor__header__actions">
                <button
                  className="data-editor__header__action"
                  onClick={addStereotype}
                  disabled={isReadOnly}
                  tabIndex={-1}
                  title="Add Stereotype"
                >
                  <PlusIcon />
                </button>
              </div>
            </div>
            <div className="data-editor__content">
              <div className="data-editor__content__lists">
                <PanelDropZone
                  isDragOver={isStereotypeDragOver && !isReadOnly}
                  dropTargetConnector={dropStereotypeRef}
                >
                  <PanelContentLists>
                    <StereotypeDragPreviewLayer />
                    {dataElement.stereotypes.map((stereotype) => (
                      <StereotypeSelector
                        key={stereotype.value._UUID}
                        annotatedElement={dataElement}
                        stereotype={stereotype}
                        deleteStereotype={_deleteStereotype(stereotype)}
                        isReadOnly={isReadOnly}
                        darkTheme={true}
                      />
                    ))}
                  </PanelContentLists>
                </PanelDropZone>
              </div>
            </div>
          </>
        )}
        {selectedTab === DATA_TAB_TYPE.TAGGED_VALUES && (
          <>
            <div className="data-editor__header">
              <div className="data-editor__header__title">
                {isReadOnly && (
                  <div className="data-editor__header__lock">
                    <LockIcon />
                  </div>
                )}
                <div className="data-editor__header__title__label">
                  Tagged Values
                </div>
              </div>
              <div className="data-editor__header__actions">
                <button
                  className="data-editor__header__action"
                  onClick={addTaggedValue}
                  disabled={isReadOnly}
                  tabIndex={-1}
                  title="Add Tagged value"
                >
                  <PlusIcon />
                </button>
              </div>
            </div>
            <div className="data-editor__content">
              <div className="data-editor__content__lists">
                <PanelDropZone
                  isDragOver={isTaggedValueDragOver && !isReadOnly}
                  dropTargetConnector={dropTaggedValueRef}
                >
                  <PanelContentLists>
                    <TaggedValueDragPreviewLayer />
                    {dataElement.taggedValues.map((taggedValue) => (
                      <TaggedValueEditor
                        annotatedElement={dataElement}
                        key={taggedValue._UUID}
                        taggedValue={taggedValue}
                        deleteValue={deleteTaggedValue(taggedValue)}
                        isReadOnly={isReadOnly}
                        darkTheme={true}
                      />
                    ))}
                  </PanelContentLists>
                </PanelDropZone>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
});
