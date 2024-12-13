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

import { useState, useCallback, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import {
  UMLEditorState,
  UML_EDITOR_TAB,
} from '../../../../stores/editor/editor-state/element-editor-state/UMLEditorState.js';
import { useDrag, useDrop } from 'react-dnd';
import {
  CORE_DND_TYPE,
  type ElementDragSource,
  type UMLEditorElementDropTarget,
} from '../../../../stores/editor/utils/DnDUtils.js';
import { prettyCONSTName } from '@finos/legend-shared';
import {
  BlankPanelContent,
  clsx,
  getCollapsiblePanelGroupProps,
  InputWithInlineValidation,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  PlusIcon,
  TimesIcon,
  LongArrowRightIcon,
  LockIcon,
  FireIcon,
  StickArrowCircleRightIcon,
  PanelEntryDragHandle,
  DragPreviewLayer,
  useDragPreviewLayer,
  PanelDropZone,
  Panel,
  PanelContent,
  PanelDnDEntry,
  PanelHeader,
  PanelHeaderActionItem,
  PanelHeaderActions,
  PanelContentLists,
} from '@finos/legend-art';
import { LEGEND_STUDIO_TEST_ID } from '../../../../__lib__/LegendStudioTesting.js';
import {
  StereotypeDragPreviewLayer,
  StereotypeSelector,
} from './StereotypeSelector.js';
import {
  TaggedValueDragPreviewLayer,
  TaggedValueEditor,
} from './TaggedValueEditor.js';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  type Enumeration,
  type StereotypeReference,
  type TaggedValue,
  type Enum,
  Profile,
  StereotypeExplicitReference,
  stub_TaggedValue,
  stub_Tag,
  stub_Profile,
  stub_Stereotype,
  stub_Enum,
} from '@finos/legend-graph';
import {
  enum_setName,
  annotatedElement_deleteStereotype,
  annotatedElement_addStereotype,
  annotatedElement_addTaggedValue,
  annotatedElement_deleteTaggedValue,
  enum_deleteValue,
  enum_addValue,
  enum_swapValues,
} from '../../../../stores/graph-modifier/DomainGraphModifierHelper.js';
import { useApplicationNavigationContext } from '@finos/legend-application';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../__lib__/LegendStudioApplicationNavigationContext.js';

type EnumValueDragSource = {
  enumValue: Enum;
};

const ENUM_VALUE_DND_TYPE = 'ENUMERATION';

const EnumBasicEditor = observer(
  (props: {
    enumValue: Enum;
    selectValue: () => void;
    deleteValue: () => void;
    isReadOnly: boolean;
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    const handleRef = useRef<HTMLDivElement>(null);

    const { enumValue, selectValue, deleteValue, isReadOnly } = props;
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      enum_setName(enumValue, event.target.value);
    };
    const isEnumValueDuplicated = (val: Enum): boolean =>
      enumValue._OWNER.values.filter((value) => value.name === val.name)
        .length >= 2;

    // Drag and Drop
    const handleHover = useCallback(
      (item: EnumValueDragSource): void => {
        const draggingEnumeration = item.enumValue;
        const hoveredEnumeration = enumValue;
        enum_swapValues(
          enumValue._OWNER,
          draggingEnumeration,
          hoveredEnumeration,
        );
      },
      [enumValue],
    );

    const [{ isBeingDraggedEnumeration }, dropConnector] = useDrop<
      EnumValueDragSource,
      void,
      { isBeingDraggedEnumeration: Enum | undefined }
    >(
      () => ({
        accept: [ENUM_VALUE_DND_TYPE],
        hover: (item) => handleHover(item),
        collect: (monitor) => ({
          isBeingDraggedEnumeration:
            monitor.getItem<EnumValueDragSource | null>()?.enumValue,
        }),
      }),
      [handleHover],
    );
    const isBeingDragged = enumValue === isBeingDraggedEnumeration;
    const [, dragConnector, dragPreviewConnector] =
      useDrag<EnumValueDragSource>(
        () => ({
          type: ENUM_VALUE_DND_TYPE,
          item: () => ({
            enumValue: enumValue,
          }),
        }),
        [enumValue],
      );
    dragConnector(handleRef);
    dropConnector(ref);
    useDragPreviewLayer(dragPreviewConnector);

    return (
      <PanelDnDEntry
        ref={ref}
        showPlaceholder={isBeingDragged}
        placeholder={<div className="dnd__placeholder--light"></div>}
        className="enum-basic-editor__container"
      >
        <PanelEntryDragHandle
          dragSourceConnector={handleRef}
          isDragging={isBeingDragged}
        />

        <div className="enum-basic-editor">
          <InputWithInlineValidation
            className="enum-basic-editor__name input-group__input"
            spellCheck={false}
            disabled={isReadOnly}
            value={enumValue.name}
            onChange={changeValue}
            placeholder="Enum name"
            error={
              isEnumValueDuplicated(enumValue) ? 'Duplicated enum' : undefined
            }
          />
          <button
            className="uml-element-editor__basic__detail-btn"
            onClick={selectValue}
            tabIndex={-1}
            title="See detail"
          >
            <LongArrowRightIcon />
          </button>
          {!isReadOnly && (
            <button
              className="uml-element-editor__remove-btn"
              disabled={isReadOnly}
              onClick={deleteValue}
              tabIndex={-1}
              title="Remove"
            >
              <TimesIcon />
            </button>
          )}
        </div>
      </PanelDnDEntry>
    );
  },
);

const EnumEditor = observer(
  (props: { _enum: Enum; deselectValue: () => void; isReadOnly: boolean }) => {
    const { _enum, deselectValue, isReadOnly } = props;
    // Tab
    const [selectedTab, setSelectedTab] = useState<UML_EDITOR_TAB>(
      UML_EDITOR_TAB.TAGGED_VALUES,
    );
    const tabs = [UML_EDITOR_TAB.TAGGED_VALUES, UML_EDITOR_TAB.STEREOTYPES];
    const changeTab =
      (tab: UML_EDITOR_TAB): (() => void) =>
      (): void =>
        setSelectedTab(tab);
    // Tagged value and Stereotype
    let addButtonTitle = '';
    switch (selectedTab) {
      case UML_EDITOR_TAB.TAGGED_VALUES:
        addButtonTitle = 'Add tagged value';
        break;
      case UML_EDITOR_TAB.STEREOTYPES:
        addButtonTitle = 'Add stereotype';
        break;
      default:
        break;
    }
    const addValue = (): void => {
      if (!isReadOnly) {
        if (selectedTab === UML_EDITOR_TAB.TAGGED_VALUES) {
          annotatedElement_addTaggedValue(
            _enum,
            stub_TaggedValue(stub_Tag(stub_Profile())),
          );
        } else if (selectedTab === UML_EDITOR_TAB.STEREOTYPES) {
          annotatedElement_addStereotype(
            _enum,
            StereotypeExplicitReference.create(stub_Stereotype(stub_Profile())),
          );
        }
      }
    };
    const _deleteStereotype =
      (val: StereotypeReference): (() => void) =>
      (): void =>
        annotatedElement_deleteStereotype(_enum, val);
    const _deleteTaggedValue =
      (val: TaggedValue): (() => void) =>
      (): void =>
        annotatedElement_deleteTaggedValue(_enum, val);
    // Drag and Drop
    const handleDropTaggedValue = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        if (!isReadOnly && item.data.packageableElement instanceof Profile) {
          annotatedElement_addTaggedValue(
            _enum,
            stub_TaggedValue(stub_Tag(item.data.packageableElement)),
          );
        }
      },
      [_enum, isReadOnly],
    );
    const [{ isTaggedValueDragOver }, taggedValueDropConnector] = useDrop<
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
            _enum,
            StereotypeExplicitReference.create(
              stub_Stereotype(item.data.packageableElement),
            ),
          );
        }
      },
      [_enum, isReadOnly],
    );
    const [{ isStereotypeDragOver }, stereotypeDropConnector] = useDrop<
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

    return (
      <div className="uml-element-editor enum-editor">
        <div data-testid={LEGEND_STUDIO_TEST_ID.PANEL} className="panel">
          <PanelHeader>
            <div className="panel__header__title">
              {isReadOnly && (
                <div className="uml-element-editor__header__lock">
                  <LockIcon />
                </div>
              )}
              <div className="panel__header__title__label">enum</div>
              <div className="panel__header__title__content">{_enum.name}</div>
            </div>
            <PanelHeaderActions>
              <PanelHeaderActionItem onClick={deselectValue} title="Close">
                <TimesIcon />
              </PanelHeaderActionItem>
            </PanelHeaderActions>
          </PanelHeader>
          <div
            data-testid={LEGEND_STUDIO_TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER}
            className="panel__header uml-element-editor__tabs__header"
          >
            <div className="uml-element-editor__tabs">
              {tabs.map((tab) => (
                <div
                  key={tab}
                  onClick={changeTab(tab)}
                  className={clsx('uml-element-editor__tab', {
                    'uml-element-editor__tab--active': tab === selectedTab,
                  })}
                >
                  {prettyCONSTName(tab)}
                </div>
              ))}
            </div>
            <PanelHeaderActions>
              <PanelHeaderActionItem
                disabled={isReadOnly}
                onClick={addValue}
                title={addButtonTitle}
              >
                <PlusIcon />
              </PanelHeaderActionItem>
            </PanelHeaderActions>
          </div>
          <PanelContent>
            {selectedTab === UML_EDITOR_TAB.TAGGED_VALUES && (
              <PanelDropZone
                isDragOver={isTaggedValueDragOver && !isReadOnly}
                dropTargetConnector={taggedValueDropConnector}
              >
                <PanelContentLists>
                  <TaggedValueDragPreviewLayer />
                  {_enum.taggedValues.map((taggedValue) => (
                    <TaggedValueEditor
                      annotatedElement={_enum}
                      key={taggedValue._UUID}
                      taggedValue={taggedValue}
                      deleteValue={_deleteTaggedValue(taggedValue)}
                      isReadOnly={isReadOnly}
                    />
                  ))}
                </PanelContentLists>
              </PanelDropZone>
            )}
            {selectedTab === UML_EDITOR_TAB.STEREOTYPES && (
              <PanelDropZone
                isDragOver={isStereotypeDragOver && !isReadOnly}
                dropTargetConnector={stereotypeDropConnector}
              >
                <PanelContentLists>
                  <StereotypeDragPreviewLayer />
                  {_enum.stereotypes.map((stereotype) => (
                    <StereotypeSelector
                      key={stereotype.value._UUID}
                      annotatedElement={_enum}
                      stereotype={stereotype}
                      deleteStereotype={_deleteStereotype(stereotype)}
                      isReadOnly={isReadOnly}
                    />
                  ))}
                </PanelContentLists>
              </PanelDropZone>
            )}
          </PanelContent>
        </div>
      </div>
    );
  },
);

export const EnumerationEditor = observer(
  (props: { enumeration: Enumeration }) => {
    const { enumeration } = props;
    const editorStore = useEditorStore();
    const editorState =
      editorStore.tabManagerState.getCurrentEditorState(UMLEditorState);
    const isReadOnly = editorState.isReadOnly;
    // Selected enum value
    const [selectedEnum, setSelectedEnum] = useState<Enum | undefined>();
    const deselectValue = (): void => setSelectedEnum(undefined);
    const selectValue =
      (val: Enum): (() => void) =>
      (): void =>
        setSelectedEnum(val);
    // Tab
    const selectedTab = editorState.selectedTab;
    const tabs = [
      UML_EDITOR_TAB.ENUM_VALUES,
      UML_EDITOR_TAB.TAGGED_VALUES,
      UML_EDITOR_TAB.STEREOTYPES,
    ];
    const changeTab =
      (tab: UML_EDITOR_TAB): (() => void) =>
      (): void => {
        editorState.setSelectedTab(tab);
        setSelectedEnum(undefined);
      };
    // Tagged value and Stereotype
    let addButtonTitle = '';
    switch (selectedTab) {
      case UML_EDITOR_TAB.ENUM_VALUES:
        addButtonTitle = 'Add enum value';
        break;
      case UML_EDITOR_TAB.TAGGED_VALUES:
        addButtonTitle = 'Add tagged value';
        break;
      case UML_EDITOR_TAB.STEREOTYPES:
        addButtonTitle = 'Add stereotype';
        break;
      default:
        break;
    }
    const add = (): void => {
      if (!isReadOnly) {
        if (selectedTab === UML_EDITOR_TAB.ENUM_VALUES) {
          enum_addValue(enumeration, stub_Enum(enumeration));
        } else if (selectedTab === UML_EDITOR_TAB.TAGGED_VALUES) {
          annotatedElement_addTaggedValue(
            enumeration,
            stub_TaggedValue(stub_Tag(stub_Profile())),
          );
        } else if (selectedTab === UML_EDITOR_TAB.STEREOTYPES) {
          annotatedElement_addStereotype(
            enumeration,
            StereotypeExplicitReference.create(stub_Stereotype(stub_Profile())),
          );
        }
      }
    };
    const deleteValue =
      (val: Enum): (() => void) =>
      (): void => {
        enum_deleteValue(enumeration, val);
        if (val === selectedEnum) {
          setSelectedEnum(undefined);
        }
      };
    const _deleteStereotype =
      (val: StereotypeReference): (() => void) =>
      (): void =>
        annotatedElement_deleteStereotype(enumeration, val);
    const _deleteTaggedValue =
      (val: TaggedValue): (() => void) =>
      (): void =>
        annotatedElement_deleteTaggedValue(enumeration, val);
    // Drag and Drop
    const handleDropTaggedValue = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        if (!isReadOnly && item.data.packageableElement instanceof Profile) {
          annotatedElement_addTaggedValue(
            enumeration,
            stub_TaggedValue(stub_Tag(item.data.packageableElement)),
          );
        }
      },
      [enumeration, isReadOnly],
    );
    const [{ isTaggedValueDragOver }, taggedValueDropConnector] = useDrop<
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
            enumeration,
            StereotypeExplicitReference.create(
              stub_Stereotype(item.data.packageableElement),
            ),
          );
        }
      },
      [enumeration, isReadOnly],
    );
    const [{ isStereotypeDragOver }, stereotypeDropConnector] = useDrop<
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

    // Generation
    const generationParentElementPath =
      editorStore.graphState.graphGenerationState.findGenerationParentPath(
        enumeration.path,
      );
    const generationParentElement = generationParentElementPath
      ? editorStore.graphManagerState.graph.getNullableElement(
          generationParentElementPath,
        )
      : undefined;
    const visitGenerationParentElement = (): void => {
      if (generationParentElement) {
        editorStore.graphEditorMode.openElement(generationParentElement);
      }
    };

    useApplicationNavigationContext(
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.ENUMERATION_EDITOR,
    );

    // layout
    const enumEditorCollapsiblePanelGroupProps = getCollapsiblePanelGroupProps(
      !selectedEnum,
      {
        size: 250,
      },
    );

    return (
      <div
        data-testid={LEGEND_STUDIO_TEST_ID.ENUMERATION_EDITOR}
        className="uml-element-editor enumeration-editor"
      >
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel
            {...enumEditorCollapsiblePanelGroupProps.remainingPanel}
            minSize={56}
          >
            <Panel>
              <div className="panel__header">
                <div className="panel__header__title">
                  <div className="panel__header__title__label">enumeration</div>
                  <div className="panel__header__title__content">
                    {enumeration.name}
                  </div>
                </div>
                <div className="panel__header__actions">
                  {generationParentElement && (
                    <button
                      className="uml-element-editor__header__generation-origin"
                      onClick={visitGenerationParentElement}
                      tabIndex={-1}
                      title={`Visit generation parent '${generationParentElement.path}'`}
                    >
                      <div className="uml-element-editor__header__generation-origin__label">
                        <FireIcon />
                      </div>
                      <div className="uml-element-editor__header__generation-origin__parent-name">
                        {generationParentElement.name}
                      </div>
                      <div className="uml-element-editor__header__generation-origin__visit-btn">
                        <StickArrowCircleRightIcon />
                      </div>
                    </button>
                  )}
                </div>
              </div>
              <div
                data-testid={
                  LEGEND_STUDIO_TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER
                }
                className="panel__header uml-element-editor__tabs__header"
              >
                <div className="uml-element-editor__tabs">
                  {tabs.map((tab) => (
                    <div
                      key={tab}
                      onClick={changeTab(tab)}
                      className={clsx('uml-element-editor__tab', {
                        'uml-element-editor__tab--active': tab === selectedTab,
                      })}
                    >
                      {prettyCONSTName(tab)}
                    </div>
                  ))}
                </div>
                <div className="panel__header__actions">
                  <button
                    className="panel__header__action"
                    onClick={add}
                    tabIndex={-1}
                    title={addButtonTitle}
                  >
                    <PlusIcon />
                  </button>
                </div>
              </div>
              <PanelContent>
                {selectedTab === UML_EDITOR_TAB.ENUM_VALUES && (
                  <PanelContentLists>
                    <DragPreviewLayer
                      labelGetter={(item: EnumValueDragSource): string =>
                        item.enumValue.name === ''
                          ? '(unknown)'
                          : item.enumValue.name
                      }
                      types={[ENUM_VALUE_DND_TYPE]}
                    />
                    {enumeration.values.map((enumValue) => (
                      <EnumBasicEditor
                        key={enumValue._UUID}
                        enumValue={enumValue}
                        deleteValue={deleteValue(enumValue)}
                        selectValue={selectValue(enumValue)}
                        isReadOnly={isReadOnly}
                      />
                    ))}
                  </PanelContentLists>
                )}
                {selectedTab === UML_EDITOR_TAB.TAGGED_VALUES && (
                  <PanelDropZone
                    isDragOver={isTaggedValueDragOver && !isReadOnly}
                    dropTargetConnector={taggedValueDropConnector}
                  >
                    <PanelContentLists>
                      <TaggedValueDragPreviewLayer />
                      {enumeration.taggedValues.map((taggedValue) => (
                        <TaggedValueEditor
                          annotatedElement={enumeration}
                          key={taggedValue._UUID}
                          taggedValue={taggedValue}
                          deleteValue={_deleteTaggedValue(taggedValue)}
                          isReadOnly={isReadOnly}
                        />
                      ))}
                    </PanelContentLists>
                  </PanelDropZone>
                )}
                {selectedTab === UML_EDITOR_TAB.STEREOTYPES && (
                  <PanelDropZone
                    isDragOver={isStereotypeDragOver && !isReadOnly}
                    dropTargetConnector={stereotypeDropConnector}
                  >
                    <PanelContentLists>
                      <StereotypeDragPreviewLayer />
                      {enumeration.stereotypes.map((stereotype) => (
                        <StereotypeSelector
                          key={stereotype.value._UUID}
                          annotatedElement={enumeration}
                          stereotype={stereotype}
                          deleteStereotype={_deleteStereotype(stereotype)}
                          isReadOnly={isReadOnly}
                        />
                      ))}
                    </PanelContentLists>
                  </PanelDropZone>
                )}
              </PanelContent>
            </Panel>
          </ResizablePanel>
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine color="var(--color-light-grey-200)" />
          </ResizablePanelSplitter>
          <ResizablePanel
            {...enumEditorCollapsiblePanelGroupProps.collapsiblePanel}
            direction={-1}
          >
            {selectedEnum ? (
              <EnumEditor
                _enum={selectedEnum}
                deselectValue={deselectValue}
                isReadOnly={isReadOnly}
              />
            ) : (
              <div className="uml-element-editor__sub-editor">
                <BlankPanelContent>No enum selected</BlankPanelContent>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
);
